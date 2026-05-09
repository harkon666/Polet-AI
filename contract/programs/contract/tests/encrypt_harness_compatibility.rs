use {
    common::{
        approve_ika_message_with_verified_encrypt_as_session_with_coapprovers,
        execute_encrypt_policy_graph_as_session, grant_session, initialize, mock_encrypt_id,
        read_mock_message_approval, read_wallet, request_policy_value_decryption,
        set_official_encrypt_ciphertext_policy, setup_svm,
        write_encrypt_bool_decryption_request_with_owner, write_encrypt_ciphertext_with_owner,
        write_mock_ika_account, write_official_encrypt_ciphertext, write_system_account,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

const FUTURE_EXPIRY: i64 = 4_102_444_800;

struct EncryptTestContext {
    encrypt_program: anchor_lang::prelude::Pubkey,
    allowed_digest: [u8; 32],
    daily_spent_digest: [u8; 32],
}

impl EncryptTestContext {
    fn new() -> Self {
        Self {
            encrypt_program: mock_encrypt_id(),
            allowed_digest: [0xa1u8; 32],
            daily_spent_digest: [0xa2u8; 32],
        }
    }

    fn process_pending(
        &self,
        svm: &mut LiteSVM,
        wallet_pda: anchor_lang::prelude::Pubkey,
        allowed_output: anchor_lang::prelude::Pubkey,
        daily_spent_output: anchor_lang::prelude::Pubkey,
        allowed_request: anchor_lang::prelude::Pubkey,
        allowed: bool,
    ) {
        write_encrypt_ciphertext_with_owner(
            svm,
            allowed_output,
            self.allowed_digest,
            0,
            self.encrypt_program,
        );
        write_encrypt_ciphertext_with_owner(
            svm,
            daily_spent_output,
            self.daily_spent_digest,
            4,
            self.encrypt_program,
        );
        write_encrypt_bool_decryption_request_with_owner(
            svm,
            allowed_request,
            allowed_output,
            self.allowed_digest,
            wallet_pda,
            Some(allowed),
            self.encrypt_program,
        );
    }
}

struct OfficialEncryptHarnessFixture {
    session_key: Keypair,
    max_per_run: anchor_lang::prelude::Pubkey,
    daily_cap: anchor_lang::prelude::Pubkey,
    daily_spent: anchor_lang::prelude::Pubkey,
    source_amount: anchor_lang::prelude::Pubkey,
    allowed_output: anchor_lang::prelude::Pubkey,
    daily_spent_output: anchor_lang::prelude::Pubkey,
    allowed_request: anchor_lang::prelude::Pubkey,
    config: anchor_lang::prelude::Pubkey,
    deposit: anchor_lang::prelude::Pubkey,
    network_encryption_key: anchor_lang::prelude::Pubkey,
    event_authority: anchor_lang::prelude::Pubkey,
}

fn setup_official_encrypt_harness(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
) -> OfficialEncryptHarnessFixture {
    let fixture = OfficialEncryptHarnessFixture {
        session_key: Keypair::new(),
        max_per_run: Keypair::new().pubkey(),
        daily_cap: Keypair::new().pubkey(),
        daily_spent: Keypair::new().pubkey(),
        source_amount: Keypair::new().pubkey(),
        allowed_output: Keypair::new().pubkey(),
        daily_spent_output: Keypair::new().pubkey(),
        allowed_request: Keypair::new().pubkey(),
        config: Keypair::new().pubkey(),
        deposit: Keypair::new().pubkey(),
        network_encryption_key: Keypair::new().pubkey(),
        event_authority: Keypair::new().pubkey(),
    };

    svm.airdrop(&fixture.session_key.pubkey(), 1_000_000_000)
        .unwrap();
    write_official_encrypt_ciphertext(svm, fixture.max_per_run, mock_encrypt_id());
    write_official_encrypt_ciphertext(svm, fixture.daily_cap, mock_encrypt_id());
    write_official_encrypt_ciphertext(svm, fixture.daily_spent, mock_encrypt_id());
    write_official_encrypt_ciphertext(svm, fixture.source_amount, mock_encrypt_id());
    write_official_encrypt_ciphertext(svm, fixture.allowed_output, mock_encrypt_id());
    write_official_encrypt_ciphertext(svm, fixture.daily_spent_output, mock_encrypt_id());
    write_system_account(svm, fixture.config);
    write_system_account(svm, fixture.deposit);
    write_system_account(svm, fixture.network_encryption_key);
    write_system_account(svm, fixture.event_authority);

    set_official_encrypt_ciphertext_policy(
        svm,
        owner,
        &fixture.session_key,
        wallet_pda,
        fixture.max_per_run,
        fixture.daily_cap,
        fixture.daily_spent,
        mock_encrypt_id(),
        fixture.config,
        fixture.deposit,
        fixture.network_encryption_key,
        fixture.event_authority,
    )
    .expect("set official Encrypt ciphertext policy failed");
    grant_session(
        svm,
        owner,
        wallet_pda,
        fixture.session_key.pubkey(),
        FUTURE_EXPIRY,
    )
    .expect("grant session failed");

    fixture
}

fn execute_graph(
    svm: &mut LiteSVM,
    wallet_pda: anchor_lang::prelude::Pubkey,
    fixture: &OfficialEncryptHarnessFixture,
) {
    let wallet = read_wallet(svm, wallet_pda);
    execute_encrypt_policy_graph_as_session(
        svm,
        &fixture.session_key,
        &fixture.session_key,
        wallet_pda,
        fixture.source_amount,
        fixture.max_per_run,
        fixture.daily_spent,
        fixture.daily_cap,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.config,
        fixture.deposit,
        fixture.network_encryption_key,
        fixture.event_authority,
        10_000,
        wallet.policy_seq,
    )
    .expect("execute Encrypt policy graph failed");
}

#[test]
fn encrypt_harness_process_pending_allows_ika_and_updates_daily_spent_output() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let encrypt = EncryptTestContext::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();
    let ika_message_hash = [0xb1u8; 32];

    initialize(&mut svm, &owner, wallet_pda);
    let fixture = setup_official_encrypt_harness(&mut svm, &owner, wallet_pda);
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    execute_graph(&mut svm, wallet_pda, &fixture);
    let wallet = read_wallet(&svm, wallet_pda);
    assert!(wallet.usdc_dca_policy.encrypt_ciphertexts.pending);
    assert_eq!(
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_source_amount,
        fixture.source_amount
    );
    assert_eq!(
        wallet
            .usdc_dca_policy
            .encrypt_ciphertexts
            .pending_allowed_output,
        fixture.allowed_output
    );

    encrypt.process_pending(
        &mut svm,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        true,
    );
    let wallet = read_wallet(&svm, wallet_pda);
    approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &fixture.session_key,
        &fixture.session_key,
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
    )
    .expect("verified Encrypt allowed output should approve Ika");

    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 1);
    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.usdc_dca_policy.encrypt_ciphertexts.daily_spent,
        fixture.daily_spent_output
    );
    assert!(!wallet.usdc_dca_policy.encrypt_ciphertexts.pending);
}

#[test]
fn encrypt_harness_process_pending_blocks_ika_without_mutating_spend() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let encrypt = EncryptTestContext::new();
    let dwallet = Keypair::new().pubkey();
    let message_approval = Keypair::new().pubkey();

    initialize(&mut svm, &owner, wallet_pda);
    let fixture = setup_official_encrypt_harness(&mut svm, &owner, wallet_pda);
    write_system_account(&mut svm, dwallet);
    write_mock_ika_account(&mut svm, message_approval, 100);

    execute_graph(&mut svm, wallet_pda, &fixture);
    let original_spent = read_wallet(&svm, wallet_pda)
        .usdc_dca_policy
        .encrypt_ciphertexts
        .daily_spent;
    encrypt.process_pending(
        &mut svm,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        false,
    );

    let wallet = read_wallet(&svm, wallet_pda);
    let res = approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
        &mut svm,
        &fixture.session_key,
        &fixture.session_key,
        wallet_pda,
        fixture.allowed_output,
        fixture.daily_spent_output,
        fixture.allowed_request,
        dwallet,
        message_approval,
        [0xb2u8; 32],
        FUTURE_EXPIRY,
        10_000,
        wallet.policy_seq,
        &[],
    );
    assert!(res.is_err(), "verified blocked output should suppress Ika");
    assert_eq!(read_mock_message_approval(&svm, message_approval)[0], 0);
    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(
        wallet.usdc_dca_policy.encrypt_ciphertexts.daily_spent,
        original_spent
    );
    assert!(wallet.usdc_dca_policy.encrypt_ciphertexts.pending);
}

#[test]
fn encrypt_harness_tests_document_pre_alpha_boundaries() {
    let disclaimer = "Encrypt pre-alpha compatibility tests use a deterministic mock executor; \
        they do not prove production privacy, production FHE, production MPC, or settlement.";
    assert!(disclaimer.contains("pre-alpha"));
    assert!(disclaimer.contains("do not prove production privacy"));
    assert!(disclaimer.contains("production MPC"));
}

#[test]
fn owner_can_request_each_policy_value_reveal_without_plaintext_storage() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture = setup_official_encrypt_harness(&mut svm, &owner, wallet_pda);

    for (kind, ciphertext) in [
        (0, fixture.max_per_run),
        (1, fixture.daily_cap),
        (2, fixture.daily_spent),
    ] {
        let request = Keypair::new();
        let res = request_policy_value_decryption(
            &mut svm,
            &owner,
            &owner,
            &request,
            wallet_pda,
            ciphertext,
            kind,
            fixture.config,
            fixture.deposit,
            fixture.network_encryption_key,
            fixture.event_authority,
        );
        assert!(res.is_ok(), "owner reveal request kind {kind} should pass");

        let wallet = read_wallet(&svm, wallet_pda);
        let refs = wallet.usdc_dca_policy.encrypt_ciphertexts;
        assert_eq!(refs.last_reveal_request, request.pubkey());
        assert_eq!(refs.last_reveal_ciphertext, ciphertext);
        assert_eq!(refs.last_reveal_kind, kind);
        assert_eq!(
            wallet.usdc_dca_policy.encrypted_max_per_run, 0,
            "official reveal must not write plaintext policy values"
        );
    }
}

#[test]
fn policy_reveal_rejects_non_owner_and_ciphertext_mismatch() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();
    initialize(&mut svm, &owner, wallet_pda);
    let fixture = setup_official_encrypt_harness(&mut svm, &owner, wallet_pda);

    let request = Keypair::new();
    let non_owner = request_policy_value_decryption(
        &mut svm,
        &attacker,
        &attacker,
        &request,
        wallet_pda,
        fixture.max_per_run,
        0,
        fixture.config,
        fixture.deposit,
        fixture.network_encryption_key,
        fixture.event_authority,
    );
    assert!(
        non_owner.is_err(),
        "non-owner must not request policy reveal"
    );

    let wrong_ciphertext = Keypair::new().pubkey();
    write_official_encrypt_ciphertext(&mut svm, wrong_ciphertext, mock_encrypt_id());
    let mismatch = request_policy_value_decryption(
        &mut svm,
        &owner,
        &owner,
        &Keypair::new(),
        wallet_pda,
        wrong_ciphertext,
        0,
        fixture.config,
        fixture.deposit,
        fixture.network_encryption_key,
        fixture.event_authority,
    );
    assert!(mismatch.is_err(), "ciphertext mismatch must fail");
}

#[test]
fn policy_reveal_requires_configured_official_encrypt_policy() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);
    let ciphertext = Keypair::new().pubkey();
    let config = Keypair::new().pubkey();
    let deposit = Keypair::new().pubkey();
    let network_encryption_key = Keypair::new().pubkey();
    let event_authority = Keypair::new().pubkey();
    write_official_encrypt_ciphertext(&mut svm, ciphertext, mock_encrypt_id());
    write_system_account(&mut svm, config);
    write_system_account(&mut svm, deposit);
    write_system_account(&mut svm, network_encryption_key);
    write_system_account(&mut svm, event_authority);

    let res = request_policy_value_decryption(
        &mut svm,
        &owner,
        &owner,
        &Keypair::new(),
        wallet_pda,
        ciphertext,
        0,
        config,
        deposit,
        network_encryption_key,
        event_authority,
    );
    assert!(
        res.is_err(),
        "policy reveal needs configured Encrypt ciphertext refs"
    );
}
