use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionKey {
    pub key: Pubkey,
    pub expires_at: i64,
    pub granted_slot: u64,
    pub authorized: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfidentialNumericPolicy {
    pub policy_commitment: [u8; 32],
    pub encryption_witness_hash: [u8; 32],
    pub encrypted_max_per_run: u64,
    pub encrypted_daily_cap: u64,
    pub encrypted_daily_spent: u64,
    pub spent_day_index: i64,
    pub enabled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct DemoTokenCustody {
    pub usdc_mint: Pubkey,
    pub usdc_token_account: Pubkey,
    pub sol_mint: Pubkey,
    pub sol_token_account: Pubkey,
    pub token_program: Pubkey,
    pub configured: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct SharedIkaApprover {
    pub key: Pubkey,
    pub authorized: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct SharedIkaApprovalConfig {
    pub threshold: u8,
    pub enabled: bool,
    pub approvers: Vec<SharedIkaApprover>,
}

#[account]
pub struct Wallet {
    pub owner: Pubkey,
    pub proxy_pk: Pubkey,
    pub policy_commitment: [u8; 32],
    pub merkle_root: [u8; 32],
    pub policy_seq: u64,
    pub last_revoked_slot: u64,
    pub confidential_policy: ConfidentialNumericPolicy,
    pub demo_custody: DemoTokenCustody,
    pub shared_ika_approvals: SharedIkaApprovalConfig,
    pub sessions: Vec<SessionKey>,
}

impl Wallet {
    pub const MAX_SESSIONS: usize = 8;
    pub const MAX_SHARED_IKA_APPROVERS: usize = 5;
    pub const INIT_SPACE: usize = 32
        + 32
        + 32
        + 32
        + 8
        + 8
        + ConfidentialNumericPolicy::SPACE
        + DemoTokenCustody::SPACE
        + SharedIkaApprovalConfig::SPACE
        + 4
        + (SessionKey::SPACE * Self::MAX_SESSIONS);
}

impl SessionKey {
    pub const SPACE: usize = 32 + 8 + 8 + 1;
}

impl ConfidentialNumericPolicy {
    pub const SPACE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 1;
}

impl DemoTokenCustody {
    pub const SPACE: usize = 32 + 32 + 32 + 32 + 32 + 1;
}

impl SharedIkaApprover {
    pub const SPACE: usize = 32 + 1;
}

impl SharedIkaApprovalConfig {
    pub const SPACE: usize = 1 + 1 + 4 + (SharedIkaApprover::SPACE * Wallet::MAX_SHARED_IKA_APPROVERS);
}
