use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod state;

declare_id!("2W4wkSy2QJ9SczvUfyPNYDLgqpEZ5WVktpEXVfTzBVJP");

pub use constants::WALLET_SEED;
pub use error::ErrorCode;
pub use state::Wallet;

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
        });
        msg!("Wallet created for: {:?}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn set_policy(ctx: Context<SetPolicy>, policy_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.wallet.policy_hash = policy_hash;
        msg!("Policy hash updated to: {:?}", policy_hash);
        Ok(())
    }
}