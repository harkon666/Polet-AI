import { readFileSync } from 'node:fs';
import { Keypair, Connection, VersionedTransaction, Transaction } from '@solana/web3.js';

const unsignedTxBase64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIFxAlwjBs49EJJPWZnarc6EYBsbXG7BIzRSzIu7CAgDHdYnwH7zy4d4wKmda4hdJVB2LeHnxCVBiglFRzKTtC7qYj9FtKFT9Tr4Aka8j+8Gitn1CBhtY33YYX++jxnPmJ/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ+/xe0P5JylQyHtb6yDvPWWHs5o1JHElWzCw/7Lg7u8E+UPEkGdEIy/kbDJ1Cy1crcRF1XUowwMKLhO35AfKeAQQEAQACA2WOSq+TJ0kKKSkAAAAAiP0W0oVP1OvgCRryP7waK2fUIGG1jfdhhf76PGc+Yn9AS0wAAAAAAAEAAAAAAAAAAgAAAAAAAAABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fIA==';

// Load session keypair
const secretArray = JSON.parse(readFileSync('/home/harkon666/.hermes/keys/polet_session_keypair.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretArray));
console.log('Signer pubkey:', keypair.publicKey.toBase58());

// Deserialize
const bytes = Buffer.from(unsignedTxBase64, 'base64');
let tx;
try {
  tx = VersionedTransaction.deserialize(bytes);
  console.log('Tx type: VersionedTransaction');
} catch {
  tx = Transaction.from(bytes);
  console.log('Tx type: Transaction');
}

// Sign
if (tx instanceof VersionedTransaction) {
  tx.sign([keypair]);
} else {
  tx.partialSign(keypair);
}
console.log('Signed successfully!');
console.log('Signature present:', tx.signatures.length > 0);
