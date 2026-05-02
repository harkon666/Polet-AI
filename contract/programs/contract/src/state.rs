use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TemporalKey {
    pub key: Pubkey,
    pub expires_at: i64,
    pub authorized: bool,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub last_reset: i64,
}

#[account]
pub struct Wallet {
    pub owner: Pubkey,
    pub policy_hash: [u8; 32],
    pub daily_spent: u64,
    pub last_reset: i64,
    pub daily_limit: u64,
    pub temporal_keys: Vec<TemporalKey>,
}

impl Wallet {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8 + 4 + 200; // rough estimate for Vec<TemporalKey>
}