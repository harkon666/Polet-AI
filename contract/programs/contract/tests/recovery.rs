use {
    common::{
        grant_session, initialize, read_wallet, recover_wallet_access, set_recovery_authority,
        setup_svm,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const FUTURE_EXPIRY: i64 = 4_102_444_800;

#[test]
fn recovery_authority_revokes_compromised_sessions_and_rotates_shared_access() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let recovery_authority = Keypair::new();
    let compromised_session = Keypair::new();
    let healthy_session = Keypair::new();
    let approver_a = Keypair::new();
    let approver_b = Keypair::new();
    let pending_dwallet_controller = Keypair::new().pubkey();

    svm.airdrop(&recovery_authority.pubkey(), 1_000_000_000)
        .unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_recovery_authority(&mut svm, &owner, wallet_pda, recovery_authority.pubkey())
        .expect("set recovery authority failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        compromised_session.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant compromised session failed");
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        healthy_session.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant healthy session failed");

    svm.warp_to_slot(50);
    recover_wallet_access(
        &mut svm,
        &recovery_authority,
        wallet_pda,
        vec![compromised_session.pubkey()],
        2,
        vec![approver_a.pubkey(), approver_b.pubkey()],
        pending_dwallet_controller,
    )
    .expect("recovery should pass");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(!wallet.sessions[0].authorized);
    assert!(wallet.sessions[1].authorized);
    assert_eq!(wallet.last_revoked_slot, 50);
    assert_eq!(wallet.shared_ika_approvals.threshold, 2);
    assert!(wallet.shared_ika_approvals.enabled);
    assert_eq!(wallet.shared_ika_approvals.approvers.len(), 2);
    assert!(wallet.shared_ika_approvals.approvers[0].authorized);
    assert_eq!(
        wallet.dwallet_controller.pending_controller,
        pending_dwallet_controller
    );
    assert!(wallet.dwallet_controller.migration_pending);
    assert_eq!(wallet.dwallet_controller.rotation_seq, 1);
    assert_eq!(
        wallet.confidential_policy.encrypted_max_per_run, 0,
        "recovery must not rewrite private policy values"
    );
}

#[test]
fn owner_can_run_recovery_without_separate_recovery_authority() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let compromised_session = Keypair::new();
    let approver = Keypair::new();
    let pending_dwallet_controller = Keypair::new().pubkey();

    initialize(&mut svm, &owner, wallet_pda);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        compromised_session.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant compromised session failed");

    let res = recover_wallet_access(
        &mut svm,
        &owner,
        wallet_pda,
        vec![compromised_session.pubkey()],
        1,
        vec![approver.pubkey()],
        pending_dwallet_controller,
    );
    assert!(res.is_ok(), "owner recovery should pass: {res:?}");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(!wallet.sessions[0].authorized);
    assert_eq!(
        wallet.shared_ika_approvals.approvers[0].key,
        approver.pubkey()
    );
}

#[test]
fn unauthorized_recovery_signer_is_blocked() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let attacker = Keypair::new();
    let compromised_session = Keypair::new();
    let approver = Keypair::new();

    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        compromised_session.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant compromised session failed");

    let res = recover_wallet_access(
        &mut svm,
        &attacker,
        wallet_pda,
        vec![compromised_session.pubkey()],
        1,
        vec![approver.pubkey()],
        Keypair::new().pubkey(),
    );
    assert!(res.is_err(), "unauthorized recovery must be blocked");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.sessions[0].authorized);
    assert!(!wallet.shared_ika_approvals.enabled);
}
