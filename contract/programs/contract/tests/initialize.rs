use {
    common::{initialize, read_wallet, setup_svm},
    solana_signer::Signer,
};

mod common;

#[test]
fn initialize_creates_pda_wallet_without_plaintext_numeric_policy() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.owner, owner.pubkey());
    assert_eq!(wallet.proxy_pk, anchor_lang::prelude::Pubkey::default());
    assert_eq!(wallet.policy_commitment, [0u8; 32]);
    assert_eq!(wallet.merkle_root, [0u8; 32]);
    assert_eq!(wallet.policy_seq, 0);
    assert_eq!(wallet.last_revoked_slot, 0);
    assert!(!wallet.confidential_policy.enabled);
    assert_eq!(wallet.confidential_policy.encrypted_daily_spent, 0);
    assert!(!wallet.demo_custody.configured);
    assert_eq!(
        wallet.demo_custody.usdc_token_account,
        anchor_lang::prelude::Pubkey::default()
    );
    assert!(wallet.sessions.is_empty());
}
