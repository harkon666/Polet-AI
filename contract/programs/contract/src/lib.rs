use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;

declare_id!("22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw");

pub use constants::WALLET_SEED;
pub use error::ErrorCode;
pub use state::{SessionKey, Wallet};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Wallet::INIT_SPACE,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump
    )]
    pub wallet: Account<'info, Wallet>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPolicy<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetProxyKey<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetMerkleRoot<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct GrantTemporalKey<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeAllSessions<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteIntent<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
    /// CHECK: Destination is checked against intent_data and receives lamports in this SOL-only core slice.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteIntentAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    pub session_key: Signer<'info>,
    /// CHECK: Destination is checked against intent_data and receives lamports in this SOL-only core slice.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

fn parse_transfer_intent(intent_data: &[u8], expected_destination: &Pubkey) -> Result<(u8, u64)> {
    require!(intent_data.len() == 41, ErrorCode::InvalidIntent);

    let instruction = intent_data[0];
    let destination = Pubkey::new_from_array(
        intent_data[1..33]
            .try_into()
            .map_err(|_| ErrorCode::InvalidIntent)?,
    );
    require!(
        destination == *expected_destination,
        ErrorCode::InvalidIntent
    );

    let amount = u64::from_le_bytes(
        intent_data[33..41]
            .try_into()
            .map_err(|_| ErrorCode::InvalidIntent)?,
    );

    Ok((instruction, amount))
}

fn require_policy_commitment(wallet: &Wallet) -> Result<()> {
    require!(
        wallet.policy_commitment != [0u8; 32] || wallet.merkle_root != [0u8; 32],
        ErrorCode::PolicyViolation
    );
    Ok(())
}

fn validate_session(wallet: &Wallet, session_key: Pubkey) -> Result<usize> {
    let session_index = wallet
        .sessions
        .iter()
        .position(|session| session.key == session_key)
        .ok_or(ErrorCode::SessionNotAuthorized)?;

    let session = &wallet.sessions[session_index];
    let now = Clock::get()?.unix_timestamp;

    require!(session.authorized, ErrorCode::SessionNotAuthorized);
    require!(now < session.expires_at, ErrorCode::SessionExpired);
    require!(
        session.granted_slot >= wallet.last_revoked_slot,
        ErrorCode::SessionGloballyRevoked
    );

    Ok(session_index)
}

fn transfer_lamports<'info>(
    wallet_info: AccountInfo<'info>,
    destination_info: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    require!(
        wallet_info.lamports() >= amount,
        ErrorCode::AmountLimitExceeded
    );
    **wallet_info.try_borrow_mut_lamports()? -= amount;
    **destination_info.try_borrow_mut_lamports()? += amount;
    Ok(())
}

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.wallet.set_inner(Wallet {
            owner: ctx.accounts.owner.key(),
            proxy_pk: Pubkey::default(),
            policy_commitment: [0u8; 32],
            merkle_root: [0u8; 32],
            policy_seq: 0,
            last_revoked_slot: 0,
            sessions: Vec::new(),
        });
        msg!("Polet wallet created for: {:?}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn set_policy(ctx: Context<SetPolicy>, policy_commitment: [u8; 32]) -> Result<()> {
        require!(policy_commitment != [0u8; 32], ErrorCode::PolicyViolation);
        let wallet = &mut ctx.accounts.wallet;
        wallet.policy_commitment = policy_commitment;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        msg!(
            "Policy commitment updated, policy_seq={}",
            wallet.policy_seq
        );
        Ok(())
    }

    pub fn set_proxy_key(ctx: Context<SetProxyKey>, proxy_pk: Pubkey) -> Result<()> {
        ctx.accounts.wallet.proxy_pk = proxy_pk;
        msg!("Proxy key updated to: {:?}", proxy_pk);
        Ok(())
    }

    pub fn set_merkle_root(ctx: Context<SetMerkleRoot>, merkle_root: [u8; 32]) -> Result<()> {
        require!(merkle_root != [0u8; 32], ErrorCode::PolicyViolation);
        let wallet = &mut ctx.accounts.wallet;
        wallet.merkle_root = merkle_root;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        msg!("Merkle root updated, policy_seq={}", wallet.policy_seq);
        Ok(())
    }

    pub fn grant_temporal_key(
        ctx: Context<GrantTemporalKey>,
        session_key: Pubkey,
        expires_at: i64,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let now = Clock::get()?.unix_timestamp;
        require!(expires_at > now, ErrorCode::SessionExpired);
        require!(
            wallet.sessions.len() < Wallet::MAX_SESSIONS,
            ErrorCode::TooManySessions
        );

        for session in wallet.sessions.iter_mut() {
            if session.key == session_key {
                require!(!session.authorized, ErrorCode::TemporalKeyExists);
                session.expires_at = expires_at;
                session.granted_slot = Clock::get()?.slot;
                session.authorized = true;
                msg!("Re-authorized session key: {:?}", session_key);
                return Ok(());
            }
        }

        wallet.sessions.push(SessionKey {
            key: session_key,
            expires_at,
            granted_slot: Clock::get()?.slot,
            authorized: true,
        });

        msg!("Granted session key: {:?}", session_key);
        Ok(())
    }

    pub fn revoke_session(ctx: Context<RevokeSession>, session_key: Pubkey) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let session = wallet
            .sessions
            .iter_mut()
            .find(|session| session.key == session_key)
            .ok_or(ErrorCode::SessionNotAuthorized)?;

        session.authorized = false;
        msg!("Revoked session key: {:?}", session_key);
        Ok(())
    }

    pub fn revoke_all_sessions(ctx: Context<RevokeAllSessions>) -> Result<()> {
        ctx.accounts.wallet.last_revoked_slot = Clock::get()?.slot;
        msg!(
            "All sessions revoked at slot: {}",
            ctx.accounts.wallet.last_revoked_slot
        );
        Ok(())
    }

    pub fn execute_intent(ctx: Context<ExecuteIntent>, intent_data: Vec<u8>) -> Result<()> {
        require_policy_commitment(&ctx.accounts.wallet)?;
        let (instruction, amount) =
            parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        require!(instruction == 0, ErrorCode::InvalidIntent);
        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            amount,
        )?;

        msg!(
            "Owner executed intent: instruction={}, dest={:?}, amount={}",
            instruction,
            ctx.accounts.destination.key(),
            amount
        );
        Ok(())
    }

    pub fn execute_intent_as_session(
        ctx: Context<ExecuteIntentAsSession>,
        intent_data: Vec<u8>,
        merkle_proof: Vec<[u8; 32]>,
        merkle_leaf: [u8; 32],
        merkle_index: u32,
        attestation_slot: u64,
        attestation_policy_seq: u64,
        attestation_signature: [u8; 64],
    ) -> Result<()> {
        let _ = (
            merkle_proof,
            merkle_leaf,
            merkle_index,
            attestation_signature,
        );
        require_policy_commitment(&ctx.accounts.wallet)?;
        validate_session(&ctx.accounts.wallet, ctx.accounts.session_key.key())?;

        require!(
            attestation_policy_seq == ctx.accounts.wallet.policy_seq,
            ErrorCode::StalePolicySeq
        );
        require!(
            attestation_slot > ctx.accounts.wallet.last_revoked_slot,
            ErrorCode::StaleSlot
        );

        let (instruction, amount) =
            parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        require!(instruction == 0, ErrorCode::InvalidIntent);
        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            amount,
        )?;

        msg!(
            "Session executed intent: instruction={}, dest={:?}, amount={}",
            instruction,
            ctx.accounts.destination.key(),
            amount
        );
        Ok(())
    }
}
