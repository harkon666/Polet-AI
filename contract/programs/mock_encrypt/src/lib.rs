use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8");

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.first().copied() == Some(4) {
        if instruction_data.len() < 4 {
            return Err(
                anchor_lang::solana_program::program_error::ProgramError::InvalidInstructionData,
            );
        }
        let graph_len = u16::from_le_bytes([instruction_data[1], instruction_data[2]]) as usize;
        let expected_len = 1 + 2 + graph_len + 1;
        if instruction_data.len() != expected_len {
            return Err(
                anchor_lang::solana_program::program_error::ProgramError::InvalidInstructionData,
            );
        }
        if instruction_data[3 + graph_len] != 4 {
            return Err(
                anchor_lang::solana_program::program_error::ProgramError::InvalidInstructionData,
            );
        }
    } else if accounts.len() >= 14 {
        return Err(
            anchor_lang::solana_program::program_error::ProgramError::InvalidInstructionData,
        );
    }
    Ok(())
}
