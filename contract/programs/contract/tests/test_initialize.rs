use {
    anchor_lang::{InstructionData, ToAccountMetas},
    litesvm::LiteSVM,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_keypair::Keypair,
    solana_transaction::versioned::VersionedTransaction,
};

const WALLET_SEED: &[u8] = b"polet_wallet";

#[test]
fn test_initialize() {
    let program_id = contract::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, payer.pubkey().as_ref()],
        &program_id,
    );

    let instruction = contract::instruction::Initialize {
        daily_limit: 50_000_000u64,
    };

    let accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: instruction.data(),
        accounts: accounts.to_account_metas(None),
    };

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "initialize failed: {:?}", res);
}

#[test]
fn test_set_policy() {
    let program_id = contract::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, payer.pubkey().as_ref()],
        &program_id,
    );

    // First create wallet
    let init_ix = contract::instruction::Initialize {
        daily_limit: 50_000_000u64,
    };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Now set policy
    let policy_hash = [0xabu8; 32];
    let set_policy_ix = contract::instruction::SetPolicy { policy_hash };
    let set_policy_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };

    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };

    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();

    let res = svm.send_transaction(tx2);
    assert!(res.is_ok(), "set_policy failed: {:?}", res);
}