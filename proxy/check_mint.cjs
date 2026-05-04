const { Connection, PublicKey } = require('@solana/web3.js');
const conn = new Connection('https://api.devnet.solana.com');
async function check() {
  const info = await conn.getAccountInfo(new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
  if (info) {
    console.log("Owner is:", info.owner.toBase58());
  } else {
    console.log("Account does not exist");
  }
}
check();
