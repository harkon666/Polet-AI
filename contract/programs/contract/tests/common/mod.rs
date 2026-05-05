#![allow(dead_code)]
use {
    anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas},
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

pub fn setup_svm() -> (LiteSVM, Keypair, anchor_lang::prelude::Pubkey) {
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

pub fn read_wallet(svm: &LiteSVM, wallet_pda: anchor_lang::prelude::Pubkey) -> contract::Wallet {
    let account = svm
        .get_account(&wallet_pda)
        .expect("wallet account not found");
    let mut data = account.data.as_slice();
    contract::Wallet::try_deserialize(&mut data).expect("failed to deserialize wallet")
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
