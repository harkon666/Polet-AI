use anchor_lang::prelude::*;

#[account]
pub struct Wallet {
    pub owner: Pubkey,
    pub policy_hash: [u8; 32],
    pub daily_spent: u64,
    pub last_reset: i64,
    pub daily_limit: u64,
}

impl Wallet {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8;
}