use {
    common::{
        initialize, read_wallet, register_demo_custody, setup_svm, spl_token_program_id,
        write_mock_token_account, wsol_mint,
    },
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
