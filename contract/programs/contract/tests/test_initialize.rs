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

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: vec![],
        merkle_leaf: [0u8; 32],
        merkle_index: 0,
    };

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

// ============================================================
// TASK #12 — Wallet State Extensions (TDD)
// proxy_pk, merkle_root, policy_seq, last_revoked_slot
// ============================================================

/// Helper: creates a SVM instance with program loaded and payer airdropped
fn setup_svm() -> (LiteSVM, Keypair, anchor_lang::prelude::Pubkey) {
    let program_id = contract::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();

    let bytes = std::fs::read("/home/harkon666/Dev/hackathon/Polet-AI/contract/target/deploy/contract.so")
        .expect("Build program first with: cargo build-sbf");
    svm.add_program(program_id, &bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    let (wallet_pda, _bump) = anchor_lang::solana_program::pubkey::Pubkey::find_program_address(
        &[WALLET_SEED, payer.pubkey().as_ref()],
        &program_id,
    );

    (svm, payer, wallet_pda)
}

/// Helper: initialize a wallet via the contract
fn do_initialize(svm: &mut LiteSVM, payer: &Keypair, wallet_pda: anchor_lang::prelude::Pubkey, daily_limit: u64) {
    let program_id = contract::id();
    let init_ix = contract::instruction::Initialize { daily_limit };
    let init_accounts = contract::accounts::Initialize {
        wallet: wallet_pda,
        owner: payer.pubkey(),
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: init_ix.data(),
        accounts: init_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    svm.send_transaction(tx).expect("initialize failed");
}

/// Helper: read wallet account data and deserialize
fn read_wallet(svm: &LiteSVM, wallet_pda: anchor_lang::prelude::Pubkey) -> contract::Wallet {
    use anchor_lang::AccountDeserialize;
    let account = svm.get_account(&wallet_pda).expect("wallet account not found");
    let mut data = account.data.as_slice();
    contract::Wallet::try_deserialize(&mut data).expect("failed to deserialize wallet")
}

// --- Test: Initialize creates wallet with default proxy_pk, merkle_root, policy_seq=0, last_revoked_slot=0 ---
#[test]
fn test_12_initialize_defaults_for_new_fields() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let wallet = read_wallet(&svm, wallet_pda);

    // #12 fields should be zero/default after init
    assert_eq!(wallet.proxy_pk, anchor_lang::prelude::Pubkey::default(), "proxy_pk should be default (zero) after init");
    assert_eq!(wallet.merkle_root, [0u8; 32], "merkle_root should be zeroed after init");
    assert_eq!(wallet.policy_seq, 0, "policy_seq should be 0 after init");
    assert_eq!(wallet.last_revoked_slot, 0, "last_revoked_slot should be 0 after init");
    // Existing fields still work
    assert_eq!(wallet.owner, payer.pubkey());
    assert_eq!(wallet.daily_limit, 50_000_000);
}

// --- Test: SetProxyKey sets proxy_pk successfully ---
#[test]
fn test_12_set_proxy_key() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let new_proxy = Keypair::new().pubkey();

    let ix_data = contract::instruction::SetProxyKey { proxy_pk: new_proxy };
    let ix_accounts = contract::accounts::SetProxyKey {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "set_proxy_key failed: {:?}", res);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.proxy_pk, new_proxy, "proxy_pk should be updated");
}

// --- Test: SetProxyKey fails when called by non-owner ---
#[test]
fn test_12_set_proxy_key_non_owner_rejected() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    let new_proxy = Keypair::new().pubkey();

    let ix_data = contract::instruction::SetProxyKey { proxy_pk: new_proxy };
    let ix_accounts = contract::accounts::SetProxyKey {
        wallet: wallet_pda,
        owner: attacker.pubkey(), // wrong owner!
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&attacker.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&attacker]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "set_proxy_key should fail when called by non-owner");
}

// --- Test: SetMerkleRoot sets merkle_root successfully ---
#[test]
fn test_12_set_merkle_root() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let new_root = [0xabu8; 32];

    let ix_data = contract::instruction::SetMerkleRoot { merkle_root: new_root };
    let ix_accounts = contract::accounts::SetMerkleRoot {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "set_merkle_root failed: {:?}", res);

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.merkle_root, new_root, "merkle_root should be updated");
}

// --- Test: SetMerkleRoot increments policy_seq ---
#[test]
fn test_12_set_merkle_root_increments_policy_seq() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let wallet_before = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet_before.policy_seq, 0);

    // Set merkle root
    let ix_data = contract::instruction::SetMerkleRoot { merkle_root: [0xffu8; 32] };
    let ix_accounts = contract::accounts::SetMerkleRoot {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    svm.send_transaction(tx).expect("set_merkle_root failed");

    let wallet_after = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet_after.policy_seq, 1, "policy_seq should increment after set_merkle_root");
}

// --- Test: SetPolicy increments policy_seq ---
#[test]
fn test_12_set_policy_increments_policy_seq() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    // First set_policy call
    let ix_data = contract::instruction::SetPolicy { policy_hash: [0xabu8; 32] };
    let ix_accounts = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    svm.send_transaction(tx).expect("set_policy failed");

    let wallet = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet.policy_seq, 1, "policy_seq should be 1 after first set_policy");

    // Second set_policy call
    let ix_data2 = contract::instruction::SetPolicy { policy_hash: [0xcdu8; 32] };
    let ix_accounts2 = contract::accounts::SetPolicy {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data2.data(),
        accounts: ix_accounts2.to_account_metas(None),
    };
    let blockhash2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &blockhash2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();
    svm.send_transaction(tx2).expect("set_policy 2 failed");

    let wallet2 = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet2.policy_seq, 2, "policy_seq should be 2 after second set_policy");
}

// --- Test: RevokeAllSessions sets last_revoked_slot ---
#[test]
fn test_12_revoke_all_sessions() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let wallet_before = read_wallet(&svm, wallet_pda);
    assert_eq!(wallet_before.last_revoked_slot, 0);

    // Warp slot forward so we get a meaningful slot value
    svm.warp_to_slot(42);

    let ix_data = contract::instruction::RevokeAllSessions {};
    let ix_accounts = contract::accounts::RevokeAllSessions {
        wallet: wallet_pda,
        owner: payer.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "revoke_all_sessions failed: {:?}", res);

    let wallet_after = read_wallet(&svm, wallet_pda);
    assert!(wallet_after.last_revoked_slot > 0, "last_revoked_slot should be set to current slot (> 0)");
}

// --- Test: RevokeAllSessions fails when called by non-owner ---
#[test]
fn test_12_revoke_all_sessions_non_owner_rejected() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    let ix_data = contract::instruction::RevokeAllSessions {};
    let ix_accounts = contract::accounts::RevokeAllSessions {
        wallet: wallet_pda,
        owner: attacker.pubkey(), // wrong owner!
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&attacker.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&attacker]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "revoke_all_sessions should fail when called by non-owner");
}

// --- Test: policy_seq monotonically increases across set_policy + set_merkle_root + set_policy_data ---
#[test]
fn test_12_policy_seq_monotonic_across_operations() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    // 1. set_policy → policy_seq = 1
    let ix1_data = contract::instruction::SetPolicy { policy_hash: [0x01u8; 32] };
    let ix1_accounts = contract::accounts::SetPolicy { wallet: wallet_pda, owner: payer.pubkey() };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: ix1_data.data(), accounts: ix1_accounts.to_account_metas(None),
    };
    let bh1 = svm.latest_blockhash();
    let msg1 = Message::new_with_blockhash(&[ix1], Some(&payer.pubkey()), &bh1);
    let tx1 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg1), &[&payer]).unwrap();
    svm.send_transaction(tx1).expect("set_policy 1 failed");
    assert_eq!(read_wallet(&svm, wallet_pda).policy_seq, 1);

    // 2. set_merkle_root → policy_seq = 2
    let ix2_data = contract::instruction::SetMerkleRoot { merkle_root: [0x02u8; 32] };
    let ix2_accounts = contract::accounts::SetMerkleRoot { wallet: wallet_pda, owner: payer.pubkey() };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: ix2_data.data(), accounts: ix2_accounts.to_account_metas(None),
    };
    let bh2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &bh2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();
    svm.send_transaction(tx2).expect("set_merkle_root failed");
    assert_eq!(read_wallet(&svm, wallet_pda).policy_seq, 2);

    // 3. set_policy_data → policy_seq = 3
    let allowed = Keypair::new().pubkey();
    let policy = contract::Policy { allowlist: vec![allowed], blocklist: vec![] };
    let policy_bytes = borsh::to_vec(&policy).unwrap();
    let ix3_data = contract::instruction::SetPolicyData { policy_data: policy_bytes };
    let ix3_accounts = contract::accounts::SetPolicyData { wallet: wallet_pda, owner: payer.pubkey() };
    let ix3 = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: ix3_data.data(), accounts: ix3_accounts.to_account_metas(None),
    };
    let bh3 = svm.latest_blockhash();
    let msg3 = Message::new_with_blockhash(&[ix3], Some(&payer.pubkey()), &bh3);
    let tx3 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg3), &[&payer]).unwrap();
    svm.send_transaction(tx3).expect("set_policy_data failed");
    assert_eq!(read_wallet(&svm, wallet_pda).policy_seq, 3);
}

// --- Test: SetProxyKey can be updated (key rotation) ---
#[test]
fn test_12_proxy_key_rotation() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let proxy1 = Keypair::new().pubkey();
    let proxy2 = Keypair::new().pubkey();

    // Set first proxy key
    let ix1_data = contract::instruction::SetProxyKey { proxy_pk: proxy1 };
    let ix1_accounts = contract::accounts::SetProxyKey { wallet: wallet_pda, owner: payer.pubkey() };
    let ix1 = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: ix1_data.data(), accounts: ix1_accounts.to_account_metas(None),
    };
    let bh1 = svm.latest_blockhash();
    let msg1 = Message::new_with_blockhash(&[ix1], Some(&payer.pubkey()), &bh1);
    let tx1 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg1), &[&payer]).unwrap();
    svm.send_transaction(tx1).expect("set_proxy_key 1 failed");
    assert_eq!(read_wallet(&svm, wallet_pda).proxy_pk, proxy1);

    // Rotate to second proxy key
    let ix2_data = contract::instruction::SetProxyKey { proxy_pk: proxy2 };
    let ix2_accounts = contract::accounts::SetProxyKey { wallet: wallet_pda, owner: payer.pubkey() };
    let ix2 = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: ix2_data.data(), accounts: ix2_accounts.to_account_metas(None),
    };
    let bh2 = svm.latest_blockhash();
    let msg2 = Message::new_with_blockhash(&[ix2], Some(&payer.pubkey()), &bh2);
    let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[&payer]).unwrap();
    svm.send_transaction(tx2).expect("set_proxy_key 2 failed");
    assert_eq!(read_wallet(&svm, wallet_pda).proxy_pk, proxy2, "proxy_pk should rotate to new key");
}

// --- Test: SetMerkleRoot non-owner rejected ---
#[test]
fn test_12_set_merkle_root_non_owner_rejected() {
    let (mut svm, payer, wallet_pda) = setup_svm();
    let program_id = contract::id();
    do_initialize(&mut svm, &payer, wallet_pda, 50_000_000);

    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    let ix_data = contract::instruction::SetMerkleRoot { merkle_root: [0xffu8; 32] };
    let ix_accounts = contract::accounts::SetMerkleRoot {
        wallet: wallet_pda,
        owner: attacker.pubkey(),
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id,
        data: ix_data.data(),
        accounts: ix_accounts.to_account_metas(None),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&attacker.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&attacker]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "set_merkle_root should fail when called by non-owner");
}

// ============================================================
// TASK #13 — Merkle Proof Verification in execute_intent_as_session (TDD)
// ============================================================

/// Helper: SHA-256 hash (matches on-chain verifier)
fn sha256(data: &[u8]) -> [u8; 32] {
    solana_sha256_hasher::hash(data).to_bytes()
}

/// Helper: build a Merkle tree from leaves and return (root, all_nodes_by_level)
/// Leaves must be a power of 2.
fn build_merkle_tree(leaves: &[[u8; 32]]) -> ([u8; 32], Vec<Vec<[u8; 32]>>) {
    assert!(leaves.len().is_power_of_two(), "leaves must be power of 2");
    let mut levels: Vec<Vec<[u8; 32]>> = vec![leaves.to_vec()];
    let mut current = leaves.to_vec();
    while current.len() > 1 {
        let mut next = Vec::new();
        for chunk in current.chunks(2) {
            let mut hasher_input = [0u8; 64];
            hasher_input[..32].copy_from_slice(&chunk[0]);
            hasher_input[32..].copy_from_slice(&chunk[1]);
            next.push(sha256(&hasher_input));
        }
        levels.push(next.clone());
        current = next;
    }
    (current[0], levels)
}

/// Helper: extract a Merkle proof for a given leaf index from the tree levels
fn get_merkle_proof(levels: &Vec<Vec<[u8; 32]>>, index: u32) -> Vec<[u8; 32]> {
    let mut proof = Vec::new();
    let mut idx = index as usize;
    for level in levels.iter().take(levels.len() - 1) {
        // sibling is the other node in the pair
        let sibling_idx = if idx % 2 == 0 { idx + 1 } else { idx - 1 };
        proof.push(level[sibling_idx]);
        idx /= 2;
    }
    proof
}

/// Helper: setup wallet with session key, policy, merkle root, and funded PDA
fn setup_session_wallet(
    svm: &mut LiteSVM,
    owner: &Keypair,
    session_key: &Keypair,
    wallet_pda: anchor_lang::prelude::Pubkey,
    merkle_root: Option<[u8; 32]>,
) {
    let program_id = contract::id();

    // Initialize
    do_initialize(svm, owner, wallet_pda, 50_000_000);

    // Set policy
    let sp_ix = contract::instruction::SetPolicy { policy_hash: [0xabu8; 32] };
    let sp_accts = contract::accounts::SetPolicy { wallet: wallet_pda, owner: owner.pubkey() };
    let sp = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: sp_ix.data(), accounts: sp_accts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[sp], Some(&owner.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[owner]).unwrap();
    svm.send_transaction(tx).expect("set_policy failed");

    // Set merkle root if provided
    if let Some(root) = merkle_root {
        let mr_ix = contract::instruction::SetMerkleRoot { merkle_root: root };
        let mr_accts = contract::accounts::SetMerkleRoot { wallet: wallet_pda, owner: owner.pubkey() };
        let mr = anchor_lang::solana_program::instruction::Instruction {
            program_id, data: mr_ix.data(), accounts: mr_accts.to_account_metas(None),
        };
        let bh2 = svm.latest_blockhash();
        let msg2 = Message::new_with_blockhash(&[mr], Some(&owner.pubkey()), &bh2);
        let tx2 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg2), &[owner]).unwrap();
        svm.send_transaction(tx2).expect("set_merkle_root failed");
    }

    // Grant temporal key
    let grant_ix = contract::instruction::GrantTemporalKey {
        session_key: session_key.pubkey(),
        expires_at: 1700000000 + 3600,
        daily_limit: 50_000_000,
    };
    let grant_accts = contract::accounts::GrantTemporalKey { wallet: wallet_pda, owner: owner.pubkey() };
    let g = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: grant_ix.data(), accounts: grant_accts.to_account_metas(None),
    };
    let bh3 = svm.latest_blockhash();
    let msg3 = Message::new_with_blockhash(&[g], Some(&owner.pubkey()), &bh3);
    let tx3 = VersionedTransaction::try_new(VersionedMessage::Legacy(msg3), &[owner]).unwrap();
    svm.send_transaction(tx3).expect("grant_temporal_key failed");

    // Fund wallet
    svm.airdrop(&wallet_pda, 100_000_000).unwrap();
}

// --- Test: Valid Merkle proof passes execute_intent_as_session ---
#[test]
fn test_13_merkle_proof_valid_passes() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Build a 4-leaf Merkle tree with destination hash as leaf 0
    let leaf0 = sha256(destination.as_ref());
    let leaf1 = sha256(&[1u8; 32]);
    let leaf2 = sha256(&[2u8; 32]);
    let leaf3 = sha256(&[3u8; 32]);
    let leaves = [leaf0, leaf1, leaf2, leaf3];
    let (root, levels) = build_merkle_tree(&leaves);
    let proof = get_merkle_proof(&levels, 0);

    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, Some(root));

    // Execute with valid proof
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: proof,
        merkle_leaf: leaf0,
        merkle_index: 0,
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "execute_intent_as_session with valid merkle proof should succeed: {:?}", res);
}

// --- Test: Invalid Merkle proof is rejected ---
#[test]
fn test_13_merkle_proof_invalid_rejected() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Build tree
    let leaf0 = sha256(destination.as_ref());
    let leaf1 = sha256(&[1u8; 32]);
    let leaf2 = sha256(&[2u8; 32]);
    let leaf3 = sha256(&[3u8; 32]);
    let leaves = [leaf0, leaf1, leaf2, leaf3];
    let (root, _levels) = build_merkle_tree(&leaves);

    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, Some(root));

    // Execute with WRONG proof (garbage siblings)
    let bad_proof = vec![[0xdeu8; 32], [0xadu8; 32]];
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: bad_proof,
        merkle_leaf: leaf0,
        merkle_index: 0,
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "execute_intent_as_session with invalid merkle proof should fail");
}

// --- Test: Wrong leaf hash is rejected ---
#[test]
fn test_13_merkle_proof_wrong_leaf_rejected() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Build tree
    let leaf0 = sha256(destination.as_ref());
    let leaf1 = sha256(&[1u8; 32]);
    let leaf2 = sha256(&[2u8; 32]);
    let leaf3 = sha256(&[3u8; 32]);
    let leaves = [leaf0, leaf1, leaf2, leaf3];
    let (root, levels) = build_merkle_tree(&leaves);
    let proof = get_merkle_proof(&levels, 0); // correct proof for leaf0

    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, Some(root));

    // Use WRONG leaf (some random hash) with correct proof → should fail
    let wrong_leaf = sha256(&[0xffu8; 32]);
    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: proof,
        merkle_leaf: wrong_leaf,
        merkle_index: 0,
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "wrong leaf with correct proof should be rejected");
}

// --- Test: No merkle_root set (zero) — proof skipped, session still works ---
#[test]
fn test_13_no_merkle_root_proof_skipped() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Setup WITHOUT merkle root (None = no set_merkle_root call)
    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, None);

    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: vec![],      // no proof needed
        merkle_leaf: [0u8; 32],
        merkle_index: 0,
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "no merkle_root set → proof should be skipped: {:?}", res);
}

// --- Test: Merkle proof at different leaf index (leaf 2 of 4) ---
#[test]
fn test_13_merkle_proof_different_index() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Build tree — destination hash is at leaf index 2
    let leaf0 = sha256(&[0u8; 32]);
    let leaf1 = sha256(&[1u8; 32]);
    let leaf2 = sha256(destination.as_ref()); // target leaf
    let leaf3 = sha256(&[3u8; 32]);
    let leaves = [leaf0, leaf1, leaf2, leaf3];
    let (root, levels) = build_merkle_tree(&leaves);
    let proof = get_merkle_proof(&levels, 2); // proof for index 2

    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, Some(root));

    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: proof,
        merkle_leaf: leaf2,
        merkle_index: 2,
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "merkle proof at index 2 should pass: {:?}", res);
}

// --- Test: Wrong index with correct proof/leaf is rejected ---
#[test]
fn test_13_merkle_proof_wrong_index_rejected() {
    let (mut svm, owner, wallet_pda) = setup_svm();
    let program_id = contract::id();
    let session_key = Keypair::new();
    svm.airdrop(&session_key.pubkey(), 1_000_000_000).unwrap();

    let destination = Keypair::new().pubkey();

    // Build tree — destination hash is at leaf index 0
    let leaf0 = sha256(destination.as_ref());
    let leaf1 = sha256(&[1u8; 32]);
    let leaf2 = sha256(&[2u8; 32]);
    let leaf3 = sha256(&[3u8; 32]);
    let leaves = [leaf0, leaf1, leaf2, leaf3];
    let (root, levels) = build_merkle_tree(&leaves);
    let proof = get_merkle_proof(&levels, 0); // correct proof for index 0

    setup_session_wallet(&mut svm, &owner, &session_key, wallet_pda, Some(root));

    let intent_data = {
        let mut data = vec![0u8];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&2_000_000u64.to_le_bytes());
        data
    };

    // Use index 1 instead of 0 — should fail
    let execute_ix = contract::instruction::ExecuteIntentAsSession {
        intent_data,
        merkle_proof: proof,
        merkle_leaf: leaf0,
        merkle_index: 1, // WRONG index
    };
    let execute_accounts = contract::accounts::ExecuteIntentAsSession {
        wallet: wallet_pda,
        session_key: session_key.pubkey(),
        destination,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id, data: execute_ix.data(), accounts: execute_accounts.to_account_metas(None),
    };
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&session_key.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&session_key]).unwrap();
    let res = svm.send_transaction(tx);
    assert!(res.is_err(), "wrong index with correct proof/leaf should be rejected");
}