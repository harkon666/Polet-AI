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
    #[msg("Temporal key already exists")]
    TemporalKeyExists,
    #[msg("Destination not in allowlist")]
    DestinationNotAllowed,
    #[msg("Destination in blocklist")]
    DestinationBlocked,
    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,
    #[msg("Attestation slot is stale (before last revocation)")]
    StaleSlot,
    #[msg("Attestation policy_seq does not match wallet policy_seq")]
    StalePolicySeq,
    #[msg("Session key was granted before the latest global revocation")]
    SessionGloballyRevoked,
    #[msg("Too many active or historical session keys")]
    TooManySessions,
    #[msg("Invalid intent payload")]
    InvalidIntent,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Confidential numeric policy is not configured")]
    ConfidentialPolicyNotConfigured,
    #[msg("Invalid confidential policy witness")]
    InvalidPolicyWitness,
    #[msg("Invalid PDA token custody account")]
    InvalidTokenCustody,
    #[msg("Demo token custody is not configured")]
    TokenCustodyNotConfigured,
    #[msg("Bridgeless order is expired")]
    OrderExpired,
    #[msg("Invalid Ika approval request")]
    InvalidIkaApproval,
    #[msg("Too many shared Ika approvers")]
    TooManySharedIkaApprovers,
    #[msg("Invalid shared Ika approval configuration")]
    InvalidSharedIkaApprovalConfig,
    #[msg("Shared Ika approval quorum is missing")]
    SharedIkaApprovalQuorumMissing,
    #[msg(
        "Only the wallet owner or configured recovery authority can perform this recovery action"
    )]
    NotRecoveryAuthority,
    #[msg("Invalid recovery rotation request")]
    InvalidRecoveryRequest,
    #[msg("Invalid Encrypt pre-alpha policy ciphertext account")]
    InvalidEncryptPolicy,
}
