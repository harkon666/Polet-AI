use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

use crate::error::ErrorCode;
use crate::state::ConfidentialNumericPolicy;

pub fn enforce_confidential_numeric_policy(
    policy: &mut ConfidentialNumericPolicy,
    amount: u64,
    encryption_witness: &[u8; 32],
) -> Result<()> {
    verify_witness(policy, encryption_witness)?;

    let max_per_run = decrypt_amount(policy.encrypted_max_per_run, encryption_witness);
    let daily_cap = decrypt_amount(policy.encrypted_daily_cap, encryption_witness);
    let today = current_day_index()?;
    let daily_spent = current_daily_spent(policy, encryption_witness, today);

    require!(amount <= max_per_run, ErrorCode::AmountLimitExceeded);
    let next_daily_spent = daily_spent
        .checked_add(amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    require!(next_daily_spent <= daily_cap, ErrorCode::DailyLimitExceeded);

    policy.encrypted_daily_spent = encrypt_amount(next_daily_spent, encryption_witness);
    policy.spent_day_index = today;

    Ok(())
}

fn verify_witness(policy: &ConfidentialNumericPolicy, encryption_witness: &[u8; 32]) -> Result<()> {
    require!(
        policy.enabled && policy.policy_commitment != [0u8; 32],
        ErrorCode::ConfidentialPolicyNotConfigured
    );
    require!(
        hashv(&[encryption_witness]).to_bytes() == policy.encryption_witness_hash,
        ErrorCode::InvalidPolicyWitness
    );
    Ok(())
}

fn current_daily_spent(
    policy: &ConfidentialNumericPolicy,
    encryption_witness: &[u8; 32],
    today: i64,
) -> u64 {
    if policy.spent_day_index == today {
        decrypt_amount(policy.encrypted_daily_spent, encryption_witness)
    } else {
        0
    }
}

fn current_day_index() -> Result<i64> {
    let timestamp = Clock::get()?.unix_timestamp;
    Ok(timestamp.div_euclid(86_400))
}

fn encrypt_amount(amount: u64, encryption_witness: &[u8; 32]) -> u64 {
    amount ^ witness_mask(encryption_witness)
}

fn decrypt_amount(encrypted_amount: u64, encryption_witness: &[u8; 32]) -> u64 {
    encrypted_amount ^ witness_mask(encryption_witness)
}

fn witness_mask(encryption_witness: &[u8; 32]) -> u64 {
    u64::from_le_bytes(encryption_witness[0..8].try_into().expect("fixed slice"))
}
