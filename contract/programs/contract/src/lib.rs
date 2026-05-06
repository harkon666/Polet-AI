use anchor_lang::prelude::*;
use encrypt_anchor::EncryptContext;

pub mod confidential_policy;
pub mod constants;
pub mod encrypt_policy_graph;
pub mod encrypt_prealpha;
pub mod error;
pub mod execution_payload;
pub mod ika_approval;
pub mod state;

declare_id!("3bJjtLutfxy1oG6dREi32BnvousDcBYug7AsWcdBbkeN");

use confidential_policy::enforce_confidential_numeric_policy;
pub use constants::WALLET_SEED;
use encrypt_policy_graph::polet_policy_guardrail_graph_bytes;
use encrypt_prealpha::ENCRYPT_CPI_AUTHORITY_SEED;
pub use error::ErrorCode;
use execution_payload::parse_transfer_intent;
use ika_approval::{approve_ika_message, IkaApproveMessageAccounts, IKA_CPI_AUTHORITY_SEED};
pub use state::{
    ConfidentialNumericPolicy, DemoTokenCustody, DwalletControllerRotation,
    EncryptPolicyCiphertexts, SessionKey, SharedIkaApprovalConfig, SharedIkaApprover, Wallet,
};

const SPL_TOKEN_PROGRAM_ID_BYTES: [u8; 32] = [
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];

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
pub struct SetProxyKey<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetMerkleRoot<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetConfidentialNumericPolicy<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetEncryptCiphertextPolicy<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegisterDemoCustody<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump,
        has_one = owner @ ErrorCode::NotOwner,
    )]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
    /// CHECK: The mint address is recorded for the demo USDC input asset.
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: Validated as an initialized SPL Token account owned by wallet PDA.
    pub usdc_token_account: UncheckedAccount<'info>,
    /// CHECK: The mint address is recorded for the demo SOL/wSOL output asset.
    pub sol_mint: UncheckedAccount<'info>,
    /// CHECK: Validated as an initialized SPL Token account owned by wallet PDA.
    pub sol_token_account: UncheckedAccount<'info>,
    /// CHECK: Validated against the canonical SPL Token program id for this demo slice.
    pub token_program: UncheckedAccount<'info>,
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
pub struct RevokeAllSessions<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetRecoveryAuthority<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecoverWalletAccess<'info> {
    #[account(mut)]
    pub wallet: Account<'info, Wallet>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ConfigureSharedIkaApprovers<'info> {
    #[account(mut, has_one = owner @ ErrorCode::NotOwner)]
    pub wallet: Account<'info, Wallet>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeSharedIkaApprover<'info> {
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
    /// CHECK: Destination is checked against intent_data and receives lamports in this SOL-only core slice.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteIntentAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    pub session_key: Signer<'info>,
    /// CHECK: Destination is checked against intent_data and receives lamports in this SOL-only core slice.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteConfidentialTransferAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    pub session_key: Signer<'info>,
    /// CHECK: Destination is checked against intent_data and receives lamports in this SOL-only core slice.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteEncryptPolicyGraphAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    pub session_key: Signer<'info>,
    /// CHECK: Source amount ciphertext account created through Encrypt pre-alpha.
    #[account(mut)]
    pub source_amount_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Max-per-run ciphertext account recorded on the wallet policy.
    #[account(mut)]
    pub max_per_run_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Daily-spent ciphertext account recorded on the wallet policy.
    #[account(mut)]
    pub daily_spent_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Daily-cap ciphertext account recorded on the wallet policy.
    #[account(mut)]
    pub daily_cap_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Pending allow/block output ciphertext account.
    #[account(mut)]
    pub allowed_output_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Pending updated daily-spent output ciphertext account.
    #[account(mut)]
    pub daily_spent_output_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Encrypt pre-alpha program.
    pub encrypt_program: UncheckedAccount<'info>,
    /// CHECK: Encrypt config account.
    #[account(mut)]
    pub config: UncheckedAccount<'info>,
    /// CHECK: Encrypt deposit account.
    #[account(mut)]
    pub deposit: UncheckedAccount<'info>,
    /// CHECK: Polet Encrypt CPI authority PDA.
    #[account(seeds = [ENCRYPT_CPI_AUTHORITY_SEED], bump)]
    pub cpi_authority: UncheckedAccount<'info>,
    /// CHECK: This program executable account, required by Encrypt CPI authority checks.
    pub program: UncheckedAccount<'info>,
    /// CHECK: Encrypt network encryption key account.
    pub network_encryption_key: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Encrypt event authority account.
    pub event_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveIkaMessageAsSession<'info> {
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,
    pub session_key: Signer<'info>,
    /// CHECK: Official Ika DWalletCoordinator PDA. The Ika program validates its own account schema.
    pub coordinator: UncheckedAccount<'info>,
    /// CHECK: Official Ika dWallet account. The Ika program validates its own account schema.
    pub dwallet: UncheckedAccount<'info>,
    /// CHECK: Official Ika MessageApproval PDA. The Ika program owns creation/validation.
    #[account(mut)]
    pub message_approval: UncheckedAccount<'info>,
    /// CHECK: Polet CPI authority PDA used as the dWallet authority.
    #[account(seeds = [IKA_CPI_AUTHORITY_SEED], bump)]
    pub cpi_authority: UncheckedAccount<'info>,
    /// CHECK: This program's executable account, required by the official Ika CPI SDK for authority verification.
    pub program: UncheckedAccount<'info>,
    /// CHECK: Ika Pre-Alpha program on devnet, or a deterministic mock Ika program in CI.
    pub ika_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

fn require_policy_commitment(wallet: &Wallet) -> Result<()> {
    require!(
        wallet.policy_commitment != [0u8; 32] || wallet.merkle_root != [0u8; 32],
        ErrorCode::PolicyViolation
    );
    Ok(())
}

fn validate_session(wallet: &Wallet, session_key: Pubkey) -> Result<usize> {
    let session_index = wallet
        .sessions
        .iter()
        .position(|session| session.key == session_key)
        .ok_or(ErrorCode::SessionNotAuthorized)?;

    let session = &wallet.sessions[session_index];
    let now = Clock::get()?.unix_timestamp;

    require!(session.authorized, ErrorCode::SessionNotAuthorized);
    require!(now < session.expires_at, ErrorCode::SessionExpired);
    require!(
        session.granted_slot >= wallet.last_revoked_slot,
        ErrorCode::SessionGloballyRevoked
    );

    Ok(session_index)
}

fn validate_session_and_attestation(
    wallet: &Wallet,
    session_key: Pubkey,
    attestation_slot: u64,
    attestation_policy_seq: u64,
) -> Result<()> {
    validate_session(wallet, session_key)?;

    require!(
        attestation_policy_seq == wallet.policy_seq,
        ErrorCode::StalePolicySeq
    );
    require!(
        attestation_slot > wallet.last_revoked_slot,
        ErrorCode::StaleSlot
    );

    Ok(())
}

fn require_not_expired(expires_at: i64) -> Result<()> {
    require!(
        Clock::get()?.unix_timestamp < expires_at,
        ErrorCode::OrderExpired
    );
    Ok(())
}

fn require_non_default_pubkey(pubkey: Pubkey) -> Result<()> {
    require!(pubkey != Pubkey::default(), ErrorCode::InvalidEncryptPolicy);
    Ok(())
}

fn require_encrypt_ciphertext_policy(wallet: &Wallet) -> Result<()> {
    require!(
        wallet.confidential_policy.enabled
            && wallet.confidential_policy.encrypt_ciphertexts.configured,
        ErrorCode::ConfidentialPolicyNotConfigured
    );
    Ok(())
}

fn require_expected_ciphertext(actual: Pubkey, expected: Pubkey) -> Result<()> {
    require!(actual == expected, ErrorCode::InvalidEncryptPolicy);
    Ok(())
}

fn configure_shared_ika_approval_config(
    wallet: &mut Wallet,
    threshold: u8,
    approvers: Vec<Pubkey>,
) -> Result<()> {
    require!(threshold > 0, ErrorCode::InvalidSharedIkaApprovalConfig);
    require!(
        approvers.len() <= Wallet::MAX_SHARED_IKA_APPROVERS,
        ErrorCode::TooManySharedIkaApprovers
    );
    require!(
        usize::from(threshold) <= approvers.len(),
        ErrorCode::InvalidSharedIkaApprovalConfig
    );

    let mut shared_approvers = Vec::with_capacity(approvers.len());
    for (index, approver) in approvers.iter().enumerate() {
        require!(
            *approver != Pubkey::default(),
            ErrorCode::InvalidSharedIkaApprovalConfig
        );
        require!(
            !approvers[index + 1..]
                .iter()
                .any(|candidate| candidate == approver),
            ErrorCode::InvalidSharedIkaApprovalConfig
        );
        shared_approvers.push(SharedIkaApprover {
            key: *approver,
            authorized: true,
        });
    }

    wallet.shared_ika_approvals = SharedIkaApprovalConfig {
        threshold,
        enabled: true,
        approvers: shared_approvers,
    };
    wallet.policy_seq = wallet
        .policy_seq
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    Ok(())
}

fn require_recovery_authority(wallet: &Wallet, authority: Pubkey) -> Result<()> {
    require!(
        authority == wallet.owner || authority == wallet.recovery_authority,
        ErrorCode::NotRecoveryAuthority
    );
    Ok(())
}

fn mark_sessions_revoked(wallet: &mut Wallet, compromised_sessions: &[Pubkey]) {
    for session in wallet.sessions.iter_mut() {
        if compromised_sessions
            .iter()
            .any(|candidate| *candidate == session.key)
        {
            session.authorized = false;
        }
    }
}

fn revoke_shared_ika_approver_config(wallet: &mut Wallet, approver: Pubkey) -> Result<()> {
    let shared_approver = wallet
        .shared_ika_approvals
        .approvers
        .iter_mut()
        .find(|candidate| candidate.key == approver)
        .ok_or(ErrorCode::InvalidSharedIkaApprovalConfig)?;
    shared_approver.authorized = false;
    wallet.policy_seq = wallet
        .policy_seq
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    Ok(())
}

fn enforce_shared_ika_quorum(
    config: &SharedIkaApprovalConfig,
    remaining_accounts: &[AccountInfo],
) -> Result<()> {
    if !config.enabled || config.threshold == 0 {
        return Ok(());
    }

    let mut approvals = 0u8;
    let mut counted = [Pubkey::default(); Wallet::MAX_SHARED_IKA_APPROVERS];
    for account in remaining_accounts {
        if !account.is_signer {
            continue;
        }
        let account_key = account.key();
        if counted[..usize::from(approvals)]
            .iter()
            .any(|counted_key| *counted_key == account_key)
        {
            continue;
        }
        if config
            .approvers
            .iter()
            .any(|approver| approver.authorized && approver.key == account_key)
        {
            counted[usize::from(approvals)] = account_key;
            approvals = approvals
                .checked_add(1)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            if approvals >= config.threshold {
                return Ok(());
            }
        }
    }

    err!(ErrorCode::SharedIkaApprovalQuorumMissing)
}

fn transfer_lamports<'info>(
    wallet_info: AccountInfo<'info>,
    destination_info: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    require!(
        wallet_info.lamports() >= amount,
        ErrorCode::AmountLimitExceeded
    );
    **wallet_info.try_borrow_mut_lamports()? -= amount;
    **destination_info.try_borrow_mut_lamports()? += amount;
    Ok(())
}

fn validate_supported_token_program(token_program: &Pubkey) -> Result<()> {
    require!(
        token_program.to_bytes() == SPL_TOKEN_PROGRAM_ID_BYTES,
        ErrorCode::InvalidTokenCustody
    );
    Ok(())
}

fn validate_pda_token_account(
    token_account: &AccountInfo,
    mint: &Pubkey,
    authority: &Pubkey,
    token_program: &Pubkey,
) -> Result<()> {
    require!(
        *token_account.owner == *token_program,
        ErrorCode::InvalidTokenCustody
    );

    let data = token_account.try_borrow_data()?;
    require!(data.len() >= 109, ErrorCode::InvalidTokenCustody);

    let account_mint = Pubkey::new_from_array(
        data[0..32]
            .try_into()
            .map_err(|_| ErrorCode::InvalidTokenCustody)?,
    );
    let account_authority = Pubkey::new_from_array(
        data[32..64]
            .try_into()
            .map_err(|_| ErrorCode::InvalidTokenCustody)?,
    );

    require!(account_mint == *mint, ErrorCode::InvalidTokenCustody);
    require!(
        account_authority == *authority,
        ErrorCode::InvalidTokenCustody
    );
    require!(data[108] == 1, ErrorCode::InvalidTokenCustody);

    Ok(())
}

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.wallet.set_inner(Wallet {
            owner: ctx.accounts.owner.key(),
            recovery_authority: ctx.accounts.owner.key(),
            proxy_pk: Pubkey::default(),
            policy_commitment: [0u8; 32],
            merkle_root: [0u8; 32],
            policy_seq: 0,
            last_revoked_slot: 0,
            confidential_policy: ConfidentialNumericPolicy::default(),
            demo_custody: DemoTokenCustody::default(),
            shared_ika_approvals: SharedIkaApprovalConfig::default(),
            dwallet_controller: DwalletControllerRotation::default(),
            sessions: Vec::new(),
        });
        msg!("Polet wallet created for: {:?}", ctx.accounts.owner.key());
        Ok(())
    }

    pub fn register_demo_custody(ctx: Context<RegisterDemoCustody>) -> Result<()> {
        let wallet_key = ctx.accounts.wallet.key();
        let token_program = ctx.accounts.token_program.key();
        validate_supported_token_program(&token_program)?;
        validate_pda_token_account(
            &ctx.accounts.usdc_token_account.to_account_info(),
            &ctx.accounts.usdc_mint.key(),
            &wallet_key,
            &token_program,
        )?;
        validate_pda_token_account(
            &ctx.accounts.sol_token_account.to_account_info(),
            &ctx.accounts.sol_mint.key(),
            &wallet_key,
            &token_program,
        )?;

        ctx.accounts.wallet.demo_custody = DemoTokenCustody {
            usdc_mint: ctx.accounts.usdc_mint.key(),
            usdc_token_account: ctx.accounts.usdc_token_account.key(),
            sol_mint: ctx.accounts.sol_mint.key(),
            sol_token_account: ctx.accounts.sol_token_account.key(),
            token_program,
            configured: true,
        };

        msg!(
            "Registered demo custody: usdc_token_account={:?}, sol_token_account={:?}",
            ctx.accounts.usdc_token_account.key(),
            ctx.accounts.sol_token_account.key()
        );
        Ok(())
    }

    pub fn set_policy(ctx: Context<SetPolicy>, policy_commitment: [u8; 32]) -> Result<()> {
        require!(policy_commitment != [0u8; 32], ErrorCode::PolicyViolation);
        let wallet = &mut ctx.accounts.wallet;
        wallet.policy_commitment = policy_commitment;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        msg!(
            "Policy commitment updated, policy_seq={}",
            wallet.policy_seq
        );
        Ok(())
    }

    pub fn set_proxy_key(ctx: Context<SetProxyKey>, proxy_pk: Pubkey) -> Result<()> {
        ctx.accounts.wallet.proxy_pk = proxy_pk;
        msg!("Proxy key updated to: {:?}", proxy_pk);
        Ok(())
    }

    pub fn set_merkle_root(ctx: Context<SetMerkleRoot>, merkle_root: [u8; 32]) -> Result<()> {
        require!(merkle_root != [0u8; 32], ErrorCode::PolicyViolation);
        let wallet = &mut ctx.accounts.wallet;
        wallet.merkle_root = merkle_root;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        msg!("Merkle root updated, policy_seq={}", wallet.policy_seq);
        Ok(())
    }

    pub fn set_confidential_numeric_policy(
        ctx: Context<SetConfidentialNumericPolicy>,
        policy_commitment: [u8; 32],
        encryption_witness_hash: [u8; 32],
        encrypted_max_per_run: u64,
        encrypted_daily_cap: u64,
        encrypted_daily_spent: u64,
        spent_day_index: i64,
    ) -> Result<()> {
        require!(policy_commitment != [0u8; 32], ErrorCode::PolicyViolation);
        require!(
            encryption_witness_hash != [0u8; 32],
            ErrorCode::InvalidPolicyWitness
        );

        let wallet = &mut ctx.accounts.wallet;
        wallet.confidential_policy = ConfidentialNumericPolicy {
            policy_commitment,
            encryption_witness_hash,
            encrypted_max_per_run,
            encrypted_daily_cap,
            encrypted_daily_spent,
            spent_day_index,
            encrypt_ciphertexts: wallet.confidential_policy.encrypt_ciphertexts.clone(),
            enabled: true,
        };
        wallet.policy_commitment = policy_commitment;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!(
            "Confidential numeric policy updated, policy_seq={}",
            wallet.policy_seq
        );
        Ok(())
    }

    pub fn set_encrypt_ciphertext_policy(
        ctx: Context<SetEncryptCiphertextPolicy>,
        policy_commitment: [u8; 32],
        max_per_run_ciphertext: Pubkey,
        daily_cap_ciphertext: Pubkey,
        daily_spent_ciphertext: Pubkey,
    ) -> Result<()> {
        require!(policy_commitment != [0u8; 32], ErrorCode::PolicyViolation);
        require_non_default_pubkey(max_per_run_ciphertext)?;
        require_non_default_pubkey(daily_cap_ciphertext)?;
        require_non_default_pubkey(daily_spent_ciphertext)?;

        let wallet = &mut ctx.accounts.wallet;
        wallet.confidential_policy.policy_commitment = policy_commitment;
        wallet.confidential_policy.encrypt_ciphertexts = EncryptPolicyCiphertexts {
            max_per_run: max_per_run_ciphertext,
            daily_cap: daily_cap_ciphertext,
            daily_spent: daily_spent_ciphertext,
            pending_allowed_output: Pubkey::default(),
            pending_daily_spent_output: Pubkey::default(),
            pending_source_amount: Pubkey::default(),
            pending_slot: 0,
            pending_policy_seq: 0,
            pending: false,
            configured: true,
        };
        wallet.confidential_policy.enabled = true;
        wallet.policy_commitment = policy_commitment;
        wallet.policy_seq = wallet
            .policy_seq
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!(
            "Encrypt ciphertext policy updated, policy_seq={}",
            wallet.policy_seq
        );
        Ok(())
    }

    pub fn grant_temporal_key(
        ctx: Context<GrantTemporalKey>,
        session_key: Pubkey,
        expires_at: i64,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let now = Clock::get()?.unix_timestamp;
        require!(expires_at > now, ErrorCode::SessionExpired);
        require!(
            wallet.sessions.len() < Wallet::MAX_SESSIONS,
            ErrorCode::TooManySessions
        );

        for session in wallet.sessions.iter_mut() {
            if session.key == session_key {
                require!(!session.authorized, ErrorCode::TemporalKeyExists);
                session.expires_at = expires_at;
                session.granted_slot = Clock::get()?.slot;
                session.authorized = true;
                msg!("Re-authorized session key: {:?}", session_key);
                return Ok(());
            }
        }

        wallet.sessions.push(SessionKey {
            key: session_key,
            expires_at,
            granted_slot: Clock::get()?.slot,
            authorized: true,
        });

        msg!("Granted session key: {:?}", session_key);
        Ok(())
    }

    pub fn revoke_session(ctx: Context<RevokeSession>, session_key: Pubkey) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let session = wallet
            .sessions
            .iter_mut()
            .find(|session| session.key == session_key)
            .ok_or(ErrorCode::SessionNotAuthorized)?;

        session.authorized = false;
        msg!("Revoked session key: {:?}", session_key);
        Ok(())
    }

    pub fn revoke_all_sessions(ctx: Context<RevokeAllSessions>) -> Result<()> {
        ctx.accounts.wallet.last_revoked_slot = Clock::get()?.slot;
        msg!(
            "All sessions revoked at slot: {}",
            ctx.accounts.wallet.last_revoked_slot
        );
        Ok(())
    }

    pub fn set_recovery_authority(
        ctx: Context<SetRecoveryAuthority>,
        recovery_authority: Pubkey,
    ) -> Result<()> {
        require!(
            recovery_authority != Pubkey::default(),
            ErrorCode::InvalidRecoveryRequest
        );
        ctx.accounts.wallet.recovery_authority = recovery_authority;
        msg!("Recovery authority updated: {:?}", recovery_authority);
        Ok(())
    }

    pub fn recover_wallet_access(
        ctx: Context<RecoverWalletAccess>,
        compromised_sessions: Vec<Pubkey>,
        shared_ika_threshold: u8,
        shared_ika_approvers: Vec<Pubkey>,
        pending_dwallet_controller: Pubkey,
    ) -> Result<()> {
        require_recovery_authority(&ctx.accounts.wallet, ctx.accounts.authority.key())?;
        require!(
            compromised_sessions.len() <= Wallet::MAX_SESSIONS,
            ErrorCode::TooManySessions
        );
        require!(
            pending_dwallet_controller != Pubkey::default(),
            ErrorCode::InvalidRecoveryRequest
        );

        let wallet = &mut ctx.accounts.wallet;
        mark_sessions_revoked(wallet, &compromised_sessions);
        wallet.last_revoked_slot = Clock::get()?.slot;
        configure_shared_ika_approval_config(wallet, shared_ika_threshold, shared_ika_approvers)?;
        wallet.dwallet_controller = DwalletControllerRotation {
            current_controller: wallet.dwallet_controller.current_controller,
            pending_controller: pending_dwallet_controller,
            rotation_seq: wallet
                .dwallet_controller
                .rotation_seq
                .checked_add(1)
                .ok_or(ErrorCode::ArithmeticOverflow)?,
            last_rotated_slot: Clock::get()?.slot,
            migration_pending: true,
        };

        msg!(
            "Recovery rotated access metadata, policy_seq={}, dwallet_rotation_seq={}",
            wallet.policy_seq,
            wallet.dwallet_controller.rotation_seq
        );
        Ok(())
    }

    pub fn configure_shared_ika_approvers(
        ctx: Context<ConfigureSharedIkaApprovers>,
        threshold: u8,
        approvers: Vec<Pubkey>,
    ) -> Result<()> {
        configure_shared_ika_approval_config(&mut ctx.accounts.wallet, threshold, approvers)?;
        msg!(
            "Configured shared Ika approvals, policy_seq={}",
            ctx.accounts.wallet.policy_seq
        );
        Ok(())
    }

    pub fn revoke_shared_ika_approver(
        ctx: Context<RevokeSharedIkaApprover>,
        approver: Pubkey,
    ) -> Result<()> {
        revoke_shared_ika_approver_config(&mut ctx.accounts.wallet, approver)?;
        msg!(
            "Revoked shared Ika approver, policy_seq={}",
            ctx.accounts.wallet.policy_seq
        );
        Ok(())
    }

    pub fn execute_intent(ctx: Context<ExecuteIntent>, intent_data: Vec<u8>) -> Result<()> {
        require_policy_commitment(&ctx.accounts.wallet)?;
        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Owner executed intent: instruction={}, dest={:?}, amount={}",
            payload.instruction,
            ctx.accounts.destination.key(),
            payload.amount
        );
        Ok(())
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
        let _ = (
            merkle_proof,
            merkle_leaf,
            merkle_index,
            attestation_signature,
        );
        require_policy_commitment(&ctx.accounts.wallet)?;
        validate_session_and_attestation(
            &ctx.accounts.wallet,
            ctx.accounts.session_key.key(),
            attestation_slot,
            attestation_policy_seq,
        )?;

        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Session executed intent: instruction={}, dest={:?}, amount={}",
            payload.instruction,
            ctx.accounts.destination.key(),
            payload.amount
        );
        Ok(())
    }

    pub fn execute_confidential_transfer_as_session(
        ctx: Context<ExecuteConfidentialTransferAsSession>,
        intent_data: Vec<u8>,
        attestation_slot: u64,
        attestation_policy_seq: u64,
        encryption_witness: [u8; 32],
    ) -> Result<()> {
        validate_session_and_attestation(
            &ctx.accounts.wallet,
            ctx.accounts.session_key.key(),
            attestation_slot,
            attestation_policy_seq,
        )?;

        let payload = parse_transfer_intent(&intent_data, &ctx.accounts.destination.key())?;

        enforce_confidential_numeric_policy(
            &mut ctx.accounts.wallet,
            payload.amount,
            &encryption_witness,
        )?;
        transfer_lamports(
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.destination.to_account_info(),
            payload.amount,
        )?;

        msg!(
            "Session executed confidential intent: instruction={}, dest={:?}",
            payload.instruction,
            ctx.accounts.destination.key(),
        );
        Ok(())
    }

    pub fn execute_encrypt_policy_graph_as_session(
        ctx: Context<ExecuteEncryptPolicyGraphAsSession>,
        attestation_slot: u64,
        attestation_policy_seq: u64,
        cpi_authority_bump: u8,
    ) -> Result<()> {
        require_encrypt_ciphertext_policy(&ctx.accounts.wallet)?;
        validate_session_and_attestation(
            &ctx.accounts.wallet,
            ctx.accounts.session_key.key(),
            attestation_slot,
            attestation_policy_seq,
        )?;

        let ciphertexts = &ctx.accounts.wallet.confidential_policy.encrypt_ciphertexts;
        require_expected_ciphertext(
            ctx.accounts.max_per_run_ciphertext.key(),
            ciphertexts.max_per_run,
        )?;
        require_expected_ciphertext(
            ctx.accounts.daily_cap_ciphertext.key(),
            ciphertexts.daily_cap,
        )?;
        require_expected_ciphertext(
            ctx.accounts.daily_spent_ciphertext.key(),
            ciphertexts.daily_spent,
        )?;

        let encrypt_ctx = EncryptContext {
            encrypt_program: ctx.accounts.encrypt_program.to_account_info(),
            config: ctx.accounts.config.to_account_info(),
            deposit: ctx.accounts.deposit.to_account_info(),
            cpi_authority: ctx.accounts.cpi_authority.to_account_info(),
            caller_program: ctx.accounts.program.to_account_info(),
            network_encryption_key: ctx.accounts.network_encryption_key.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            event_authority: ctx.accounts.event_authority.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            cpi_authority_bump,
        };
        encrypt_ctx.execute_graph(
            &polet_policy_guardrail_graph_bytes(),
            &[
                ctx.accounts.source_amount_ciphertext.to_account_info(),
                ctx.accounts.max_per_run_ciphertext.to_account_info(),
                ctx.accounts.daily_spent_ciphertext.to_account_info(),
                ctx.accounts.daily_cap_ciphertext.to_account_info(),
                ctx.accounts.allowed_output_ciphertext.to_account_info(),
                ctx.accounts.daily_spent_output_ciphertext.to_account_info(),
            ],
        )?;

        let policy_seq = ctx.accounts.wallet.policy_seq;
        let policy = &mut ctx.accounts.wallet.confidential_policy;
        policy.encrypt_ciphertexts.pending_source_amount =
            ctx.accounts.source_amount_ciphertext.key();
        policy.encrypt_ciphertexts.pending_allowed_output =
            ctx.accounts.allowed_output_ciphertext.key();
        policy.encrypt_ciphertexts.pending_daily_spent_output =
            ctx.accounts.daily_spent_output_ciphertext.key();
        policy.encrypt_ciphertexts.pending_slot = Clock::get()?.slot;
        policy.encrypt_ciphertexts.pending_policy_seq = policy_seq;
        policy.encrypt_ciphertexts.pending = true;

        msg!(
            "Encrypt policy graph execution pending, policy_seq={}",
            policy_seq
        );
        Ok(())
    }

    pub fn approve_ika_message_as_session(
        ctx: Context<ApproveIkaMessageAsSession>,
        ika_message_hash: [u8; 32],
        source_amount: u64,
        order_expires_at: i64,
        attestation_slot: u64,
        attestation_policy_seq: u64,
        encryption_witness: [u8; 32],
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        message_approval_bump: u8,
    ) -> Result<()> {
        validate_session_and_attestation(
            &ctx.accounts.wallet,
            ctx.accounts.session_key.key(),
            attestation_slot,
            attestation_policy_seq,
        )?;
        require_not_expired(order_expires_at)?;
        enforce_shared_ika_quorum(
            &ctx.accounts.wallet.shared_ika_approvals,
            ctx.remaining_accounts,
        )?;

        enforce_confidential_numeric_policy(
            &mut ctx.accounts.wallet,
            source_amount,
            &encryption_witness,
        )?;

        approve_ika_message(
            IkaApproveMessageAccounts {
                ika_program: ctx.accounts.ika_program.to_account_info(),
                coordinator: ctx.accounts.coordinator.to_account_info(),
                message_approval: ctx.accounts.message_approval.to_account_info(),
                dwallet: ctx.accounts.dwallet.to_account_info(),
                payer: ctx.accounts.session_key.to_account_info(),
                cpi_authority: ctx.accounts.cpi_authority.to_account_info(),
                caller_program: ctx.accounts.program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                signer_bump: ctx.bumps.cpi_authority,
                message_approval_bump,
                user_pubkey,
                signature_scheme,
                _marker: core::marker::PhantomData,
            },
            ika_message_hash,
        )?;

        msg!("Ika approve_message CPI submitted after Polet policy approval");
        Ok(())
    }
}
