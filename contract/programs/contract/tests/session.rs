use {
    common::{
        execute_as_session, grant_session, initialize, read_wallet, revoke_all_sessions,
        revoke_session, set_policy, set_policy_commitment, setup_svm,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

#[test]
fn owner_can_grant_and_revoke_session_key() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    initialize(&mut svm, &owner, wallet_pda);

    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.sessions.len(), 1);
    assert_eq!(wallet.sessions[0].key, session_key.pubkey());
    assert!(wallet.sessions[0].authorized);

    revoke_session(&mut svm, &owner, wallet_pda, session_key.pubkey())
        .expect("revoke session failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(!wallet.sessions[0].authorized);
}

#[test]
fn session_execution_requires_authorized_unexpired_session_and_current_policy() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        10_000,
        1,
    );
    assert!(
        res.is_ok(),
        "valid session execution should pass: {:?}",
        res
    );
}

#[test]
fn session_execution_rejects_missing_session() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        1,
        1,
    );
    assert!(res.is_err(), "unknown session key should be rejected");
}

#[test]
fn session_execution_rejects_expired_session() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);

    let res = grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        i64::MIN + 1,
    );
    assert!(res.is_err(), "expired session grant should be rejected");
}

#[test]
fn session_execution_rejects_individually_revoked_session() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    revoke_session(&mut svm, &owner, wallet_pda, session_key.pubkey())
        .expect("revoke session failed");
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        10_000,
        1,
    );
    assert!(res.is_err(), "revoked session should be rejected");
}

#[test]
fn revoke_all_sessions_kill_switch_invalidates_existing_session() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");

    svm.warp_to_slot(100);
    revoke_all_sessions(&mut svm, &owner, wallet_pda).expect("revoke all failed");
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        200,
        1,
    );
    assert!(res.is_err(), "globally stale session should be rejected");
}

#[test]
fn stale_policy_sequence_is_rejected() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_policy(&mut svm, &owner, wallet_pda);
    set_policy_commitment(&mut svm, &owner, wallet_pda, [0xcdu8; 32]);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        4_102_444_800,
    )
    .expect("grant session failed");
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    let destination = Keypair::new().pubkey();
    let res = execute_as_session(
        &mut svm,
        &session_key,
        &session_key,
        wallet_pda,
        destination,
        10_000,
        1,
    );
    assert!(res.is_err(), "old policy_seq should be rejected");
}
