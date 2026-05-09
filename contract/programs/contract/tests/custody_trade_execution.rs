use {
    common::{
        execute_policy_gated_custody_trade_as_session, grant_session, initialize,
        read_mock_token_amount, read_wallet, register_demo_custody, revoke_session,
        set_account_lamports, set_confidential_numeric_policy, setup_svm, write_mock_mint,
        write_mock_token_account,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const WITNESS: [u8; 32] = [9u8; 32];
const NOW_PLUS_ONE_DAY: i64 = 1_700_086_400;

struct Fixture {
    owner: Keypair,
    session_key: Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    usdc_mint: anchor_lang::prelude::Pubkey,
    usdc_custody: anchor_lang::prelude::Pubkey,
    output_custody: anchor_lang::prelude::Pubkey,
}

fn setup_trade_fixture(
    max_per_run: u64,
    daily_cap: u64,
    daily_spent: u64,
    source_balance: u64,
    output_balance: u64,
) -> (litesvm::LiteSVM, Fixture) {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);
    set_account_lamports(&mut svm, wallet_pda, 100_000_000);

    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();
    grant_session(
        &mut svm,
        &owner,
        wallet_pda,
        session_key.pubkey(),
        NOW_PLUS_ONE_DAY,
    )
    .expect("grant session");
    set_confidential_numeric_policy(
        &mut svm,
        &owner,
        wallet_pda,
        WITNESS,
        max_per_run,
        daily_cap,
        daily_spent,
        0,
    )
    .expect("set policy");

    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let output_custody = Keypair::new().pubkey();
    write_mock_mint(&mut svm, usdc_mint, 6);
    write_mock_token_account(
        &mut svm,
        usdc_custody,
        usdc_mint,
        wallet_pda,
        source_balance,
    );
    write_mock_token_account(
        &mut svm,
        output_custody,
        usdc_mint,
        wallet_pda,
        output_balance,
    );
    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_custody,
        usdc_mint,
        output_custody,
    )
    .expect("register custody");

    (
        svm,
        Fixture {
            owner,
            session_key,
            wallet_pda,
            usdc_mint,
            usdc_custody,
            output_custody,
        },
    )
}

fn execute_default_trade(
    svm: &mut litesvm::LiteSVM,
    fixture: &Fixture,
    amount: u64,
) -> Result<(), String> {
    let wallet = read_wallet(svm, fixture.wallet_pda);
    execute_policy_gated_custody_trade_as_session(
        svm,
        &fixture.session_key,
        &fixture.session_key,
        fixture.wallet_pda,
        fixture.usdc_custody,
        fixture.output_custody,
        fixture.usdc_mint,
        amount,
        amount,
        amount.saturating_sub(1),
        100,
        1,
        100,
        wallet.last_revoked_slot + 1,
        wallet.policy_seq,
        WITNESS,
    )
}

#[test]
fn allowed_execution_spends_from_custody_and_updates_daily_spent_atomically() {
    let (mut svm, fixture) = setup_trade_fixture(10_000_000, 20_000_000, 0, 25_000_000, 0);

    execute_default_trade(&mut svm, &fixture, 5_000_000).expect("allowed trade");

    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        20_000_000
    );
    assert_eq!(
        read_mock_token_amount(&svm, fixture.output_custody),
        5_000_000
    );
}

#[test]
fn over_cap_execution_fails_without_spending_or_updating_daily_state() {
    let (mut svm, fixture) = setup_trade_fixture(10_000_000, 20_000_000, 18_000_000, 25_000_000, 0);
    let before = read_wallet(&svm, fixture.wallet_pda)
        .confidential_policy
        .encrypted_daily_spent;

    let res = execute_default_trade(&mut svm, &fixture, 5_000_000);

    assert!(res.is_err(), "over daily cap must fail");
    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        25_000_000
    );
    assert_eq!(
        read_wallet(&svm, fixture.wallet_pda)
            .confidential_policy
            .encrypted_daily_spent,
        before
    );
}

#[test]
fn stale_quote_execution_fails_before_custody_spend() {
    let (mut svm, fixture) = setup_trade_fixture(10_000_000, 20_000_000, 0, 25_000_000, 0);
    let wallet = read_wallet(&svm, fixture.wallet_pda);
    svm.warp_to_slot(250);

    let res = execute_policy_gated_custody_trade_as_session(
        &mut svm,
        &fixture.session_key,
        &fixture.session_key,
        fixture.wallet_pda,
        fixture.usdc_custody,
        fixture.output_custody,
        fixture.usdc_mint,
        5_000_000,
        5_000_000,
        4_950_000,
        100,
        1,
        10,
        wallet.last_revoked_slot + 1,
        wallet.policy_seq,
        WITNESS,
    );

    assert!(res.is_err(), "stale quote must fail");
    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        25_000_000
    );
}

#[test]
fn min_native_sol_reserve_failure_blocks_execution() {
    let (mut svm, fixture) = setup_trade_fixture(10_000_000, 20_000_000, 0, 25_000_000, 0);
    set_account_lamports(&mut svm, fixture.wallet_pda, 49_000_000);

    let res = execute_default_trade(&mut svm, &fixture, 5_000_000);

    assert!(res.is_err(), "reserve violation must fail");
    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        25_000_000
    );
}

#[test]
fn revoked_session_cannot_execute_pending_quote() {
    let (mut svm, fixture) = setup_trade_fixture(10_000_000, 20_000_000, 0, 25_000_000, 0);
    revoke_session(
        &mut svm,
        &fixture.owner,
        fixture.wallet_pda,
        fixture.session_key.pubkey(),
    )
    .expect("revoke session");

    let res = execute_default_trade(&mut svm, &fixture, 5_000_000);

    assert!(res.is_err(), "revoked session must fail");
    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        25_000_000
    );
}

#[test]
fn concurrent_previews_are_advisory_second_over_cap_execution_fails() {
    let (mut svm, fixture) = setup_trade_fixture(15_000_000, 20_000_000, 0, 30_000_000, 0);

    execute_default_trade(&mut svm, &fixture, 12_000_000).expect("first preview execution wins");
    let second = execute_default_trade(&mut svm, &fixture, 12_000_000);

    assert!(
        second.is_err(),
        "second execution must see updated daily spent"
    );
    assert_eq!(
        read_mock_token_amount(&svm, fixture.usdc_custody),
        18_000_000
    );
    assert_eq!(
        read_mock_token_amount(&svm, fixture.output_custody),
        12_000_000
    );
}
