use {
    anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas},
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const WALLET_SEED: &[u8] = b"polet_wallet";

fn setup_svm() -> (LiteSVM, Keypair, anchor_lang::prelude::Pubkey) {
    let program_id = contract::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes =
        std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
            .expect("Build program first with: NO_DNA=1 anchor build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, payer.pubkey().as_ref()],
        &program_id,
    );

    (svm, payer, wallet_pda)
}

fn send_ix(
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

fn initialize(svm: &mut LiteSVM, owner: &Keypair, wallet_pda: anchor_lang::prelude::Pubkey) {
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

fn set_policy(svm: &mut LiteSVM, owner: &Keypair, wallet_pda: anchor_lang::prelude::Pubkey) {
    set_policy_commitment(svm, owner, wallet_pda, [0xabu8; 32]);
}

fn set_policy_commitment(
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

fn grant_session(
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

fn revoke_session(
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

fn revoke_all_sessions(
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

fn read_wallet(svm: &LiteSVM, wallet_pda: anchor_lang::prelude::Pubkey) -> contract::Wallet {
    let account = svm
        .get_account(&wallet_pda)
        .expect("wallet account not found");
    let mut data = account.data.as_slice();
    contract::Wallet::try_deserialize(&mut data).expect("failed to deserialize wallet")
}

fn transfer_intent(destination: anchor_lang::prelude::Pubkey, amount: u64) -> Vec<u8> {
    let mut data = vec![0u8];
    data.extend_from_slice(destination.as_ref());
    data.extend_from_slice(&amount.to_le_bytes());
    data
}

fn execute_as_session(
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

#[test]
fn initialize_creates_pda_wallet_without_plaintext_numeric_policy() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.owner, owner.pubkey());
    assert_eq!(wallet.proxy_pk, anchor_lang::prelude::Pubkey::default());
    assert_eq!(wallet.policy_commitment, [0u8; 32]);
    assert_eq!(wallet.merkle_root, [0u8; 32]);
    assert_eq!(wallet.policy_seq, 0);
    assert_eq!(wallet.last_revoked_slot, 0);
    assert!(wallet.sessions.is_empty());
}

#[test]
fn owner_can_set_policy_commitment_and_proxy_metadata() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    initialize(&mut svm, &owner, wallet_pda);

    set_policy(&mut svm, &owner, wallet_pda);

    let proxy = Keypair::new().pubkey();
    let proxy_ix = contract::instruction::SetProxyKey { proxy_pk: proxy };
    let proxy_accounts = contract::accounts::SetProxyKey {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    send_ix(
        &mut svm,
        &owner,
        &[],
        anchor_lang::solana_program::instruction::Instruction {
            program_id: contract::id(),
            data: proxy_ix.data(),
            accounts: proxy_accounts.to_account_metas(None),
        },
    )
    .expect("set_proxy_key failed");

    let root = [0x55u8; 32];
    let root_ix = contract::instruction::SetMerkleRoot { merkle_root: root };
    let root_accounts = contract::accounts::SetMerkleRoot {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    send_ix(
        &mut svm,
        &owner,
        &[],
        anchor_lang::solana_program::instruction::Instruction {
            program_id: contract::id(),
            data: root_ix.data(),
            accounts: root_accounts.to_account_metas(None),
        },
    )
    .expect("set_merkle_root failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.policy_commitment, [0xabu8; 32]);
    assert_eq!(wallet.proxy_pk, proxy);
    assert_eq!(wallet.merkle_root, root);
    assert_eq!(wallet.policy_seq, 2);
}

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
