const { Connection, PublicKey } = require('@solana/web3.js');
const conn = new Connection('https://api.devnet.solana.com');
async function check() {
  const info = await conn.getAccountInfo(new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'));
  if (info) {
    console.log("Devnet USDC Owner is:", info.owner.toBase58());
  } else {
    console.log("Account does not exist");
  }
}
check();
