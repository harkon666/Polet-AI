use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    account_info::next_account_info, entrypoint::ProgramResult, program_error::ProgramError,
};

declare_id!("CXHt5JcKMshPiW7HJUqyRnyUugQTnoWN3mbWm92sGLMw");

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.len() != 100 || instruction_data[0] != 8 {
        return Err(ProgramError::Custom(
            MockIkaError::InvalidApproveMessageInstruction as u32,
        ));
    }

    let account_info_iter = &mut accounts.iter();
    let _coordinator = next_account_info(account_info_iter)?;
    let message_approval = next_account_info(account_info_iter)?;
    let _dwallet = next_account_info(account_info_iter)?;
    let _caller_program = next_account_info(account_info_iter)?;
    let cpi_authority = next_account_info(account_info_iter)?;
    let _payer = next_account_info(account_info_iter)?;
    let _system_program = next_account_info(account_info_iter)?;

    if !cpi_authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut data = message_approval.try_borrow_mut_data()?;
    if data.len() < 100 {
        return Err(ProgramError::Custom(
            MockIkaError::MessageApprovalTooSmall as u32,
        ));
    }

    let bump = instruction_data[1];
    let message_hash = &instruction_data[2..34];
    let message_metadata_digest = &instruction_data[34..66];
    let user_pubkey = &instruction_data[66..98];
    let signature_scheme = &instruction_data[98..100];

    data[0] = 1;
    data[1..33].copy_from_slice(message_hash);
    data[33..65].copy_from_slice(user_pubkey);
    data[65..67].copy_from_slice(signature_scheme);
    data[67] = bump;
    data[68..100].copy_from_slice(cpi_authority.key.as_ref());
    if data.len() >= 132 {
        data[100..132].copy_from_slice(message_metadata_digest);
    }

    Ok(())
}

#[error_code]
pub enum MockIkaError {
    #[msg("Mock MessageApproval account is too small")]
    MessageApprovalTooSmall,
    #[msg("Invalid mock Ika approve_message instruction")]
    InvalidApproveMessageInstruction,
}
