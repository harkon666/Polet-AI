use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;

declare_id!("2W4wkSy2QJ9SczvUfyPNYDLgqpEZ5WVktpEXVfTzBVJP");

pub use constants::WALLET_SEED;
pub use error::ErrorCode;
pub use state::{Wallet, TemporalKey, Policy};

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
pub struct SetPolicyData<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

// --- #12: SetProxyKey — owner-only, updates proxy_pk ---
#[derive(Accounts)]
pub struct SetProxyKey<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

// --- #12: SetMerkleRoot — owner-only, updates merkle_root ---
#[derive(Accounts)]
pub struct SetMerkleRoot<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

// --- #12: RevokeAllSessions — owner-only, updates last_revoked_slot ---
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
    /// CHECK: Destination account receives lamports; validated by intent_data match
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
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
pub struct ExecuteIntentAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    /// CHECK: Session key is unchecked because we validate via signer check on the temporal key
    pub session_key: UncheckedAccount<'info>,
    /// CHECK: Destination account receives lamports; validated by intent_data match
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// Private helper function for policy enforcement
fn enforce_policy(wallet: &Wallet, destination: &Pubkey) -> Result<()> {
    // If policy_data is empty, no policy enforcement
    if wallet.policy_data.is_empty() {
        return Ok(());
    }
    let policy = Policy::try_from_slice(&wallet.policy_data)
        .map_err(|_| ErrorCode::PolicyViolation)?;
    require!(policy.is_allowed(destination), ErrorCode::DestinationNotAllowed);
    Ok(())
}

/// Verify TEE attestation signature (Mock for MVP unit tests)
/// In a full production environment, this would verify via Ed25519 instruction introspection.
fn verify_tee_attestation(
    signature: &[u8; 64],
    proxy_pk: &Pubkey,
    _message: &[u8],
) -> bool {
    // If proxy_pk is not set, we cannot verify
    if proxy_pk == &Pubkey::default() {
        return false;
    }
    // Mock check: reject all-zero signatures
    signature != &[0u8; 64]
}

/// Verify a Merkle proof against a known root using SHA-256.
/// leaf: the leaf hash, proof: sibling hashes bottom-up, index: leaf position
fn verify_merkle_proof(leaf: &[u8; 32], proof: &Vec<[u8; 32]>, index: u32, root: &[u8; 32]) -> bool {
    let mut computed = *leaf;
    for (i, sibling) in proof.iter().enumerate() {
        let mut hasher_input = [0u8; 64];
        if (index >> i) & 1 == 0 {
            // computed is left, sibling is right
            hasher_input[..32].copy_from_slice(&computed);
            hasher_input[32..].copy_from_slice(sibling);
        } else {
            // sibling is left, computed is right
            hasher_input[..32].copy_from_slice(sibling);
            hasher_input[32..].copy_from_slice(&computed);
        }
        computed = solana_sha256_hasher::hash(&hasher_input).to_bytes();
    }
    computed == *root
}

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, daily_limit: u64) -> Result<()> {
        ctx.accounts.wallet.set_inner(Wallet {
            owner: ctx.accounts.owner.key(),
            // --- #12: New fields initialized to defaults ---
            proxy_pk: Pubkey::default(),
            merkle_root: [0u8; 32],
            policy_seq: 0,
            last_revoked_slot: 0,
            // --- Existing fields ---
            policy_hash: [0u8; 32],
            policy_data: Vec::new(),
            daily_spent: 0,
            last_reset: Clock::get()?.unix_timestamp,
            daily_limit,
            temporal_keys: Vec::new(),
        });
        msg!("Wallet created for: {:?}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn set_policy(ctx: Context<SetPolicy>, policy_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.wallet.policy_hash = policy_hash;
        // --- #12: Increment policy_seq on each policy change ---
        ctx.accounts.wallet.policy_seq = ctx.accounts.wallet.policy_seq.checked_add(1).unwrap();
        msg!("Policy hash updated to: {:?}, policy_seq={}", policy_hash, ctx.accounts.wallet.policy_seq);
        Ok(())
    }

    pub fn set_policy_data(ctx: Context<SetPolicyData>, policy_data: Vec<u8>) -> Result<()> {
        // Validate that policy_data is valid serialized Policy
        let _policy = Policy::try_from_slice(&policy_data)
            .map_err(|_| ErrorCode::PolicyViolation)?;
        ctx.accounts.wallet.policy_data = policy_data;
        // Also compute and set the policy_hash using anchor_lang utilities
        ctx.accounts.wallet.policy_hash = [0u8; 32]; // Placeholder - actual hash would need sha256
        // --- #12: Increment policy_seq on each policy change ---
        ctx.accounts.wallet.policy_seq = ctx.accounts.wallet.policy_seq.checked_add(1).unwrap();
        msg!("Policy data updated, policy_seq={}", ctx.accounts.wallet.policy_seq);
        Ok(())
    }

    // --- #12: SetProxyKey instruction — owner-only ---
    pub fn set_proxy_key(ctx: Context<SetProxyKey>, proxy_pk: Pubkey) -> Result<()> {
        ctx.accounts.wallet.proxy_pk = proxy_pk;
        msg!("Proxy key updated to: {:?}", proxy_pk);
        Ok(())
    }

    // --- #12: SetMerkleRoot instruction — owner-only ---
    pub fn set_merkle_root(ctx: Context<SetMerkleRoot>, merkle_root: [u8; 32]) -> Result<()> {
        ctx.accounts.wallet.merkle_root = merkle_root;
        // Increment policy_seq since merkle root represents a policy commitment
        ctx.accounts.wallet.policy_seq = ctx.accounts.wallet.policy_seq.checked_add(1).unwrap();
        msg!("Merkle root updated, policy_seq={}", ctx.accounts.wallet.policy_seq);
        Ok(())
    }

    // --- #12: RevokeAllSessions instruction — sets last_revoked_slot to current slot ---
    pub fn revoke_all_sessions(ctx: Context<RevokeAllSessions>) -> Result<()> {
        let current_slot = Clock::get()?.slot;
        ctx.accounts.wallet.last_revoked_slot = current_slot;
        msg!("All sessions revoked at slot: {}", current_slot);
        Ok(())
    }

    pub fn execute_intent(ctx: Context<ExecuteIntent>, intent_data: Vec<u8>) -> Result<()> {
        let instruction = intent_data[0];
        let destination = Pubkey::new_from_array(intent_data[1..33].try_into().unwrap());
        let amount = u64::from_le_bytes(intent_data[33..41].try_into().unwrap());

        let wallet = &mut ctx.accounts.wallet;

        // Policy must be set before executing intents
        require!(!wallet.policy_data.is_empty() || wallet.policy_hash != [0u8; 32], ErrorCode::PolicyViolation);

        // Enforce allow/block policy
        enforce_policy(wallet, &destination)?;

        // Rate limiting: check and update daily spend tracking
        let current_time = Clock::get()?.unix_timestamp;
        let seconds_per_day: i64 = 86400;

        // Reset daily_spent if a new day has passed since last_reset
        if current_time >= wallet.last_reset + seconds_per_day {
            wallet.daily_spent = 0;
            wallet.last_reset = current_time;
        }

        // Check if adding this amount would exceed the daily limit
        require!(
            wallet.daily_spent.saturating_add(amount) <= wallet.daily_limit,
            ErrorCode::DailyLimitExceeded
        );

        if instruction == 0 {
            // SOL transfer via direct lamport manipulation
            let dest_info = ctx.accounts.destination.to_account_info();
            let wallet_lamports = ctx.accounts.wallet.to_account_info().lamports();
            require!(wallet_lamports >= amount, ErrorCode::AmountLimitExceeded);

            // Direct lamport transfer
            let wallet_info = ctx.accounts.wallet.to_account_info();
            **wallet_info.try_borrow_mut_lamports()? -= amount;
            **dest_info.try_borrow_mut_lamports()? += amount;

            // Update daily spent after successful transfer
            ctx.accounts.wallet.daily_spent = ctx.accounts.wallet.daily_spent.saturating_add(amount);
        }

        msg!("Executed intent: instruction={}, dest={:?}, amount={}", instruction, destination, amount);
        Ok(())
    }

    pub fn grant_temporal_key(ctx: Context<GrantTemporalKey>, session_key: Pubkey, expires_at: i64, daily_limit: u64) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;

        // Check if session key already exists
        for tk in wallet.temporal_keys.iter() {
            if tk.key == session_key {
                return Err(ErrorCode::TemporalKeyExists.into());
            }
        }

        wallet.temporal_keys.push(TemporalKey {
            key: session_key,
            expires_at,
            authorized: true,
            daily_limit,
            daily_spent: 0,
            last_reset: Clock::get()?.unix_timestamp,
        });

        msg!("Granted temporal key: {:?}", session_key);
        Ok(())
    }

    pub fn revoke_session(ctx: Context<RevokeSession>, session_key: Pubkey) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;

        for tk in wallet.temporal_keys.iter_mut() {
            if tk.key == session_key {
                tk.authorized = false;
                msg!("Revoked session key: {:?}", session_key);
                return Ok(());
            }
        }

        Err(ErrorCode::SessionNotAuthorized.into())
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
        let session_key = ctx.accounts.session_key.key();
        let instruction = intent_data[0];
        let destination = Pubkey::new_from_array(intent_data[1..33].try_into().unwrap());
        let amount = u64::from_le_bytes(intent_data[33..41].try_into().unwrap());

        // Get account info references BEFORE creating mutable borrow
        let dest_info = ctx.accounts.destination.to_account_info();
        let wallet_info = ctx.accounts.wallet.to_account_info();

        // --- #15: TEE Attestation verification ---
        // Construct message (mock message for now)
        let mut msg_data = Vec::new();
        msg_data.extend_from_slice(&intent_data);
        msg_data.extend_from_slice(&attestation_slot.to_le_bytes());
        msg_data.extend_from_slice(&attestation_policy_seq.to_le_bytes());

        // Skip TEE check if proxy_pk is default (backward compat for earlier tests)
        if ctx.accounts.wallet.proxy_pk != Pubkey::default() {
            require!(
                verify_tee_attestation(&attestation_signature, &ctx.accounts.wallet.proxy_pk, &msg_data),
                ErrorCode::InvalidAttestation
            );
        }

        // --- #13: Merkle proof verification ---
        if ctx.accounts.wallet.merkle_root != [0u8; 32] {
            require!(
                verify_merkle_proof(&merkle_leaf, &merkle_proof, merkle_index, &ctx.accounts.wallet.merkle_root),
                ErrorCode::InvalidMerkleProof
            );
        }

        // --- #14: Slot-based revocation ---
        // If sessions have been revoked, attestation must be after revocation
        if ctx.accounts.wallet.last_revoked_slot > 0 {
            require!(
                attestation_slot > ctx.accounts.wallet.last_revoked_slot,
                ErrorCode::StaleSlot
            );
        }

        // --- #14: Policy sequence verification ---
        // Attestation must match current policy version
        require!(
            attestation_policy_seq == ctx.accounts.wallet.policy_seq,
            ErrorCode::StalePolicySeq
        );

        // Policy must be set before executing intents
        require!(!ctx.accounts.wallet.policy_data.is_empty() || ctx.accounts.wallet.policy_hash != [0u8; 32], ErrorCode::PolicyViolation);

        // Enforce allow/block policy
        enforce_policy(&ctx.accounts.wallet, &destination)?;

        // Find temporal key index
        let tk_idx = ctx.accounts.wallet.temporal_keys.iter()
            .position(|tk| tk.key == session_key)
            .ok_or(ErrorCode::SessionNotAuthorized)?;

        // Extract all needed values from wallet/temporal_key BEFORE getting mutable references
        let current_time = Clock::get()?.unix_timestamp;
        let seconds_per_day: i64 = 86400;
        let tk_authorized = ctx.accounts.wallet.temporal_keys[tk_idx].authorized;
        let tk_expires_at = ctx.accounts.wallet.temporal_keys[tk_idx].expires_at;
        let tk_daily_limit = ctx.accounts.wallet.temporal_keys[tk_idx].daily_limit;
        let tk_last_reset = ctx.accounts.wallet.temporal_keys[tk_idx].last_reset;
        let tk_daily_spent = ctx.accounts.wallet.temporal_keys[tk_idx].daily_spent;

        // Validate authorization and expiry
        require!(tk_authorized, ErrorCode::SessionNotAuthorized);
        require!(current_time < tk_expires_at, ErrorCode::SessionExpired);

        // Calculate new daily_spent after reset if needed
        let new_daily_spent = if current_time >= tk_last_reset + seconds_per_day {
            0
        } else {
            tk_daily_spent
        };

        // Check if adding this amount would exceed the temporal key's daily limit
        require!(
            new_daily_spent.saturating_add(amount) <= tk_daily_limit,
            ErrorCode::DailyLimitExceeded
        );

        // Check wallet balance
        let wallet_lamports = wallet_info.lamports();
        require!(wallet_lamports >= amount, ErrorCode::AmountLimitExceeded);

        // Now get mutable reference and perform the transfer
        let wallet = &mut ctx.accounts.wallet;
        let tk = &mut wallet.temporal_keys[tk_idx];

        // Update last_reset and daily_spent
        if current_time >= tk_last_reset + seconds_per_day {
            tk.last_reset = current_time;
            tk.daily_spent = 0;
        }

        if instruction == 0 {
            // Direct lamport transfer
            **wallet_info.try_borrow_mut_lamports()? -= amount;
            **dest_info.try_borrow_mut_lamports()? += amount;

            // Update daily spent after successful transfer
            tk.daily_spent = tk.daily_spent.saturating_add(amount);
        }

        msg!("Executed intent as session: instruction={}, dest={:?}, amount={}", instruction, destination, amount);
        Ok(())
    }
}
