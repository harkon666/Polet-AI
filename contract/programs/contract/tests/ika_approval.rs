use {
    common::{
        approve_ika_message_as_session, encrypt_amount, grant_session, initialize,
        read_mock_message_approval, read_wallet, set_confidential_numeric_policy, setup_svm,
        write_mock_ika_account, write_system_account,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const FUTURE_EXPIRY: i64 = 4_102_444_800;

#[test]
fn ika_approval_allows_in_limit_order_and_cpi_calls_mock_ika() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x61u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();
    let order_hash = [0xabu8; 32];

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    let res = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        order_hash,
        5,
        FUTURE_EXPIRY,
        10_000,
        1,
        witness,
    );
    assert!(res.is_ok(), "in-limit Ika approval should pass: {res:?}");

    let approval_data = read_mock_message_approval(&svm, message_approval);
    assert_eq!(
        approval_data[0], 1,
        "mock Ika approve_message was not called"
    );
    assert_eq!(&approval_data[1..33], &order_hash);
    assert_eq!(&approval_data[33..65], &[0xedu8; 32]);
    assert_eq!(
        u16::from_le_bytes(approval_data[65..67].try_into().unwrap()),
        5
    );
    assert_eq!(approval_data[67], 9);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(5, &witness)
    );
}

#[test]
fn ika_approval_blocks_over_limit_order_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x62u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    let res = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0xbcu8; 32],
        25,
        FUTURE_EXPIRY,
        10_000,
        1,
        witness,
    );
    assert!(res.is_err(), "over-limit Ika approval should be blocked");

    let approval_data = read_mock_message_approval(&svm, message_approval);
    assert_eq!(approval_data[0], 0, "mock Ika CPI should not be called");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(0, &witness)
    );
}

#[test]
fn ika_approval_rejects_stale_session_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x63u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    let res = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0xcdu8; 32],
        5,
        FUTURE_EXPIRY,
        0,
        1,
        witness,
    );
    assert!(res.is_err(), "stale attestation slot should be rejected");

    let approval_data = read_mock_message_approval(&svm, message_approval);
    assert_eq!(approval_data[0], 0, "mock Ika CPI should not be called");
}

#[test]
fn ika_approval_rejects_expired_order_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x64u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    let res = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0xdeu8; 32],
        5,
        i64::MIN,
        10_000,
        1,
        witness,
    );
    assert!(res.is_err(), "expired order should be rejected");

    let approval_data = read_mock_message_approval(&svm, message_approval);
    assert_eq!(approval_data[0], 0, "mock Ika CPI should not be called");
}
