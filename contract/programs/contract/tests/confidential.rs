use {
    common::{
        encrypt_amount, execute_confidential_as_session, grant_session, initialize, read_wallet,
        set_confidential_numeric_policy, set_encrypt_ciphertext_policy,
        set_official_encrypt_ciphertext_policy, setup_svm, write_official_encrypt_ciphertext,
        write_system_account,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

#[test]
fn owner_can_record_official_encrypt_ciphertext_policy_identifiers() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let max_per_run_ciphertext = Keypair::new().pubkey();
    let daily_cap_ciphertext = Keypair::new().pubkey();
    let daily_spent_ciphertext = Keypair::new().pubkey();

    initialize(&mut svm, &owner, wallet_pda);
    set_encrypt_ciphertext_policy(
        &mut svm,
        &owner,
        wallet_pda,
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
    )
    .expect("set Encrypt ciphertext policy failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.confidential_policy.enabled);
    assert!(wallet.confidential_policy.encrypt_ciphertexts.configured);
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.max_per_run,
        max_per_run_ciphertext
    );
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.daily_cap,
        daily_cap_ciphertext
    );
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.daily_spent,
        daily_spent_ciphertext
    );
    assert!(!wallet.confidential_policy.encrypt_ciphertexts.pending);
    assert_eq!(wallet.policy_seq, 1);
}

#[test]
fn owner_can_accept_official_encrypt_ciphertext_accounts_with_encrypt_context_accounts() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let payer = Keypair::new();
    let max_per_run_ciphertext = Keypair::new().pubkey();
    let daily_cap_ciphertext = Keypair::new().pubkey();
    let daily_spent_ciphertext = Keypair::new().pubkey();
    let encrypt_program = contract::encrypt_prealpha::ENCRYPT_PREALPHA_PROGRAM_ID;
    let config = Keypair::new().pubkey();
    let deposit = Keypair::new().pubkey();
    let network_encryption_key = Keypair::new().pubkey();
    let event_authority = Keypair::new().pubkey();

    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    write_official_encrypt_ciphertext(&mut svm, max_per_run_ciphertext, encrypt_program);
    write_official_encrypt_ciphertext(&mut svm, daily_cap_ciphertext, encrypt_program);
    write_official_encrypt_ciphertext(&mut svm, daily_spent_ciphertext, encrypt_program);
    write_system_account(&mut svm, config);
    write_system_account(&mut svm, deposit);
    write_system_account(&mut svm, network_encryption_key);
    write_system_account(&mut svm, event_authority);

    set_official_encrypt_ciphertext_policy(
        &mut svm,
        &owner,
        &payer,
        wallet_pda,
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
        encrypt_program,
        config,
        deposit,
        network_encryption_key,
        event_authority,
    )
    .expect("set official Encrypt ciphertext policy failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.confidential_policy.enabled);
    assert!(wallet.confidential_policy.encrypt_ciphertexts.configured);
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.max_per_run,
        max_per_run_ciphertext
    );
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.daily_cap,
        daily_cap_ciphertext
    );
    assert_eq!(
        wallet.confidential_policy.encrypt_ciphertexts.daily_spent,
        daily_spent_ciphertext
    );
    assert_eq!(wallet.policy_seq, 1);
}

#[test]
fn official_encrypt_policy_setup_rejects_non_encrypt_owned_ciphertext_accounts() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let payer = Keypair::new();
    let max_per_run_ciphertext = Keypair::new().pubkey();
    let daily_cap_ciphertext = Keypair::new().pubkey();
    let daily_spent_ciphertext = Keypair::new().pubkey();
    let encrypt_program = contract::encrypt_prealpha::ENCRYPT_PREALPHA_PROGRAM_ID;
    let config = Keypair::new().pubkey();
    let deposit = Keypair::new().pubkey();
    let network_encryption_key = Keypair::new().pubkey();
    let event_authority = Keypair::new().pubkey();

    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    write_system_account(&mut svm, max_per_run_ciphertext);
    write_official_encrypt_ciphertext(&mut svm, daily_cap_ciphertext, encrypt_program);
    write_official_encrypt_ciphertext(&mut svm, daily_spent_ciphertext, encrypt_program);
    write_system_account(&mut svm, config);
    write_system_account(&mut svm, deposit);
    write_system_account(&mut svm, network_encryption_key);
    write_system_account(&mut svm, event_authority);

    let res = set_official_encrypt_ciphertext_policy(
        &mut svm,
        &owner,
        &payer,
        wallet_pda,
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
        encrypt_program,
        config,
        deposit,
        network_encryption_key,
        event_authority,
    );

    assert!(
        res.is_err(),
        "official Encrypt policy setup must reject ciphertext accounts not owned by Encrypt"
    );
    let wallet = read_wallet(&svm, wallet_pda);
    assert!(!wallet.confidential_policy.encrypt_ciphertexts.configured);
}

#[test]
fn confidential_policy_allows_in_limit_action_and_updates_daily_spent() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x17u8; 32];
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        5,
        10_000,
        1,
        witness,
    );
    assert!(
        res.is_ok(),
        "in-limit confidential action should pass: {res:?}"
    );

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(5, &witness)
    );
    assert!(wallet.confidential_policy.spent_day_index >= 0);
}

#[test]
fn confidential_policy_blocks_action_above_max_per_run_without_updating_spent() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x29u8; 32];
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        25,
        10_000,
        1,
        witness,
    );
    assert!(res.is_err(), "over max-per-run action should be blocked");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(0, &witness)
    );
}

#[test]
fn confidential_policy_blocks_action_that_would_exceed_daily_cap() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x31u8; 32];
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 15, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        10,
        10_000,
        1,
        witness,
    );
    assert!(res.is_err(), "daily cap overflow should be blocked");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(15, &witness)
    );
}

#[test]
fn confidential_policy_resets_daily_spent_when_day_changes() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x43u8; 32];
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 20, -1)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        5,
        10_000,
        1,
        witness,
    );
    assert!(
        res.is_ok(),
        "stale daily spent should reset before applying action: {res:?}"
    );

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.confidential_policy.encrypted_daily_spent,
        encrypt_amount(5, &witness)
    );
}

#[test]
fn confidential_policy_rejects_invalid_witness_without_revealing_threshold() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    let witness = [0x53u8; 32];
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_confidential_numeric_policy(&mut svm, &owner, wallet_pda, witness, 10, 20, 0, 0)
        .expect("set confidential policy failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        5,
        10_000,
        1,
        [0x54u8; 32],
    );
    assert!(res.is_err(), "invalid witness should be rejected");
}
