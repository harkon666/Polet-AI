use {
    common::{
        execute_confidential_usdc_transfer_as_session, grant_session, initialize,
        read_mock_token_amount, read_wallet, register_demo_custody, set_account_lamports,
        set_encrypt_ciphertext_policy, setup_svm, update_wallet, write_mock_encrypt_bool_decryption_request,
        write_mock_encrypt_ciphertext, write_mock_mint, write_mock_token_account,
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const FUTURE_EXPIRY: i64 = 4_102_444_800;

struct UsdcTransferFixture {
    _owner: Keypair,
    session_key: Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    usdc_mint: anchor_lang::prelude::Pubkey,
    usdc_custody: anchor_lang::prelude::Pubkey,
    destination_usdc_account: anchor_lang::prelude::Pubkey,
    allowed_output: anchor_lang::prelude::Pubkey,
    daily_spent_output: anchor_lang::prelude::Pubkey,
    allowed_request: anchor_lang::prelude::Pubkey,
    attestation_slot: u64,
}

/// Build a wallet with a FHE-configured USDC DCA policy whose pending allowed-output state has
/// been decoded to `allowed` (Some(true)=allow, Some(false)=block, None=still pending).
fn setup_usdc_transfer_fixture(
    source_balance: u64,
    allowed: Option<bool>,
) -> (litesvm::LiteSVM, UsdcTransferFixture) {
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
        FUTURE_EXPIRY,
    )
    .expect("grant session");

    // Register demo custody with a USDC mint and PDA-owned custody ATA, reusing the mint as the
    // sol_mint slot too (the USDC transfer instruction only reads usdc_*, ignoring sol_*).
    let usdc_mint = Keypair::new().pubkey();
    let usdc_custody = Keypair::new().pubkey();
    let sol_custody = Keypair::new().pubkey();
    write_mock_mint(&mut svm, usdc_mint, 6);
    write_mock_token_account(&mut svm, usdc_custody, usdc_mint, wallet_pda, source_balance);
    write_mock_token_account(&mut svm, sol_custody, usdc_mint, wallet_pda, 0);
    register_demo_custody(
        &mut svm,
        &owner,
        wallet_pda,
        usdc_mint,
        usdc_custody,
        usdc_mint,
        sol_custody,
    )
    .expect("register custody");

    // Destination USDC ATA owned by a third-party wallet (authority != wallet PDA).
    let destination_authority = Keypair::new().pubkey();
    let destination_usdc_account = Keypair::new().pubkey();
    write_mock_token_account(
        &mut svm,
        destination_usdc_account,
        usdc_mint,
        destination_authority,
        0,
    );

    // Set up an Encrypt ciphertext policy + pending FHE graph output state on the usdc_dca_policy.
    let max_per_run_ciphertext = Keypair::new().pubkey();
    let daily_cap_ciphertext = Keypair::new().pubkey();
    let daily_spent_ciphertext = Keypair::new().pubkey();
    let allowed_output = Keypair::new().pubkey();
    let daily_spent_output = Keypair::new().pubkey();
    let source_amount = Keypair::new().pubkey();
    let allowed_request = Keypair::new().pubkey();
    let allowed_digest = [0x91u8; 32];

    set_encrypt_ciphertext_policy(
        &mut svm,
        &owner,
        wallet_pda,
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
    )
    .expect("set Encrypt ciphertext policy");

    let attestation_slot = 10_000u64;
    update_wallet(&mut svm, wallet_pda, |wallet| {
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
        wallet.usdc_dca_policy.encrypt_ciphertexts.pending_slot = attestation_slot;
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_policy_seq = wallet.policy_seq;
        wallet.usdc_dca_policy.encrypt_ciphertexts.pending = true;
    });

    write_mock_encrypt_ciphertext(&mut svm, allowed_output, allowed_digest, 0);
    write_mock_encrypt_ciphertext(&mut svm, daily_spent_output, [0x92u8; 32], 4);
    write_mock_encrypt_bool_decryption_request(
        &mut svm,
        allowed_request,
        allowed_output,
        allowed_digest,
        wallet_pda,
        allowed,
    );

    (
        svm,
        UsdcTransferFixture {
            _owner: owner,
            session_key,
            wallet_pda,
            usdc_mint,
            usdc_custody,
            destination_usdc_account,
            allowed_output,
            daily_spent_output,
            allowed_request,
            attestation_slot,
        },
    )
}

#[test]
fn fhe_verified_allowed_output_executes_usdc_transfer() {
    let (mut svm, fx) = setup_usdc_transfer_fixture(50_000_000, Some(true));
    let wallet = read_wallet(&svm, fx.wallet_pda);
    let transfer_amount = 5_000_000u64;

    let res = execute_confidential_usdc_transfer_as_session(
        &mut svm,
        &fx.session_key,
        &fx.session_key,
        fx.wallet_pda,
        fx.usdc_custody,
        fx.destination_usdc_account,
        fx.usdc_mint,
        fx.allowed_output,
        fx.daily_spent_output,
        fx.allowed_request,
        transfer_amount,
        fx.attestation_slot,
        wallet.policy_seq,
    );
    assert!(res.is_ok(), "FHE-verified-allowed USDC transfer should succeed: {res:?}");

    assert_eq!(
        read_mock_token_amount(&svm, fx.usdc_custody),
        50_000_000 - transfer_amount,
        "custody must be debited by the transfer amount",
    );
    assert_eq!(
        read_mock_token_amount(&svm, fx.destination_usdc_account),
        transfer_amount,
        "destination must be credited by the transfer amount",
    );

    let wallet_after = read_wallet(&svm, fx.wallet_pda);
    assert!(
        !wallet_after.usdc_dca_policy.encrypt_ciphertexts.pending,
        "pending FHE state must clear after consumption",
    );
    assert_eq!(
        wallet_after.usdc_dca_policy.encrypt_ciphertexts.daily_spent, fx.daily_spent_output,
        "daily_spent ciphertext must rotate to the pending daily_spent_output",
    );
}

#[test]
fn fhe_verified_blocked_output_rejects_usdc_transfer() {
    let (mut svm, fx) = setup_usdc_transfer_fixture(50_000_000, Some(false));
    let wallet = read_wallet(&svm, fx.wallet_pda);

    let res = execute_confidential_usdc_transfer_as_session(
        &mut svm,
        &fx.session_key,
        &fx.session_key,
        fx.wallet_pda,
        fx.usdc_custody,
        fx.destination_usdc_account,
        fx.usdc_mint,
        fx.allowed_output,
        fx.daily_spent_output,
        fx.allowed_request,
        5_000_000,
        fx.attestation_slot,
        wallet.policy_seq,
    );
    assert!(res.is_err(), "FHE-verified-blocked must fail");

    // Balances unchanged, pending state retained.
    assert_eq!(read_mock_token_amount(&svm, fx.usdc_custody), 50_000_000);
    assert_eq!(read_mock_token_amount(&svm, fx.destination_usdc_account), 0);
    assert!(read_wallet(&svm, fx.wallet_pda)
        .usdc_dca_policy
        .encrypt_ciphertexts
        .pending);
}

#[test]
fn fhe_still_pending_rejects_usdc_transfer() {
    let (mut svm, fx) = setup_usdc_transfer_fixture(50_000_000, None);
    let wallet = read_wallet(&svm, fx.wallet_pda);

    let res = execute_confidential_usdc_transfer_as_session(
        &mut svm,
        &fx.session_key,
        &fx.session_key,
        fx.wallet_pda,
        fx.usdc_custody,
        fx.destination_usdc_account,
        fx.usdc_mint,
        fx.allowed_output,
        fx.daily_spent_output,
        fx.allowed_request,
        5_000_000,
        fx.attestation_slot,
        wallet.policy_seq,
    );
    assert!(res.is_err(), "pending FHE decryption must fail the transfer");

    assert_eq!(read_mock_token_amount(&svm, fx.usdc_custody), 50_000_000);
    assert_eq!(read_mock_token_amount(&svm, fx.destination_usdc_account), 0);
}
