use {
    common::{
        approve_ika_message_as_session, approve_ika_message_as_session_with_coapprovers,
        approve_ika_message_with_verified_encrypt_as_session_with_coapprovers,
        configure_shared_ika_approvers, encrypt_amount, grant_session, initialize,
        read_mock_message_approval, read_wallet, revoke_session, revoke_shared_ika_approver,
        set_confidential_numeric_policy, set_encrypt_ciphertext_policy, setup_svm, update_wallet,
        write_mock_encrypt_bool_decryption_request, write_mock_encrypt_ciphertext,
        write_mock_ika_account, write_system_account,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const FUTURE_EXPIRY: i64 = 4_102_444_800;

struct OfficialEncryptIkaFixture {
    allowed_output: anchor_lang::prelude::Pubkey,
    daily_spent_output: anchor_lang::prelude::Pubkey,
    allowed_request: anchor_lang::prelude::Pubkey,
}

fn configure_pending_official_encrypt_policy(
    svm: &mut litesvm::LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    allowed: Option<bool>,
) -> OfficialEncryptIkaFixture {
    let max_per_run_ciphertext = Keypair::new().pubkey();
    let daily_cap_ciphertext = Keypair::new().pubkey();
    let daily_spent_ciphertext = Keypair::new().pubkey();
    let allowed_output = Keypair::new().pubkey();
    let daily_spent_output = Keypair::new().pubkey();
    let source_amount = Keypair::new().pubkey();
    let allowed_request = Keypair::new().pubkey();
    let allowed_digest = [0x91u8; 32];

    set_encrypt_ciphertext_policy(
        svm,
        owner,
        wallet_pda,
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
    )
    .expect("set Encrypt ciphertext policy failed");
    update_wallet(svm, wallet_pda, |wallet| {
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_allowed_output = allowed_output;
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_daily_spent_output = daily_spent_output;
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_source_amount = source_amount;
        wallet.usdc_dca_policy.encrypt_ciphertexts.pending_slot = 10_000;
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_policy_seq = wallet.policy_seq;
        wallet.usdc_dca_policy.encrypt_ciphertexts.pending = true;
    });
    write_mock_encrypt_ciphertext(svm, allowed_output, allowed_digest, 0);
    write_mock_encrypt_ciphertext(svm, daily_spent_output, [0x92u8; 32], 4);
    write_mock_encrypt_bool_decryption_request(
        svm,
        allowed_request,
        allowed_output,
        allowed_digest,
        wallet_pda,
        allowed,
    );

    OfficialEncryptIkaFixture {
        allowed_output,
        daily_spent_output,
        allowed_request,
    }
}

#[test]
fn ika_approval_allows_in_limit_order_and_cpi_calls_mock_ika() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x61u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();
    let ika_message_hash = [0xabu8; 32];

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
        ika_message_hash,
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
    assert_eq!(
        &approval_data[1..33],
        &ika_message_hash,
        "mock Ika must receive the Ika Keccak-256 MessageApproval hash"
    );
    assert_eq!(&approval_data[33..65], &[0xedu8; 32]);
    assert_eq!(
        u16::from_le_bytes(approval_data[65..67].try_into().unwrap()),
        5
    );
    assert_eq!(approval_data[67], 9);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.usdc_dca_policy.encrypted_daily_spent,
        encrypt_amount(5, &witness)
    );
}

#[test]
fn official_encrypt_pending_output_cannot_call_mock_ika() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture = configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, None);
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

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x81u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(
        res.is_err(),
        "pending Encrypt output should not approve Ika"
    );
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
    assert!(
        read_wallet(&svm, wallet_pda)
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending
    );
}

#[test]
fn official_encrypt_verified_blocked_output_cannot_call_mock_ika_or_mutate_spend() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(false));
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

    let wallet = read_wallet(&svm, wallet_pda);
    let original_daily_spent = wallet.usdc_dca_policy.encrypt_ciphertexts.daily_spent;
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x82u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(
        res.is_err(),
        "verified blocked Encrypt output should not approve Ika"
    );
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.usdc_dca_policy.encrypt_ciphertexts.daily_spent,
        original_daily_spent
    );
    assert!(wallet.usdc_dca_policy.encrypt_ciphertexts.pending);
}

#[test]
fn official_encrypt_verified_allowed_output_calls_mock_ika_and_consumes_pending_spend() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();
    let ika_message_hash = [0x83u8; 32];

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
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

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        ika_message_hash,
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(
        res.is_ok(),
        "verified allowed Encrypt output should approve Ika: {res:?}"
    );
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 1);
    assert_eq!(
        &read_mock_message_approval(&svm, message_approval)[1..33],
        &ika_message_hash
    );
    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.usdc_dca_policy.encrypt_ciphertexts.daily_spent,
        fixture.daily_spent_output
    );
    assert!(!wallet.usdc_dca_policy.encrypt_ciphertexts.pending);
}

#[test]
fn masked_witness_ika_instruction_is_disabled_when_official_encrypt_policy_is_configured() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x84u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    let _fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
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

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0x84u8; 32],
        5,
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        witness,
    );
    assert!(
        res.is_err(),
        "official Encrypt configured Ika path must not use masked witness approval"
    );
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
}

#[test]
fn official_encrypt_verified_allowed_rejects_stale_policy_sequence_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
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

    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x85u8; 32],
        FUTURE_EXPIRY,
        10_000,
        0,
        &[],
    );
    assert!(res.is_err(), "stale policy sequence should be rejected");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
}

#[test]
fn official_encrypt_verified_allowed_rejects_revoked_session_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");
    revoke_session(&mut svm, &owner, wallet_pda, session_key.pubkey())
        .expect("revoke session failed");
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x86u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(res.is_err(), "revoked session should be rejected");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
}

#[test]
fn official_encrypt_verified_allowed_rejects_expired_order_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
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

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x87u8; 32],
        i64::MIN,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(res.is_err(), "expired order should be rejected");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
}

#[test]
fn official_encrypt_verified_allowed_requires_shared_quorum_before_cpi() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let approver_a = Keypair::new();
    let approver_b = Keypair::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&approver_a.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&approver_b.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture =
        configure_pending_official_encrypt_policy(&mut svm, &owner, wallet_pda, Some(true));
    configure_shared_ika_approvers(
        &mut svm,
        &owner,
        wallet_pda,
        2,
        vec![approver_a.pubkey(), approver_b.pubkey()],
    )
    .expect("configure shared Ika approvers failed");
    update_wallet(&mut svm, wallet_pda, |wallet| {
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_policy_seq = wallet.policy_seq;
    });
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

    let wallet = read_wallet(&svm, wallet_pda);
    let missing_quorum = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x88u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(missing_quorum.is_err(), "missing quorum should be rejected");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);

    let approved = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0x88u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[&approver_a, &approver_b],
    );
    assert!(
        approved.is_ok(),
        "complete quorum should allow verified Ika"
    );
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 1);
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
        wallet.usdc_dca_policy.encrypted_daily_spent,
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

#[test]
fn ika_approval_blocks_until_configured_shared_quorum_signs() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let approver_a = Keypair::new();
    let approver_b = Keypair::new();
    let witness = [0x65u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&approver_a.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&approver_b.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    configure_shared_ika_approvers(
        &mut svm,
        &owner,
        wallet_pda,
        2,
        vec![approver_a.pubkey(), approver_b.pubkey()],
    )
    .expect("configure shared Ika approvers failed");
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

    let wallet = read_wallet(&svm, wallet_pda);
    let missing_quorum = approve_ika_message_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0xefu8; 32],
        5,
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        witness,
    );
    assert!(
        missing_quorum.is_err(),
        "missing shared quorum should block Ika approval"
    );
    assert_eq!(
        read_mock_message_approval(&svm, message_approval)[0],
        0,
        "mock Ika CPI should not be called before quorum"
    );
    assert_eq!(
        read_wallet(&svm, wallet_pda)
            .usdc_dca_policy
            .encrypted_daily_spent,
        encrypt_amount(0, &witness),
        "quorum block should happen before confidential spend mutation"
    );

    let approved = approve_ika_message_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0xefu8; 32],
        5,
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        witness,
        &[&approver_a, &approver_b],
    );
    assert!(approved.is_ok(), "Ika approval should pass after quorum");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 1);
}

#[test]
fn revoked_shared_ika_approver_no_longer_counts_for_quorum() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let revoked = Keypair::new();
    let active = Keypair::new();
    let witness = [0x66u8; 32];
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&revoked.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&active.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    configure_shared_ika_approvers(
        &mut svm,
        &owner,
        wallet_pda,
        2,
        vec![revoked.pubkey(), active.pubkey()],
    )
    .expect("configure shared Ika approvers failed");
    revoke_shared_ika_approver(&mut svm, &owner, wallet_pda, revoked.pubkey())
        .expect("revoke shared Ika approver failed");
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

    let wallet = read_wallet(&svm, wallet_pda);
    let result = approve_ika_message_as_session_with_coapprovers(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        dwallet,
        message_approval,
        [0x77u8; 32],
        5,
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        witness,
        &[&revoked, &active],
    );

    assert!(result.is_err(), "revoked approver should not count");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
}
