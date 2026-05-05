use anchor_lang::prelude::*;

pub mod confidential_policy;
pub mod constants;
pub mod error;
pub mod execution_payload;
pub mod state;

declare_id!("J1AmhNEsVQukD8cvRh7zRD9jh56QocsoGCBrfTvTmAus");

use confidential_policy::enforce_confidential_numeric_policy;
pub use constants::WALLET_SEED;
pub use error::ErrorCode;
use execution_payload::parse_transfer_intent;
pub use state::{ConfidentialNumericPolicy, DemoTokenCustody, SessionKey, Wallet};

const SPL_TOKEN_PROGRAM_ID_BYTES: [u8; 32] = [
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];

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
pub struct SetConfidentialNumericPolicy<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegisterDemoCustody<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
    /// CHECK: The mint address is recorded for the demo USDC input asset.
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: Validated as an initialized SPL Token account owned by wallet PDA.
    pub usdc_token_account: UncheckedAccount<'info>,
    /// CHECK: The mint address is recorded for the demo SOL/wSOL output asset.
    pub sol_mint: UncheckedAccount<'info>,
    /// CHECK: Validated as an initialized SPL Token account owned by wallet PDA.
    pub sol_token_account: UncheckedAccount<'info>,
    /// CHECK: Validated against the canonical SPL Token program id for this demo slice.
    pub token_program: UncheckedAccount<'info>,
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

#[derive(Accounts)]
pub struct ExecuteConfidentialTransferAsSession<'info> {
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

fn validate_supported_token_program(token_program: &Pubkey) -> Result<()> {
    require!(
        token_program.to_bytes() == SPL_TOKEN_PROGRAM_ID_BYTES,
        ErrorCode::InvalidTokenCustody
    );
    Ok(())
}

fn validate_pda_token_account(
    token_account: &AccountInfo,
    mint: &Pubkey,
    authority: &Pubkey,
    token_program: &Pubkey,
) -> Result<()> {
    require!(
        *token_account.owner == *token_program,
        ErrorCode::InvalidTokenCustody
    );

    let data = token_account.try_borrow_data()?;
    require!(data.len() >= 109, ErrorCode::InvalidTokenCustody);

    let account_mint = Pubkey::new_from_array(
        data[0..32]
            .try_into()
            .map_err(|_| ErrorCode::InvalidTokenCustody)?,
    );
    let account_authority = Pubkey::new_from_array(
        data[32..64]
            .try_into()
            .map_err(|_| ErrorCode::InvalidTokenCustody)?,
    );

    require!(account_mint == *mint, ErrorCode::InvalidTokenCustody);
    require!(
        account_authority == *authority,
        ErrorCode::InvalidTokenCustody
    );
    require!(data[108] == 1, ErrorCode::InvalidTokenCustody);

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
            confidential_policy: ConfidentialNumericPolicy::default(),
            demo_custody: DemoTokenCustody::default(),
            sessions: Vec::new(),
        });
        msg!("Polet wallet created for: {:?}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn register_demo_custody(ctx: Context<RegisterDemoCustody>) -> Result<()> {
        let wallet_key = ctx.accounts.wallet.key();
        let token_program = ctx.accounts.token_program.key();
        validate_supported_token_program(&token_program)?;
        validate_pda_token_account(
            &ctx.accounts.usdc_token_account.to_account_info(),
            &ctx.accounts.usdc_mint.key(),
            &wallet_key,
            &token_program,
        )?;
        validate_pda_token_account(
            &ctx.accounts.sol_token_account.to_account_info(),
            &ctx.accounts.sol_mint.key(),
            &wallet_key,
            &token_program,
        )?;

        ctx.accounts.wallet.demo_custody = DemoTokenCustody {
            usdc_mint: ctx.accounts.usdc_mint.key(),
            usdc_token_account: ctx.accounts.usdc_token_account.key(),
            sol_mint: ctx.accounts.sol_mint.key(),
            sol_token_account: ctx.accounts.sol_token_account.key(),
            token_program,
            configured: true,
        };

        msg!(
            "Registered demo custody: usdc_token_account={:?}, sol_token_account={:?}",
            ctx.accounts.usdc_token_account.key(),
            ctx.accounts.sol_token_account.key()
        );
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

    pub fn set_confidential_numeric_policy(
        ctx: Context<SetConfidentialNumericPolicy>,
        policy_commitment: [u8; 32],
        encryption_witness_hash: [u8; 32],
        encrypted_max_per_run: u64,
        encrypted_daily_cap: u64,
        encrypted_daily_spent: u64,
        spent_day_index: i64,
    ) -> Result<()> {
        require!(policy_commitment != [0u8; 32], ErrorCode::PolicyViolation);
        require!(
            encryption_witness_hash != [0u8; 32],
            ErrorCode::InvalidPolicyWitness
        );

        let wallet = &mut ctx.accounts.wallet;
        wallet.confidential_policy = ConfidentialNumericPolicy {
            policy_commitment,
            encryption_witness_hash,
            encrypted_max_per_run,
            encrypted_daily_cap,
            encrypted_daily_spent,
            spent_day_index,
            enabled: true,
        };
        wallet.policy_commitment = policy_commitment;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!(
            "Confidential numeric policy updated, policy_seq={}",
            wallet.policy_seq
        );
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
        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Owner executed intent: instruction={}, dest={:?}, amount={}",
            payload.instruction,
            ctx.accounts.destination.key(),
            payload.amount
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

        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Session executed intent: instruction={}, dest={:?}, amount={}",
            payload.instruction,
            ctx.accounts.destination.key(),
            payload.amount
        );
        Ok(())
    }

    pub fn execute_confidential_transfer_as_session(
        ctx: Context<ExecuteConfidentialTransferAsSession>,
        intent_data: Vec<u8>,
        attestation_slot: u64,
        attestation_policy_seq: u64,
        encryption_witness: [u8; 32],
    ) -> Result<()> {
        validate_session(&ctx.accounts.wallet, ctx.accounts.session_key.key())?;

        require!(
            attestation_policy_seq == ctx.accounts.wallet.policy_seq,
            ErrorCode::StalePolicySeq
        );
        require!(
            attestation_slot > ctx.accounts.wallet.last_revoked_slot,
            ErrorCode::StaleSlot
        );

        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        enforce_confidential_numeric_policy(
            &mut ctx.accounts.wallet,
            payload.amount,
            &encryption_witness,
        )?;
        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Session executed confidential intent: instruction={}, dest={:?}",
            payload.instruction,
            ctx.accounts.destination.key(),
        );
        Ok(())
    }
}
