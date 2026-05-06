use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use solana_sha256_hasher::hashv;

use crate::error::ErrorCode;

pub const IKA_CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

#[derive(AnchorSerialize, AnchorDeserialize)]
struct ApproveMessageArgs {
    message_hash: [u8; 32],
    user_pubkey: [u8; 32],
    signature_scheme: u16,
    bump: u8,
}

pub struct IkaApproveMessageAccounts<'a, 'info> {
    pub ika_program: AccountInfo<'info>,
    pub message_approval: AccountInfo<'info>,
    pub dwallet: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub cpi_authority: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub signer_bump: u8,
    pub message_approval_bump: u8,
    pub user_pubkey: [u8; 32],
    pub signature_scheme: u16,
    pub _marker: core::marker::PhantomData<&'a ()>,
}

pub fn approve_ika_message(
    accounts: IkaApproveMessageAccounts<'_, '_>,
    canonical_order_hash: [u8; 32],
) -> Result<()> {
    require!(
        canonical_order_hash != [0u8; 32],
        ErrorCode::InvalidIkaApproval
    );

    let mut data = approve_message_discriminator().to_vec();
    ApproveMessageArgs {
        message_hash: canonical_order_hash,
        user_pubkey: accounts.user_pubkey,
        signature_scheme: accounts.signature_scheme,
        bump: accounts.message_approval_bump,
    }
    .serialize(&mut data)?;

    let ix = Instruction {
        program_id: accounts.ika_program.key(),
        accounts: vec![
            AccountMeta::new(accounts.message_approval.key(), false),
            AccountMeta::new_readonly(accounts.dwallet.key(), false),
            AccountMeta::new(accounts.payer.key(), true),
            AccountMeta::new_readonly(accounts.system_program.key(), false),
            AccountMeta::new_readonly(accounts.cpi_authority.key(), true),
        ],
        data,
    };

    invoke_signed(
        &ix,
        &[
            accounts.message_approval,
            accounts.dwallet,
            accounts.payer,
            accounts.system_program,
            accounts.cpi_authority,
            accounts.ika_program,
        ],
        &[&[IKA_CPI_AUTHORITY_SEED, &[accounts.signer_bump]]],
    )?;

    Ok(())
}

fn approve_message_discriminator() -> [u8; 8] {
    let digest = hashv(&[b"global:approve_message"]).to_bytes();
    digest[0..8].try_into().expect("fixed discriminator length")
}
