use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the wallet owner can perform this action")]
    NotOwner,
    #[msg("Policy violation - transaction not allowed")]
    PolicyViolation,
    #[msg("Daily spend limit exceeded")]
    DailyLimitExceeded,
    #[msg("Per-transaction amount limit exceeded")]
    AmountLimitExceeded,
    #[msg("Session key has expired")]
    SessionExpired,
    #[msg("Session key is not authorized")]
    SessionNotAuthorized,
    #[msg("Invalid attestation signature")]
    InvalidAttestation,
}
