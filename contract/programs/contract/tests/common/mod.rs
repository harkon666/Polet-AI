#![allow(dead_code)]
use {
    anchor_lang::{AccountDeserialize, AccountSerialize, InstructionData, ToAccountMetas},
    contract::execution_payload::{
        TRANSFER_INTENT_AMOUNT_OFFSET, TRANSFER_INTENT_DESTINATION_OFFSET,
        TRANSFER_INTENT_INSTRUCTION, TRANSFER_INTENT_LEN,
    },
    litesvm::LiteSVM,
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_sha256_hasher::hashv,
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    std::str::FromStr,
};

pub const WALLET_SEED: &[u8] = b"polet_wallet";
pub const SPL_TOKEN_PROGRAM_ID_BYTES: [u8; 32] = [
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];
pub const WSOL_MINT_BYTES: [u8; 32] = [
    6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70, 24, 192, 53, 218, 196, 57, 220, 26,
    235, 59, 85, 152, 160, 240, 0, 0, 0, 0, 1,
];
pub const IKA_CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";
pub const ENCRYPT_CPI_AUTHORITY_SEED: &[u8] = b"__encrypt_cpi_authority";

pub fn mock_ika_id() -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::from_str("CXHt5JcKMshPiW7HJUqyRnyUugQTnoWN3mbWm92sGLMw")
        .expect("valid mock Ika program id")
}

pub fn mock_encrypt_id() -> anchor_lang::prelude::Pubkey {
    contract::encrypt_prealpha::ENCRYPT_PREALPHA_PROGRAM_ID
}

pub fn setup_svm() -> (LiteSVM, Keypair, anchor_lang::prelude::Pubkey) {
    let program_id = contract::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();

    let deploy_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("target")
        .join("deploy");
    let bytes = std::fs::read(deploy_dir.join("contract.so"))
        .expect("Build program first with: NO_DNA=1 anchor build");
    svm.add_program(program_id, &bytes).unwrap();
    let mock_ika_bytes = std::fs::read(deploy_dir.join("mock_ika.so"))
        .expect("Build mock Ika program first with: NO_DNA=1 anchor build");
    svm.add_program(mock_ika_id(), &mock_ika_bytes).unwrap();
    let mock_encrypt_bytes = std::fs::read(deploy_dir.join("mock_encrypt.so"))
        .expect("Build mock Encrypt program first with: NO_DNA=1 anchor build");
    svm.add_program(mock_encrypt_id(), &mock_encrypt_bytes)
        .unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, payer.pubkey().as_ref()],
        &program_id,
    );

    (svm, payer, wallet_pda)
}

pub fn send_ix(
    svm: &mut LiteSVM,
    payer: &Keypair,
    signers: &[&Keypair],
    ix: anchor_lang::solana_program::instruction::Instruction,
) -> Result<(), String> {
    let mut all_signers = vec![payer];
    for signer in signers {
        if signer.pubkey() != payer.pubkey() {
            all_signers.push(signer);
        }
    }

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &all_signers)
        .map_err(|err| err.to_string())?;
    svm.send_transaction(tx).map_err(|err| format!("{err:?}"))?;
    Ok(())
}

pub fn initialize(svm: &mut LiteSVM, owner: &Keypair, wallet_pda: anchor_lang::prelude::Pubkey) {
    let ix_data = contract::instruction::Initialize {};
    let ix_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix).expect("initialize failed");
}

pub fn set_policy(svm: &mut LiteSVM, owner: &Keypair, wallet_pda: anchor_lang::prelude::Pubkey) {
    set_policy_commitment(svm, owner, wallet_pda, [0xabu8; 32]);
}

pub fn set_policy_commitment(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    policy_commitment: [u8; 32],
) {
    let ix_data = contract::instruction::SetPolicy { policy_commitment };
    let ix_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix).expect("set_policy failed");
}

pub fn grant_session(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    session_key: anchor_lang::prelude::Pubkey,
    expires_at: i64,
) -> Result<(), String> {
    let ix_data = contract::instruction::GrantTemporalKey {
        session_key,
        expires_at,
    };
    let ix_accounts = contract::accounts::GrantTemporalKey {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn revoke_session(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    session_key: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::RevokeSession { session_key };
    let ix_accounts = contract::accounts::RevokeSession {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn revoke_all_sessions(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::RevokeAllSessions {};
    let ix_accounts = contract::accounts::RevokeAllSessions {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn set_recovery_authority(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    recovery_authority: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::SetRecoveryAuthority { recovery_authority };
    let ix_accounts = contract::accounts::SetRecoveryAuthority {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn recover_wallet_access(
    svm: &mut LiteSVM,
    authority: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    compromised_sessions: Vec<anchor_lang::prelude::Pubkey>,
    shared_ika_threshold: u8,
    shared_ika_approvers: Vec<anchor_lang::prelude::Pubkey>,
    pending_dwallet_controller: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::RecoverWalletAccess {
        compromised_sessions,
        shared_ika_threshold,
        shared_ika_approvers,
        pending_dwallet_controller,
    };
    let ix_accounts = contract::accounts::RecoverWalletAccess {
        wallet: wallet_pda,
        authority: authority.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, authority, &[], ix)
}

pub fn configure_shared_ika_approvers(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    threshold: u8,
    approvers: Vec<anchor_lang::prelude::Pubkey>,
) -> Result<(), String> {
    let ix_data = contract::instruction::ConfigureSharedIkaApprovers {
        threshold,
        approvers,
    };
    let ix_accounts = contract::accounts::ConfigureSharedIkaApprovers {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn revoke_shared_ika_approver(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    approver: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::RevokeSharedIkaApprover { approver };
    let ix_accounts = contract::accounts::RevokeSharedIkaApprover {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn read_wallet(svm: &LiteSVM, wallet_pda: anchor_lang::prelude::Pubkey) -> contract::Wallet {
    let account = svm
        .get_account(&wallet_pda)
        .expect("wallet account not found");
    let mut data = account.data.as_slice();
    contract::Wallet::try_deserialize(&mut data).expect("failed to deserialize wallet")
}

pub fn update_wallet(
    svm: &mut LiteSVM,
    wallet_pda: anchor_lang::prelude::Pubkey,
    update: impl FnOnce(&mut contract::Wallet),
) {
    let mut account = svm
        .get_account(&wallet_pda)
        .expect("wallet account not found");
    let mut data = account.data.as_slice();
    let mut wallet =
        contract::Wallet::try_deserialize(&mut data).expect("failed to deserialize wallet");
    update(&mut wallet);

    let mut serialized = Vec::with_capacity(account.data.len());
    wallet
        .try_serialize(&mut serialized)
        .expect("failed to serialize wallet");
    assert!(
        serialized.len() <= account.data.len(),
        "serialized wallet grew beyond allocated account"
    );
    account.data[..serialized.len()].copy_from_slice(&serialized);
    svm.set_account(wallet_pda, account)
        .expect("wallet account write failed");
}

pub fn spl_token_program_id() -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::new_from_array(SPL_TOKEN_PROGRAM_ID_BYTES)
}

pub fn wsol_mint() -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::new_from_array(WSOL_MINT_BYTES)
}

pub fn write_mock_token_account(
    svm: &mut LiteSVM,
    token_account: anchor_lang::prelude::Pubkey,
    mint: anchor_lang::prelude::Pubkey,
    authority: anchor_lang::prelude::Pubkey,
    amount: u64,
) {
    let mut data = vec![0u8; 165];
    data[0..32].copy_from_slice(mint.as_ref());
    data[32..64].copy_from_slice(authority.as_ref());
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    data[108] = 1;

    svm.set_account(
        token_account,
        Account {
            lamports: 1_000_000_000,
            data,
            owner: spl_token_program_id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("mock token account write failed");
}

pub fn register_demo_custody(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    usdc_mint: anchor_lang::prelude::Pubkey,
    usdc_token_account: anchor_lang::prelude::Pubkey,
    sol_mint: anchor_lang::prelude::Pubkey,
    sol_token_account: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::RegisterDemoCustody {};
    let ix_accounts = contract::accounts::RegisterDemoCustody {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        usdc_mint,
        usdc_token_account,
        sol_mint,
        sol_token_account,
        token_program: spl_token_program_id(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn transfer_intent(destination: anchor_lang::prelude::Pubkey, amount: u64) -> Vec<u8> {
    let mut data = vec![TRANSFER_INTENT_INSTRUCTION];
    data.extend_from_slice(destination.as_ref());
    data.extend_from_slice(&amount.to_le_bytes());
    assert_eq!(data.len(), TRANSFER_INTENT_LEN);
    assert_eq!(
        &data[TRANSFER_INTENT_DESTINATION_OFFSET..TRANSFER_INTENT_DESTINATION_OFFSET + 32],
        destination.as_ref()
    );
    assert_eq!(
        u64::from_le_bytes(
            data[TRANSFER_INTENT_AMOUNT_OFFSET..TRANSFER_INTENT_LEN]
                .try_into()
                .unwrap()
        ),
        amount
    );
    data
}

pub fn encrypt_amount(amount: u64, witness: &[u8; 32]) -> u64 {
    let mask = u64::from_le_bytes(witness[0..8].try_into().unwrap());
    amount ^ mask
}

pub fn set_confidential_numeric_policy(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    witness: [u8; 32],
    max_per_run: u64,
    daily_cap: u64,
    daily_spent: u64,
    spent_day_index: i64,
) -> Result<(), String> {
    let ix_data = contract::instruction::SetConfidentialNumericPolicy {
        policy_commitment: [0x42u8; 32],
        encryption_witness_hash: hashv(&[&witness]).to_bytes(),
        encrypted_max_per_run: encrypt_amount(max_per_run, &witness),
        encrypted_daily_cap: encrypt_amount(daily_cap, &witness),
        encrypted_daily_spent: encrypt_amount(daily_spent, &witness),
        spent_day_index,
    };
    let ix_accounts = contract::accounts::SetConfidentialNumericPolicy {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

pub fn set_encrypt_ciphertext_policy(
    svm: &mut LiteSVM,
    owner: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    max_per_run_ciphertext: anchor_lang::prelude::Pubkey,
    daily_cap_ciphertext: anchor_lang::prelude::Pubkey,
    daily_spent_ciphertext: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let ix_data = contract::instruction::SetEncryptCiphertextPolicy {
        policy_commitment: [0xacu8; 32],
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
    };
    let ix_accounts = contract::accounts::SetEncryptCiphertextPolicy {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[], ix)
}

#[allow(clippy::too_many_arguments)]
pub fn set_official_encrypt_ciphertext_policy(
    svm: &mut LiteSVM,
    owner: &Keypair,
    payer: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    max_per_run_ciphertext: anchor_lang::prelude::Pubkey,
    daily_cap_ciphertext: anchor_lang::prelude::Pubkey,
    daily_spent_ciphertext: anchor_lang::prelude::Pubkey,
    encrypt_program: anchor_lang::prelude::Pubkey,
    config: anchor_lang::prelude::Pubkey,
    deposit: anchor_lang::prelude::Pubkey,
    network_encryption_key: anchor_lang::prelude::Pubkey,
    event_authority: anchor_lang::prelude::Pubkey,
) -> Result<(), String> {
    let (cpi_authority, _cpi_bump) = encrypt_cpi_authority();
    let ix_data = contract::instruction::SetOfficialEncryptCiphertextPolicy {
        policy_commitment: [0xadu8; 32],
    };
    let ix_accounts = contract::accounts::SetOfficialEncryptCiphertextPolicy {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        max_per_run_ciphertext,
        daily_cap_ciphertext,
        daily_spent_ciphertext,
        encrypt_program,
        config,
        deposit,
        cpi_authority,
        program: contract::id(),
        network_encryption_key,
        payer: payer.pubkey(),
        event_authority,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, owner, &[payer], ix)
}

pub fn execute_as_session(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    destination: anchor_lang::prelude::Pubkey,
    attestation_slot: u64,
    attestation_policy_seq: u64,
) -> Result<(), String> {
    let ix_data = contract::instruction::ExecuteIntentAsSession {
        intent_data: transfer_intent(destination, 2_000_000),
        merkle_proof: vec![],
        merkle_leaf: [0u8; 32],
        merkle_index: 0,
        attestation_slot,
        attestation_policy_seq,
        attestation_signature: [0u8; 64],
    };
    let ix_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, payer, &[session_key], ix)
}

pub fn execute_confidential_as_session(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    destination: anchor_lang::prelude::Pubkey,
    amount: u64,
    attestation_slot: u64,
    attestation_policy_seq: u64,
    witness: [u8; 32],
) -> Result<(), String> {
    let ix_data = contract::instruction::ExecuteConfidentialTransferAsSession {
        intent_data: transfer_intent(destination, amount),
        attestation_slot,
        attestation_policy_seq,
        encryption_witness: witness,
    };
    let ix_accounts = contract::accounts::ExecuteConfidentialTransferAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, payer, &[session_key], ix)
}

#[allow(clippy::too_many_arguments)]
pub fn execute_encrypt_policy_graph_as_session(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    source_amount_ciphertext: anchor_lang::prelude::Pubkey,
    max_per_run_ciphertext: anchor_lang::prelude::Pubkey,
    daily_spent_ciphertext: anchor_lang::prelude::Pubkey,
    daily_cap_ciphertext: anchor_lang::prelude::Pubkey,
    allowed_output_ciphertext: anchor_lang::prelude::Pubkey,
    daily_spent_output_ciphertext: anchor_lang::prelude::Pubkey,
    config: anchor_lang::prelude::Pubkey,
    deposit: anchor_lang::prelude::Pubkey,
    network_encryption_key: anchor_lang::prelude::Pubkey,
    event_authority: anchor_lang::prelude::Pubkey,
    attestation_slot: u64,
    attestation_policy_seq: u64,
) -> Result<(), String> {
    let (cpi_authority, cpi_authority_bump) = encrypt_cpi_authority();
    let ix_data = contract::instruction::ExecuteEncryptPolicyGraphAsSession {
        attestation_slot,
        attestation_policy_seq,
        cpi_authority_bump,
    };
    let ix_accounts = contract::accounts::ExecuteEncryptPolicyGraphAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        source_amount_ciphertext,
        max_per_run_ciphertext,
        daily_spent_ciphertext,
        daily_cap_ciphertext,
        allowed_output_ciphertext,
        daily_spent_output_ciphertext,
        encrypt_program: mock_encrypt_id(),
        config,
        deposit,
        cpi_authority,
        program: contract::id(),
        network_encryption_key,
        payer: payer.pubkey(),
        event_authority,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    send_ix(svm, payer, &[session_key], ix)
}

pub fn ika_cpi_authority() -> (anchor_lang::prelude::Pubkey, u8) {
    anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[IKA_CPI_AUTHORITY_SEED],
        &contract::id(),
    )
}

pub fn encrypt_cpi_authority() -> (anchor_lang::prelude::Pubkey, u8) {
    anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[ENCRYPT_CPI_AUTHORITY_SEED],
        &contract::id(),
    )
}

pub fn ika_coordinator() -> anchor_lang::prelude::Pubkey {
    anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[b"dwallet_coordinator"],
        &mock_ika_id(),
    )
    .0
}

pub fn write_mock_ika_account(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    data_len: usize,
) {
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data: vec![0u8; data_len],
            owner: mock_ika_id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("mock Ika account write failed");
}

pub fn write_system_account(svm: &mut LiteSVM, account: anchor_lang::prelude::Pubkey) {
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data: vec![],
            owner: anchor_lang::solana_program::system_program::ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("system account write failed");
}

pub fn write_mock_encrypt_ciphertext(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    digest: [u8; 32],
    fhe_type: u8,
) {
    let mut data = vec![0u8; 100];
    data[2..34].copy_from_slice(&digest);
    data[98] = fhe_type;
    data[99] = 1;
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data,
            owner: contract::id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("mock Encrypt ciphertext write failed");
}

pub fn write_encrypt_ciphertext_with_owner(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    digest: [u8; 32],
    fhe_type: u8,
    owner: anchor_lang::prelude::Pubkey,
) {
    let mut data = vec![0u8; 100];
    data[2..34].copy_from_slice(&digest);
    data[98] = fhe_type;
    data[99] = 1;
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data,
            owner,
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("Encrypt ciphertext write failed");
}

pub fn write_official_encrypt_ciphertext(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    encrypt_program: anchor_lang::prelude::Pubkey,
) {
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data: vec![0u8; 100],
            owner: encrypt_program,
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("official Encrypt ciphertext account write failed");
}

pub fn write_mock_encrypt_bool_decryption_request(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    ciphertext: anchor_lang::prelude::Pubkey,
    digest: [u8; 32],
    requester: anchor_lang::prelude::Pubkey,
    value: Option<bool>,
) {
    let mut data = vec![0u8; 108];
    data[2..34].copy_from_slice(ciphertext.as_ref());
    data[34..66].copy_from_slice(&digest);
    data[66..98].copy_from_slice(requester.as_ref());
    data[98] = 0;
    data[99..103].copy_from_slice(&1u32.to_le_bytes());
    if let Some(value) = value {
        data[103..107].copy_from_slice(&1u32.to_le_bytes());
        data[107] = u8::from(value);
    }
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data,
            owner: contract::id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("mock Encrypt decryption request write failed");
}

pub fn write_encrypt_bool_decryption_request_with_owner(
    svm: &mut LiteSVM,
    account: anchor_lang::prelude::Pubkey,
    ciphertext: anchor_lang::prelude::Pubkey,
    digest: [u8; 32],
    requester: anchor_lang::prelude::Pubkey,
    value: Option<bool>,
    owner: anchor_lang::prelude::Pubkey,
) {
    let mut data = vec![0u8; 108];
    data[2..34].copy_from_slice(ciphertext.as_ref());
    data[34..66].copy_from_slice(&digest);
    data[66..98].copy_from_slice(requester.as_ref());
    data[98] = 0;
    data[99..103].copy_from_slice(&1u32.to_le_bytes());
    if let Some(value) = value {
        data[103..107].copy_from_slice(&1u32.to_le_bytes());
        data[107] = u8::from(value);
    }
    svm.set_account(
        account,
        Account {
            lamports: 1_000_000_000,
            data,
            owner,
            executable: false,
            rent_epoch: 0,
        },
    )
    .expect("Encrypt decryption request write failed");
}

#[allow(clippy::too_many_arguments)]
pub fn approve_ika_message_as_session(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    dwallet: anchor_lang::prelude::Pubkey,
    message_approval: anchor_lang::prelude::Pubkey,
    ika_message_hash: [u8; 32],
    source_amount: u64,
    order_expires_at: i64,
    attestation_slot: u64,
    attestation_policy_seq: u64,
    witness: [u8; 32],
) -> Result<(), String> {
    approve_ika_message_as_session_with_coapprovers(
        svm,
        payer,
        session_key,
        wallet_pda,
        dwallet,
        message_approval,
        ika_message_hash,
        source_amount,
        order_expires_at,
        attestation_slot,
        attestation_policy_seq,
        witness,
        &[],
    )
}

#[allow(clippy::too_many_arguments)]
pub fn approve_ika_message_as_session_with_coapprovers(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    dwallet: anchor_lang::prelude::Pubkey,
    message_approval: anchor_lang::prelude::Pubkey,
    ika_message_hash: [u8; 32],
    source_amount: u64,
    order_expires_at: i64,
    attestation_slot: u64,
    attestation_policy_seq: u64,
    witness: [u8; 32],
    coapprovers: &[&Keypair],
) -> Result<(), String> {
    let (cpi_authority, _cpi_bump) = ika_cpi_authority();
    let coordinator = ika_coordinator();
    write_system_account(svm, coordinator);
    let ix_data = contract::instruction::ApproveIkaMessageAsSession {
        ika_message_hash,
        source_amount,
        order_expires_at,
        attestation_slot,
        attestation_policy_seq,
        encryption_witness: witness,
        user_pubkey: [0xedu8; 32],
        signature_scheme: 5,
        message_approval_bump: 9,
    };
    let ix_accounts = contract::accounts::ApproveIkaMessageAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        coordinator,
        dwallet,
        message_approval,
        cpi_authority,
        program: contract::id(),
        ika_program: mock_ika_id(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let mut ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    for coapprover in coapprovers {
        ix.accounts.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                coapprover.pubkey(),
                true,
            ),
        );
    }

    let mut signers = vec![session_key];
    signers.extend_from_slice(coapprovers);
    send_ix(svm, payer, &signers, ix)
}

#[allow(clippy::too_many_arguments)]
pub fn approve_ika_message_with_verified_encrypt_as_session_with_coapprovers(
    svm: &mut LiteSVM,
    payer: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    allowed_output_ciphertext: anchor_lang::prelude::Pubkey,
    daily_spent_output_ciphertext: anchor_lang::prelude::Pubkey,
    allowed_decryption_request: anchor_lang::prelude::Pubkey,
    dwallet: anchor_lang::prelude::Pubkey,
    message_approval: anchor_lang::prelude::Pubkey,
    ika_message_hash: [u8; 32],
    order_expires_at: i64,
    attestation_slot: u64,
    attestation_policy_seq: u64,
    coapprovers: &[&Keypair],
) -> Result<(), String> {
    let (cpi_authority, _cpi_bump) = ika_cpi_authority();
    let coordinator = ika_coordinator();
    write_system_account(svm, coordinator);
    let ix_data = contract::instruction::ApproveIkaMessageWithVerifiedEncryptAsSession {
        ika_message_hash,
        order_expires_at,
        attestation_slot,
        attestation_policy_seq,
        user_pubkey: [0xedu8; 32],
        signature_scheme: 5,
        message_approval_bump: 9,
    };
    let ix_accounts = contract::accounts::ApproveIkaMessageWithVerifiedEncryptAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        allowed_output_ciphertext,
        daily_spent_output_ciphertext,
        allowed_decryption_request,
        coordinator,
        dwallet,
        message_approval,
        cpi_authority,
        program: contract::id(),
        ika_program: mock_ika_id(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let mut ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: contract::id(),
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    for coapprover in coapprovers {
        ix.accounts.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                coapprover.pubkey(),
                true,
            ),
        );
    }

    let mut signers = vec![session_key];
    signers.extend_from_slice(coapprovers);
    send_ix(svm, payer, &signers, ix)
}

pub fn read_mock_message_approval(
    svm: &LiteSVM,
    message_approval: anchor_lang::prelude::Pubkey,
) -> Vec<u8> {
    svm.get_account(&message_approval)
        .expect("message approval account not found")
        .data
}
