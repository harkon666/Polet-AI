use anchor_lang::prelude::*;

use crate::error::ErrorCode;

pub const TRANSFER_INTENT_INSTRUCTION: u8 = 0;
pub const TRANSFER_INTENT_DESTINATION_OFFSET: usize = 1;
pub const TRANSFER_INTENT_AMOUNT_OFFSET: usize = 33;
pub const TRANSFER_INTENT_LEN: usize = 41;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TransferIntentPayload {
    pub instruction: u8,
    pub destination: Pubkey,
    pub amount: u64,
}

pub fn parse_transfer_intent(
    intent_data: &[u8],
    expected_destination: &Pubkey,
) -> Result<TransferIntentPayload> {
    require!(
        intent_data.len() == TRANSFER_INTENT_LEN,
        ErrorCode::InvalidIntent
    );

    let instruction = intent_data[0];
    require!(
        instruction == TRANSFER_INTENT_INSTRUCTION,
        ErrorCode::InvalidIntent
    );

    let destination = Pubkey::new_from_array(
        intent_data[TRANSFER_INTENT_DESTINATION_OFFSET..TRANSFER_INTENT_DESTINATION_OFFSET + 32]
            .try_into()
            .map_err(|_| ErrorCode::InvalidIntent)?,
    );
    require!(
        destination == *expected_destination,
        ErrorCode::InvalidIntent
    );

    let amount = u64::from_le_bytes(
        intent_data[TRANSFER_INTENT_AMOUNT_OFFSET..TRANSFER_INTENT_LEN]
            .try_into()
            .map_err(|_| ErrorCode::InvalidIntent)?,
    );

    Ok(TransferIntentPayload {
        instruction,
        destination,
        amount,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn transfer_intent(destination: Pubkey, amount: u64) -> Vec<u8> {
        let mut data = vec![TRANSFER_INTENT_INSTRUCTION];
        data.extend_from_slice(destination.as_ref());
        data.extend_from_slice(&amount.to_le_bytes());
        data
    }

    #[test]
    fn parses_exact_proxy_transfer_payload_layout() {
        let destination = Pubkey::new_unique();
        let amount = 5_000_000u64;
        let data = transfer_intent(destination, amount);

        let parsed = parse_transfer_intent(&data, &destination).unwrap();

        assert_eq!(data.len(), TRANSFER_INTENT_LEN);
        assert_eq!(data[0], TRANSFER_INTENT_INSTRUCTION);
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
        assert_eq!(
            parsed,
            TransferIntentPayload {
                instruction: TRANSFER_INTENT_INSTRUCTION,
                destination,
                amount,
            }
        );
    }

    #[test]
    fn rejects_destination_and_instruction_drift() {
        let destination = Pubkey::new_unique();
        let mut data = transfer_intent(destination, 1);

        assert!(parse_transfer_intent(&data, &Pubkey::new_unique()).is_err());

        data[0] = 2;
        assert!(parse_transfer_intent(&data, &destination).is_err());
    }

    #[test]
    fn rejects_length_drift() {
        let destination = Pubkey::new_unique();
        let mut data = transfer_intent(destination, 1);
        data.push(0);

        assert!(parse_transfer_intent(&data, &destination).is_err());
    }
}
