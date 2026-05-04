const { Connection, PublicKey } = require('@solana/web3.js');
const conn = new Connection('https://api.devnet.solana.com');
async function check() {
  const info = await conn.getAccountInfo(new PublicKey('So11111111111111111111111111111111111111112'));
  if (info) {
    console.log("Devnet SOL Owner is:", info.owner.toBase58());
  } else {
    console.log("Account does not exist");
  }
}
check();
