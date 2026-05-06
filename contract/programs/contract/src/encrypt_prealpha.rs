use anchor_lang::prelude::Pubkey;
use encrypt_anchor::CPI_AUTHORITY_SEED;

pub const ENCRYPT_PREALPHA_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    54, 52, 193, 56, 216, 205, 66, 173, 150, 219, 76, 71, 2, 69, 247, 186, 158, 244, 102, 172, 211,
    224, 217, 69, 221, 212, 114, 161, 199, 34, 86, 139,
]);
pub const ENCRYPT_PREALPHA_CLUSTER: &str = "devnet";
pub const ENCRYPT_PREALPHA_RPC_URL: &str = "https://api.devnet.solana.com";
pub const ENCRYPT_PREALPHA_GRPC_URL: &str = "https://pre-alpha-dev-1.encrypt.ika-network.net:443";
pub const ENCRYPT_CPI_AUTHORITY_SEED: &[u8] = CPI_AUTHORITY_SEED;

pub fn encrypt_cpi_authority(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENCRYPT_CPI_AUTHORITY_SEED], program_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracks_official_encrypt_prealpha_constants() {
        assert_eq!(
            ENCRYPT_PREALPHA_PROGRAM_ID.to_string(),
            "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8"
        );
        assert_eq!(ENCRYPT_CPI_AUTHORITY_SEED, b"__encrypt_cpi_authority");
    }
}
