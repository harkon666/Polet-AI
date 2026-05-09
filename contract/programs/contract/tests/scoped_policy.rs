use {
    common::{
        encrypt_amount, execute_confidential_as_session,
        execute_policy_gated_custody_trade_as_session, grant_session, initialize,
        read_mock_token_amount, read_wallet, register_demo_custody, set_account_lamports,
        set_sol_transfer_confidential_policy, set_usdc_dca_confidential_policy, setup_svm,
        spl_token_program_id, withdraw_custody, write_mock_mint, write_mock_token_account,
        wsol_mint,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const SOL_WITNESS: [u8; 32] = [0xAAu8; 32];
const DCA_WITNESS: [u8; 32] = [0xBBu8; 32];

// ── Scoped policy setters ────────────────────────────────────────────────────

#[test]
fn set_sol_transfer_policy_only_updates_sol_field() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 20, 0, 0)
        .expect("set sol policy");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.sol_transfer_policy.enabled);
    assert!(!wallet.usdc_dca_policy.enabled, "usdc policy must stay disabled");
    assert_eq!(wallet.policy_seq, 1);
}

#[test]
fn set_usdc_dca_policy_only_updates_usdc_field() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    set_usdc_dca_confidential_policy(&mut svm, &owner, wallet_pda, DCA_WITNESS, 100, 200, 0, 0)
        .expect("set usdc policy");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.usdc_dca_policy.enabled);
    assert!(!wallet.sol_transfer_policy.enabled, "sol policy must stay disabled");
    assert_eq!(wallet.policy_seq, 1);
}

#[test]
fn scoped_policies_have_independent_witness_hashes() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 20, 0, 0)
        .expect("set sol policy");
    set_usdc_dca_confidential_policy(&mut svm, &owner, wallet_pda, DCA_WITNESS, 100, 200, 0, 0)
        .expect("set usdc policy");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_ne!(
        wallet.sol_transfer_policy.encryption_witness_hash,
        wallet.usdc_dca_policy.encryption_witness_hash,
        "different witnesses must produce different hashes"
    );
    assert_eq!(wallet.policy_seq, 2);
}

// ── SOL transfer uses sol_transfer_policy ────────────────────────────────────

#[test]
fn sol_transfer_allowed_under_sol_policy_cap() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 50, 0, 0)
        .expect("sol policy");
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let dest = Keypair::new().pubkey();
    execute_confidential_as_session(
        &mut svm, &session, &session, wallet_pda, dest, 5, 10_000, 1, SOL_WITNESS,
    )
    .expect("transfer under cap should pass");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.sol_transfer_policy.encrypted_daily_spent,
        encrypt_amount(5, &SOL_WITNESS)
    );
}

#[test]
fn sol_transfer_blocked_over_sol_policy_max() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 5, 50, 0, 0)
        .expect("sol policy");
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let dest = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm, &session, &session, wallet_pda, dest, 10, 10_000, 1, SOL_WITNESS,
    );
    assert!(res.is_err(), "over max_per_run should be blocked");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.sol_transfer_policy.encrypted_daily_spent,
        encrypt_amount(0, &SOL_WITNESS),
        "daily spent unchanged on rejection"
    );
}

#[test]
fn sol_transfer_blocked_exceeding_daily_cap() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    // max_per_run=10, daily_cap=20, already spent 15
    set_sol_transfer_confidential_policy(
        &mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 20, 15, 0,
    )
    .expect("sol policy");
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let dest = Keypair::new().pubkey();
    let res = execute_confidential_as_session(
        &mut svm, &session, &session, wallet_pda, dest, 10, 10_000, 1, SOL_WITNESS,
    );
    assert!(res.is_err(), "exceeding daily cap should be blocked");
}

// ── Cross-isolation: USDC policy does not affect SOL transfer ────────────────

#[test]
fn usdc_only_policy_does_not_enable_sol_transfer() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    // Only set USDC DCA policy — leave SOL policy disabled
    set_usdc_dca_confidential_policy(&mut svm, &owner, wallet_pda, DCA_WITNESS, 100, 200, 0, 0)
        .expect("usdc policy");
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let dest = Keypair::new().pubkey();
    // SOL transfer should fail because sol_transfer_policy is not enabled
    let res = execute_confidential_as_session(
        &mut svm, &session, &session, wallet_pda, dest, 5, 10_000, 1, DCA_WITNESS,
    );
    assert!(
        res.is_err(),
        "SOL transfer must fail when only USDC DCA policy is configured"
    );
}

#[test]
fn sol_only_policy_does_not_enable_usdc_dca_trade() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    // Only set SOL policy — leave USDC DCA policy disabled
    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 50, 0, 0)
        .expect("sol policy");
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let output_custody = Keypair::new().pubkey();
    write_mock_mint(&mut svm, usdc_mint, 6);
    write_mock_token_account(&mut svm, usdc_custody, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, output_custody, usdc_mint, wallet_pda, 0);
    register_demo_custody(
        &mut svm, &owner, wallet_pda, usdc_mint, usdc_custody, usdc_mint, output_custody,
    )
    .expect("register custody");

    let wallet = read_wallet(&svm, wallet_pda);
    let res = execute_policy_gated_custody_trade_as_session(
        &mut svm,
        &session,
        &session,
        wallet_pda,
        usdc_custody,
        output_custody,
        usdc_mint,
        5_000_000,
        5_000_000,
        4_999_999,
        100,
        1,
        100,
        wallet.last_revoked_slot + 1,
        wallet.policy_seq,
        SOL_WITNESS,
    );
    assert!(
        res.is_err(),
        "USDC DCA trade must fail when only SOL transfer policy is configured"
    );
    assert_eq!(
        read_mock_token_amount(&svm, usdc_custody),
        25_000_000,
        "custody balance unchanged"
    );
}

// ── Owner withdraw bypasses policy ───────────────────────────────────────────

#[test]
fn owner_withdraw_sol_bypasses_policy_limits() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    // Set very restrictive SOL policy (max 1 lamport)
    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 1, 1, 0, 0)
        .expect("sol policy");

    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let owner_usdc = Keypair::new().pubkey();
    let sol_custody = Keypair::new().pubkey();
    write_mock_token_account(&mut svm, usdc_custody, usdc_mint, wallet_pda, 0);
    write_mock_token_account(&mut svm, owner_usdc, usdc_mint, owner.pubkey(), 0);
    write_mock_token_account(&mut svm, sol_custody, wsol_mint(), wallet_pda, 0);
    register_demo_custody(
        &mut svm, &owner, wallet_pda, usdc_mint, usdc_custody, wsol_mint(), sol_custody,
    )
    .expect("register custody");

    // Fund wallet well above reserve
    let acct = svm.get_account(&wallet_pda).unwrap();
    svm.set_account(
        wallet_pda,
        Account {
            lamports: acct.lamports + 500_000_000,
            data: acct.data,
            owner: contract::id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();

    // Owner withdraws 200M lamports — far exceeds policy max of 1
    withdraw_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_custody,
        owner_usdc,
        usdc_mint,
        spl_token_program_id(),
        "SOL",
        200_000_000,
    )
    .expect("owner withdraw must bypass policy limits");
}

#[test]
fn owner_withdraw_usdc_bypasses_policy_limits() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    // Set very restrictive USDC DCA policy (max 1 unit)
    set_usdc_dca_confidential_policy(&mut svm, &owner, wallet_pda, DCA_WITNESS, 1, 1, 0, 0)
        .expect("usdc policy");

    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let owner_usdc = Keypair::new().pubkey();
    let sol_custody = Keypair::new().pubkey();
    write_mock_mint(&mut svm, usdc_mint, 6);
    write_mock_token_account(&mut svm, usdc_custody, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, owner_usdc, usdc_mint, owner.pubkey(), 0);
    write_mock_token_account(&mut svm, sol_custody, wsol_mint(), wallet_pda, 0);
    register_demo_custody(
        &mut svm, &owner, wallet_pda, usdc_mint, usdc_custody, wsol_mint(), sol_custody,
    )
    .expect("register custody");

    // Owner withdraws 10M units — far exceeds policy max
    withdraw_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_custody,
        owner_usdc,
        usdc_mint,
        spl_token_program_id(),
        "USDC",
        10_000_000,
    )
    .expect("owner USDC withdraw must bypass policy limits");

    assert_eq!(read_mock_token_amount(&svm, usdc_custody), 15_000_000);
    assert_eq!(read_mock_token_amount(&svm, owner_usdc), 10_000_000);
}

// ── Session key cannot call withdraw ─────────────────────────────────────────

#[test]
fn session_key_cannot_call_withdraw_custody() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");

    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let session_usdc = Keypair::new().pubkey();
    let sol_custody = Keypair::new().pubkey();
    write_mock_token_account(&mut svm, usdc_custody, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, session_usdc, usdc_mint, session.pubkey(), 0);
    write_mock_token_account(&mut svm, sol_custody, wsol_mint(), wallet_pda, 0);
    register_demo_custody(
        &mut svm, &owner, wallet_pda, usdc_mint, usdc_custody, wsol_mint(), sol_custody,
    )
    .expect("register custody");

    // Session key tries to withdraw — has_one = owner check should reject
    let res = withdraw_custody(
        &mut svm,
        &session, // NOT the owner
        wallet_pda,
        usdc_custody,
        session_usdc,
        usdc_mint,
        spl_token_program_id(),
        "SOL",
        1,
    );
    assert!(
        res.is_err(),
        "session key must not be able to call withdraw_custody"
    );
}

// ── Both policies active, independent daily tracking ─────────────────────────

#[test]
fn both_policies_track_daily_spent_independently() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let session = Keypair::new();
    svm.airdrop(&session.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);

    // SOL: max_per_run=10, daily_cap=20
    set_sol_transfer_confidential_policy(&mut svm, &owner, wallet_pda, SOL_WITNESS, 10, 20, 0, 0)
        .expect("sol policy");
    // USDC: max_per_run=10M, daily_cap=20M  (uses different witness)
    set_usdc_dca_confidential_policy(
        &mut svm, &owner, wallet_pda, DCA_WITNESS, 10_000_000, 20_000_000, 0, 0,
    )
    .expect("usdc policy");

    grant_session(&mut svm, &owner, wallet_pda, session.pubkey(), 4_102_444_800)
        .expect("grant session");
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    // Execute SOL transfer — read live policy_seq for attestation
    let wallet = read_wallet(&svm, wallet_pda);
    let dest = Keypair::new().pubkey();
    execute_confidential_as_session(
        &mut svm, &session, &session, wallet_pda, dest, 7, 10_000, wallet.policy_seq, SOL_WITNESS,
    )
    .expect("SOL transfer");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.sol_transfer_policy.encrypted_daily_spent,
        encrypt_amount(7, &SOL_WITNESS),
        "SOL daily spent updated"
    );
    assert_eq!(
        wallet.usdc_dca_policy.encrypted_daily_spent,
        encrypt_amount(0, &DCA_WITNESS),
        "USDC daily spent untouched after SOL transfer"
    );
}
