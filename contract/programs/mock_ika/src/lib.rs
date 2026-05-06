use anchor_lang::prelude::*;

declare_id!("CXHt5JcKMshPiW7HJUqyRnyUugQTnoWN3mbWm92sGLMw");

#[program]
pub mod mock_ika {
    use super::*;

    pub fn approve_message(
        ctx: Context<ApproveMessage>,
        message_hash: [u8; 32],
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        bump: u8,
    ) -> Result<()> {
        let data = &mut ctx.accounts.message_approval.try_borrow_mut_data()?;
        require!(data.len() >= 100, MockIkaError::MessageApprovalTooSmall);

        data[0] = 1;
        data[1..33].copy_from_slice(&message_hash);
        data[33..65].copy_from_slice(&user_pubkey);
        data[65..67].copy_from_slice(&signature_scheme.to_le_bytes());
        data[67] = bump;
        data[68..100].copy_from_slice(ctx.accounts.cpi_authority.key().as_ref());

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ApproveMessage<'info> {
    /// CHECK: Test-owned account that records whether approve_message was called.
    #[account(mut)]
    pub message_approval: UncheckedAccount<'info>,
    /// CHECK: Mock dWallet account.
    pub dwallet: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub cpi_authority: Signer<'info>,
}

#[error_code]
pub enum MockIkaError {
    #[msg("Mock MessageApproval account is too small")]
    MessageApprovalTooSmall,
}
