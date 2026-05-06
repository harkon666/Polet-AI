use anchor_lang::prelude::*;
use ika_dwallet_anchor::{DWalletContext, CPI_AUTHORITY_SEED};

use crate::error::ErrorCode;

pub const IKA_CPI_AUTHORITY_SEED: &[u8] = CPI_AUTHORITY_SEED;

pub struct IkaApproveMessageAccounts<'a, 'info> {
    pub ika_program: AccountInfo<'info>,
    pub coordinator: AccountInfo<'info>,
    pub message_approval: AccountInfo<'info>,
    pub dwallet: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub cpi_authority: AccountInfo<'info>,
    pub caller_program: AccountInfo<'info>,
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
    require!(
        accounts.caller_program.key() == crate::ID,
        ErrorCode::InvalidIkaApproval
    );
    let context = DWalletContext {
        dwallet_program: accounts.ika_program,
        cpi_authority: accounts.cpi_authority,
        caller_program: accounts.caller_program,
        cpi_authority_bump: accounts.signer_bump,
    };

    let message_metadata_digest = [0u8; 32];

    context.approve_message(
        &accounts.coordinator,
        &accounts.message_approval,
        &accounts.dwallet,
        &accounts.payer,
        &accounts.system_program,
        canonical_order_hash,
        message_metadata_digest,
        accounts.user_pubkey,
        accounts.signature_scheme,
        accounts.message_approval_bump,
    )?;

    Ok(())
}
