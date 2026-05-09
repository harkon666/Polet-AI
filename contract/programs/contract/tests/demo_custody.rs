use {
    common::{
        initialize, read_wallet, register_demo_custody, setup_svm, spl_token_program_id,
        write_mock_token_account, wsol_mint, withdraw_custody,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

#[test]
fn owner_can_register_pda_owned_demo_token_custody() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_token_account = Keypair::new().pubkey();
    let sol_token_account = Keypair::new().pubkey();
    write_mock_token_account(
        &mut svm,
        usdc_token_account,
        usdc_mint,
        wallet_pda,
        25_000_000,
    );
    write_mock_token_account(&mut svm, sol_token_account, wsol_mint(), wallet_pda, 0);

    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_token_account,
        wsol_mint(),
        sol_token_account,
    )
    .expect("register demo custody should pass");

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.demo_custody.configured);
    assert_eq!(wallet.demo_custody.usdc_mint, usdc_mint);
    assert_eq!(wallet.demo_custody.usdc_token_account, usdc_token_account);
    assert_eq!(wallet.demo_custody.sol_mint, wsol_mint());
    assert_eq!(wallet.demo_custody.sol_token_account, sol_token_account);
    assert_eq!(wallet.demo_custody.token_program, spl_token_program_id());
}

#[test]
fn demo_custody_rejects_token_account_not_owned_by_wallet_pda() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_token_account = Keypair::new().pubkey();
    let sol_token_account = Keypair::new().pubkey();
    let attacker_authority = Keypair::new().pubkey();
    write_mock_token_account(
        &mut svm,
        usdc_token_account,
        usdc_mint,
        attacker_authority,
        25_000_000,
    );
    write_mock_token_account(&mut svm, sol_token_account, wsol_mint(), wallet_pda, 0);

    let res = register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_token_account,
        wsol_mint(),
        sol_token_account,
    );
    assert!(
        res.is_err(),
        "custody account under direct owner/attacker authority must be rejected"
    );

    let wallet = read_wallet(&svm, wallet_pda);
    assert!(!wallet.demo_custody.configured);
}

// ── Withdraw custody tests ─────────────────────────────────────────────────────

#[test]
fn owner_can_withdraw_native_sol_preserving_reserve() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_token_account = Keypair::new().pubkey();
    let sol_token_account = Keypair::new().pubkey();
    write_mock_token_account(&mut svm, usdc_token_account, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, sol_token_account, wsol_mint(), wallet_pda, 0);

    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_token_account,
        wsol_mint(),
        sol_token_account,
    )
    .expect("register demo custody should pass");

    // Fund wallet PDA with native SOL (rent + deposit)
    let wallet_account = svm.get_account(&wallet_pda).expect("wallet must exist");
    let wallet_lamports_before = wallet_account.lamports;
    let deposit_amount = 200_000_000; // 0.2 SOL
    svm.set_account(
        wallet_pda,
        Account {
            lamports: wallet_lamports_before + deposit_amount,
            data: wallet_account.data,
            owner: contract::id(), // PDA owned by contract program
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("failed to fund wallet");

    let withdraw_amount = 100_000_000; // 0.1 SOL
    withdraw_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_token_account,
        spl_token_program_id(),
        "SOL",
        withdraw_amount,
    )
    .expect("owner SOL withdraw should pass");

    let wallet_after = read_wallet(&svm, wallet_pda);
    let wallet_lamports_after = svm.get_account(&wallet_pda).unwrap().lamports;
    let min_reserve: u64 = 50_000_000;
    assert!(
        wallet_lamports_after >= wallet_lamports_before + deposit_amount - withdraw_amount,
        "wallet should have received deposit minus withdraw"
    );
    assert!(
        wallet_lamports_after >= min_reserve,
        "wallet lamports should preserve minimum 0.05 SOL reserve"
    );
    assert_eq!(
        wallet_after.demo_custody.configured, true,
        "custody config should remain after withdraw"
    );
}

#[test]
fn owner_cannot_withdraw_more_than_available_sol() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_token_account = Keypair::new().pubkey();
    let sol_token_account = Keypair::new().pubkey();
    write_mock_token_account(&mut svm, usdc_token_account, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, sol_token_account, wsol_mint(), wallet_pda, 0);
    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_token_account,
        wsol_mint(),
        sol_token_account,
    )
    .expect("register demo custody should pass");

    // Fund wallet with exactly 0.06 SOL
    let wallet_account = svm.get_account(&wallet_pda).expect("wallet must exist");
    let wallet_lamports_before = wallet_account.lamports;
    let deposit_amount: u64 = 60_000_000; // 0.06 SOL — only 0.01 above reserve
    svm.set_account(
        wallet_pda,
        Account {
            lamports: wallet_lamports_before + deposit_amount,
            data: wallet_account.data,
            owner: contract::id(), // PDA owned by contract program
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("failed to fund wallet");

    // Try to withdraw 0.05 SOL — available = 0.01 SOL, should fail
    let res = withdraw_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_token_account,
        spl_token_program_id(),
        "SOL",
        50_000_000, // 0.05 SOL — more than 0.01 available
    );
    assert!(res.is_err(), "withdraw exceeding available balance must be rejected");

    // Wallet state unchanged
    let wallet_after = svm.get_account(&wallet_pda).unwrap();
    assert_eq!(
        wallet_after.lamports,
        wallet_lamports_before + deposit_amount,
        "wallet lamports should be unchanged after failed withdraw"
    );
}

#[test]
fn non_owner_cannot_withdraw_custody() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let usdc_mint = Keypair::new().pubkey();
    let usdc_token_account = Keypair::new().pubkey();
    let sol_token_account = Keypair::new().pubkey();
    write_mock_token_account(&mut svm, usdc_token_account, usdc_mint, wallet_pda, 25_000_000);
    write_mock_token_account(&mut svm, sol_token_account, wsol_mint(), wallet_pda, 0);
    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_token_account,
        wsol_mint(),
        sol_token_account,
    )
    .expect("register demo custody should pass");

    // Fund wallet
    let wallet_account = svm.get_account(&wallet_pda).expect("wallet must exist");
    let wallet_lamports_before = wallet_account.lamports;
    svm.set_account(
        wallet_pda,
        Account {
            lamports: wallet_lamports_before + 200_000_000,
            data: wallet_account.data,
            owner: contract::id(), // PDA owned by contract program
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("failed to fund wallet");

    // Attacker key — not the owner
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    let res = withdraw_custody(
        &mut svm,
        &attacker,
        wallet_pda,
        usdc_token_account,
        spl_token_program_id(),
        "SOL",
        10_000_000,
    );
    assert!(res.is_err(), "non-owner withdraw must be rejected by contract");
}

#[test]
fn withdraw_custody_rejects_unconfigured_custody() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);
    // No register_demo_custody — custody not configured

    let usdc_token_account = Keypair::new().pubkey();
    let res = withdraw_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_token_account,
        spl_token_program_id(),
        "SOL",
        10_000_000,
    );
    assert!(res.is_err(), "withdraw on unconfigured custody must fail");
}
