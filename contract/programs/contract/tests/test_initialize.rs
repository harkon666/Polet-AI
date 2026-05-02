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

#[test]
fn test_execute_intent_owner_transfer() {
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

    // initialize wallet
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

    // Airdrop to wallet PDA AFTER initialization so it has lamports to transfer
    svm.airdrop(&wallet_pda, 10_000_000).unwrap();

    // Set policy first (required before execute_intent)
    let policy_hash = [0xabu8; 32];
    let set_policy_ix = contract::instruction::SetPolicy { policy_hash };
    let set_policy_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&payer.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&payer]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy failed");

    // encode intent_data: [instruction(1) + destination(32) + amount(8)]
    let destination = solana_keypair::Keypair::new().pubkey();
    let transfer_amount = 2_000_000u64;

    let intent_data = {
        let mut data = vec![0u8]; // instruction 0 = transfer
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&transfer_amount.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntent { intent_data };

    let execute_accounts = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };

    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();

    let res = svm.send_transaction(tx2);
    assert!(res.is_ok(), "execute_intent failed: {:?}", res);
}

#[test]
fn test_execute_intent_daily_limit_exceeded() {
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

    // initialize wallet with daily_limit of 10_000_000 lamports (0.01 SOL)
    let daily_limit = 10_000_000u64;
    let init_ix = contract::instruction::Initialize { daily_limit };
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

    // Airdrop to wallet PDA
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Set policy first (required before execute_intent)
    let policy_hash = [0xabu8; 32];
    let set_policy_ix = contract::instruction::SetPolicy { policy_hash };
    let set_policy_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&payer.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&payer]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy failed");

    // First transfer: 5_000_000 lamports (within daily limit)
    let destination1 = solana_keypair::Keypair::new().pubkey();
    let transfer1_amount = 5_000_000u64;
    let intent_data1 = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination1.as_ref());
        data.extend_from_slice(&transfer1_amount.to_le_bytes());
        data
    };

    let execute_ix1 = contract::instruction::ExecuteIntent { intent_data: intent_data1 };
    let execute_accounts1 = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        destination: destination1,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix1.data(),
        accounts: execute_accounts1.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();
    let res1 = svm.send_transaction(tx2);
    assert!(res1.is_ok(), "first transfer should succeed: {:?}", res1);

    // Second transfer: 8_000_000 lamports (exceeds daily limit since 5M already spent)
    let destination2 = solana_keypair::Keypair::new().pubkey();
    let transfer2_amount = 8_000_000u64;
    let intent_data2 = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination2.as_ref());
        data.extend_from_slice(&transfer2_amount.to_le_bytes());
        data
    };

    let execute_ix2 = contract::instruction::ExecuteIntent { intent_data: intent_data2 };
    let execute_accounts2 = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        destination: destination2,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix3 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix2.data(),
        accounts: execute_accounts2.to_account_metas(None),
    };
    let blockhash3 = svm.latest_blockhash();
    let msg3 = Message::new_with_blockhash(&[ix3], Some(&payer.pubkey()), &blockhash3);
    let tx3 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg3), &[&payer]).unwrap();
    let res2 = svm.send_transaction(tx3);
    assert!(res2.is_err(), "second transfer should fail due to daily limit exceeded");
}

// ============================================================
// TASK #2 — Allow/Block Policy Enforcement
// ============================================================

/// Test: Allowlist enforcement - transfer to allowed destination succeeds
#[test]
fn test_policy_allowlist_transfer_succeeds() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize { daily_limit: 50_000_000u64 };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Airdrop to wallet
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Create allowed destination
    let allowed_dest = solana_keypair::Keypair::new().pubkey();

    // Set policy with allowlist containing the destination
    let policy = contract::Policy {
        allowlist: vec![allowed_dest],
        blocklist: vec![],
    };
    let policy_data = borsh::to_vec(&policy).unwrap();
    let set_policy_ix = contract::instruction::SetPolicyData { policy_data };
    let set_policy_accounts = contract::accounts::SetPolicyData {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&owner.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&owner]).unwrap();
    let res_sp = svm.send_transaction(tx_sp);
    assert!(res_sp.is_ok(), "set_policy_data failed: {:?}", res_sp);

    // Execute transfer to allowed destination
    let intent_data = {
        let mut data = vec![0u8]; // instruction 0 = transfer
        data.extend_from_slice(allowed_dest.as_ref());
        data.extend_from_slice(&5_000_000u64.to_le_bytes());
        data
    };
    let execute_ix = contract::instruction::ExecuteIntent { intent_data };
    let execute_accounts = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        destination: allowed_dest,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&owner.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&owner]).unwrap();
    let res = svm.send_transaction(tx2);
    assert!(res.is_ok(), "transfer to allowlisted destination should succeed: {:?}", res);
}

/// Test: Allowlist enforcement - transfer to non-allowed destination fails
#[test]
fn test_policy_allowlist_transfer_blocked() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize { daily_limit: 50_000_000u64 };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Airdrop to wallet
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Create NOT-allowed destination
    let not_allowed_dest = solana_keypair::Keypair::new().pubkey();

    // Set policy with empty allowlist (means nothing is allowed)
    let policy = contract::Policy {
        allowlist: vec![],
        blocklist: vec![],
    };
    let policy_data = borsh::to_vec(&policy).unwrap();
    let set_policy_ix = contract::instruction::SetPolicyData { policy_data };
    let set_policy_accounts = contract::accounts::SetPolicyData {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&owner.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&owner]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy_data failed");

    // Execute transfer to NOT-allowed destination - should fail
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(not_allowed_dest.as_ref());
        data.extend_from_slice(&5_000_000u64.to_le_bytes());
        data
    };
    let execute_ix = contract::instruction::ExecuteIntent { intent_data };
    let execute_accounts = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        destination: not_allowed_dest,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&owner.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&owner]).unwrap();
    let res = svm.send_transaction(tx2);
    assert!(res.is_err(), "transfer to non-allowlisted destination should fail");
}

/// Test: Blocklist enforcement - transfer to blocked destination fails
#[test]
fn test_policy_blocklist_transfer_blocked() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize { daily_limit: 50_000_000u64 };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Airdrop to wallet
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Create blocked destination
    let blocked_dest = solana_keypair::Keypair::new().pubkey();

    // Set policy with blocklist containing the blocked destination
    let policy = contract::Policy {
        allowlist: vec![], // empty allowlist - nothing explicitly allowed
        blocklist: vec![blocked_dest],
    };
    let policy_data = borsh::to_vec(&policy).unwrap();
    let set_policy_ix = contract::instruction::SetPolicyData { policy_data };
    let set_policy_accounts = contract::accounts::SetPolicyData {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&owner.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&owner]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy_data failed");

    // Execute transfer to blocked destination - should fail
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(blocked_dest.as_ref());
        data.extend_from_slice(&5_000_000u64.to_le_bytes());
        data
    };
    let execute_ix = contract::instruction::ExecuteIntent { intent_data };
    let execute_accounts = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        destination: blocked_dest,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&owner.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&owner]).unwrap();
    let res = svm.send_transaction(tx2);
    assert!(res.is_err(), "transfer to blocklisted destination should fail");
}

/// Test: Blocklist takes precedence over allowlist
#[test]
fn test_policy_blocklist_precedence() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize { daily_limit: 50_000_000u64 };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Airdrop to wallet
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Create destination that is BOTH in allowlist AND blocklist
    let both_dest = solana_keypair::Keypair::new().pubkey();

    // Set policy with both allow and block containing same destination
    let policy = contract::Policy {
        allowlist: vec![both_dest],
        blocklist: vec![both_dest],
    };
    let policy_data = borsh::to_vec(&policy).unwrap();
    let set_policy_ix = contract::instruction::SetPolicyData { policy_data };
    let set_policy_accounts = contract::accounts::SetPolicyData {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&owner.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&owner]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy_data failed");

    // Execute transfer to blocked destination - should fail (blocklist wins)
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(both_dest.as_ref());
        data.extend_from_slice(&5_000_000u64.to_le_bytes());
        data
    };
    let execute_ix = contract::instruction::ExecuteIntent { intent_data };
    let execute_accounts = contract::accounts::ExecuteIntent {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        destination: both_dest,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&owner.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&owner]).unwrap();
    let res = svm.send_transaction(tx2);
    assert!(res.is_err(), "transfer to destination in both allow and block should fail (blocklist wins)");
}

// ============================================================
// TASK #4 — Temporal Key Grant
// ============================================================

#[test]
fn test_grant_temporal_key() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let session_key = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize {
        daily_limit: 50_000_000u64,
    };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Grant temporal key to session_key
    // Use a fixed expiry timestamp (1 hour from now)
    let expires_at: i64 = 1700000000 + 3600; // placeholder timestamp + 1 hour
    let daily_limit = 10_000_000u64;

    let grant_ix = contract::instruction::GrantTemporalKey {
        session_key: session_key.pubkey(),
        expires_at,
        daily_limit,
    };
    let grant_accounts = contract::accounts::GrantTemporalKey {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: grant_ix.data(),
        accounts: grant_accounts.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&owner.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&owner]).unwrap();

    let res = svm.send_transaction(tx2);
    assert!(res.is_ok(), "grant_temporal_key failed: {:?}", res);
}

#[test]
fn test_execute_intent_as_session() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let session_key = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize {
        daily_limit: 50_000_000u64,
    };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Set policy first (required before execute_intent)
    let policy_hash = [0xabu8; 32];
    let set_policy_ix = contract::instruction::SetPolicy { policy_hash };
    let set_policy_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let set_policy_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: set_policy_ix.data(),
        accounts: set_policy_accounts.to_account_metas(None),
    };
    let blockhash_sp = svm.latest_blockhash();
    let msg_sp = Message::new_with_blockhash(&[set_policy_instr], Some(&owner.pubkey()), &blockhash_sp);
    let tx_sp = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_sp), &[&owner]).unwrap();
    svm.send_transaction(tx_sp).expect("set_policy failed");

    // Grant temporal key to session_key
    let expires_at: i64 = 1700000000 + 3600; // placeholder timestamp + 1 hour
    let daily_limit = 10_000_000u64;
    let grant_ix = contract::instruction::GrantTemporalKey {
        session_key: session_key.pubkey(),
        expires_at,
        daily_limit,
    };
    let grant_accounts = contract::accounts::GrantTemporalKey {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let grant_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: grant_ix.data(),
        accounts: grant_accounts.to_account_metas(None),
    };
    let blockhash_grant = svm.latest_blockhash();
    let msg_grant = Message::new_with_blockhash(&[grant_instr], Some(&owner.pubkey()), &blockhash_grant);
    let tx_grant = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_grant), &[&owner]).unwrap();
    svm.send_transaction(tx_grant).expect("grant_temporal_key failed");

    // Airdrop to wallet PDA
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();

    // Execute intent as session key (not owner!)
    let destination = solana_keypair::Keypair::new().pubkey();
    let transfer_amount = 2_000_000u64;

    let intent_data = {
        let mut data = vec![0u8]; // instruction 0 = transfer
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&transfer_amount.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession { intent_data };

    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix3 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: execute_ix.data(),
        accounts: execute_accounts.to_account_metas(None),
    };

    let blockhash3 = svm.latest_blockhash();
    let msg3 = Message::new_with_blockhash(&[ix3], Some(&session_key.pubkey()), &blockhash3);
    let tx3 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg3), &[&session_key]).unwrap();

    let res = svm.send_transaction(tx3);
    assert!(res.is_ok(), "execute_intent_as_session failed: {:?}", res);
}

#[test]
fn test_revoke_session() {
    let program_id = contract::id();
    let owner = Keypair::new();
    let session_key = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, owner.pubkey().as_ref()],
        &program_id,
    );

    // Initialize wallet
    let init_ix = contract::instruction::Initialize {
        daily_limit: 50_000_000u64,
    };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix1], Some(&owner.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&owner]).unwrap();
    svm.send_transaction(tx).expect("init failed");

    // Grant temporal key to session_key
    let expires_at: i64 = 1700000000 + 3600;
    let daily_limit = 10_000_000u64;
    let grant_ix = contract::instruction::GrantTemporalKey {
        session_key: session_key.pubkey(),
        expires_at,
        daily_limit,
    };
    let grant_accounts = contract::accounts::GrantTemporalKey {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let grant_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: grant_ix.data(),
        accounts: grant_accounts.to_account_metas(None),
    };
    let blockhash_grant = svm.latest_blockhash();
    let msg_grant = Message::new_with_blockhash(&[grant_instr], Some(&owner.pubkey()), &blockhash_grant);
    let tx_grant = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_grant), &[&owner]).unwrap();
    svm.send_transaction(tx_grant).expect("grant_temporal_key failed");

    // Revoke the session
    let revoke_ix = contract::instruction::RevokeSession {
        session_key: session_key.pubkey(),
    };
    let revoke_accounts = contract::accounts::RevokeSession {
        wallet: wallet_pda,
        owner: owner.pubkey(),
    };
    let revoke_instr = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: revoke_ix.data(),
        accounts: revoke_accounts.to_account_metas(None),
    };
    let blockhash_revoke = svm.latest_blockhash();
    let msg_revoke = Message::new_with_blockhash(&[revoke_instr], Some(&owner.pubkey()), &blockhash_revoke);
    let tx_revoke = VersionedTransaction::try_new(VersionedMessage::Legacy(msg_revoke), &[&owner]).unwrap();

    let res = svm.send_transaction(tx_revoke);
    assert!(res.is_ok(), "revoke_session failed: {:?}", res);
}