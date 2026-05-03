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
        // If allowlist is empty, allow anything NOT in blocklist
        if self.allowlist.is_empty() {
            return true;
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
    // --- #12: New production fields ---
    pub proxy_pk: Pubkey,              // Proxy's public key for this wallet
    pub merkle_root: [u8; 32],         // Committed Merkle root (depth 10, max 1024 leaves)
    pub policy_seq: u64,               // Increments on each policy change
    pub last_revoked_slot: u64,        // Slot at which last revocation occurred
    // --- Existing fields ---
    pub policy_hash: [u8; 32],
    pub policy_data: Vec<u8>,          // Serialized Policy struct
    pub daily_spent: u64,
    pub last_reset: i64,
    pub daily_limit: u64,
    pub temporal_keys: Vec<TemporalKey>,
}

impl Wallet {
    // owner(32) + proxy_pk(32) + merkle_root(32) + policy_seq(8) + last_revoked_slot(8)
    // + policy_hash(32) + policy_data(4+500) + daily_spent(8) + last_reset(8) + daily_limit(8)
    // + temporal_keys(4+200)
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 8 + 8 + 32 + 4 + 500 + 8 + 8 + 8 + 4 + 200;
}