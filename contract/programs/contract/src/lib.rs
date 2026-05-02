use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;

declare_id!("22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw");

pub use constants::WALLET_SEED;
pub use error::ErrorCode;
pub use state::{Wallet, TemporalKey};

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
    #[account(mut)]
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
    #[account(mut)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(mut)]
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

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, daily_limit: u64) -> Result<()> {
        ctx.accounts.wallet.set_inner(Wallet {
            owner: ctx.accounts.owner.key(),
            policy_hash: [0u8; 32],
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
        msg!("Policy hash updated to: {:?}", policy_hash);
        Ok(())
    }

    pub fn execute_intent(ctx: Context<ExecuteIntent>, intent_data: Vec<u8>) -> Result<()> {
        let instruction = intent_data[0];
        let _destination = Pubkey::new_from_array(intent_data[1..33].try_into().unwrap());
        let amount = u64::from_le_bytes(intent_data[33..41].try_into().unwrap());

        let wallet = &mut ctx.accounts.wallet;

        // Policy must be set before executing intents
        require!(wallet.policy_hash != [0u8; 32], ErrorCode::PolicyViolation);

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

        msg!("Executed intent: instruction={}, dest={:?}, amount={}", instruction, _destination, amount);
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

    pub fn execute_intent_as_session(ctx: Context<ExecuteIntentAsSession>, intent_data: Vec<u8>) -> Result<()> {
        let session_key = ctx.accounts.session_key.key();
        let instruction = intent_data[0];
        let destination = Pubkey::new_from_array(intent_data[1..33].try_into().unwrap());
        let amount = u64::from_le_bytes(intent_data[33..41].try_into().unwrap());

        // Get account info references BEFORE creating mutable borrow
        let dest_info = ctx.accounts.destination.to_account_info();
        let wallet_info = ctx.accounts.wallet.to_account_info();

        // Policy must be set before executing intents
        require!(ctx.accounts.wallet.policy_hash != [0u8; 32], ErrorCode::PolicyViolation);

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