use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Policy {
    pub allowlist: Vec<Pubkey>,
    pub blocklist: Vec<Pubkey>,
}

impl Policy {
    pub fn is_allowed(&self, dest: &Pubkey) -> bool {
        // Blocklist check first - block takes precedence
        for blocked in &self.blocklist {
            if blocked == dest {
                return false;
            }
        }
        // If allowlist is empty, nothing is allowed unless not in blocklist
        // Actually for our design: empty allowlist means nothing allowed
        if self.allowlist.is_empty() {
            return false;
        }
        // Check allowlist
        for allowed in &self.allowlist {
            if allowed == dest {
                return true;
            }
        }
        false
    }
}

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
    pub policy_data: Vec<u8>, // Serialized Policy struct
    pub daily_spent: u64,
    pub last_reset: i64,
    pub daily_limit: u64,
    pub temporal_keys: Vec<TemporalKey>,
}

impl Wallet {
    pub const INIT_SPACE: usize = 32 + 32 + 4 + 500 + 8 + 8 + 8 + 4 + 200;
}