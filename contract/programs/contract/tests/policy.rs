use {
    anchor_lang::{InstructionData, ToAccountMetas},
    common::{initialize, read_wallet, send_ix, set_policy, setup_svm},
    solana_keypair::Keypair,
    solana_signer::Signer,
};

mod common;

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
