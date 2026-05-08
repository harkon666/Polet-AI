import { Transaction, type BlockhashWithExpiryBlockHeight, type Connection } from '@solana/web3.js';

export function decodeBase64Transaction(transactionBase64: string) {
  return Transaction.from(Uint8Array.from(atob(transactionBase64), (char) => char.charCodeAt(0)));
}

export async function prepareFreshTransaction(
  transactionBase64: string,
  connection: Connection,
  options: { preserveExistingSignatures?: boolean } = {}
) {
  const transaction = decodeBase64Transaction(transactionBase64);
  const existingBlockhash = transaction.recentBlockhash;
  const hasExistingSignatures = transaction.signatures.some((signature) => signature.signature !== null);
  const latestBlockhash = options.preserveExistingSignatures && hasExistingSignatures && existingBlockhash
    ? { blockhash: existingBlockhash, lastValidBlockHeight: await connection.getBlockHeight('confirmed') + 150 }
    : await connection.getLatestBlockhash('confirmed');
  if (!options.preserveExistingSignatures || !hasExistingSignatures) {
    transaction.recentBlockhash = latestBlockhash.blockhash;
  }
  return { transaction, latestBlockhash };
}

export async function confirmFreshTransaction(
  connection: Connection,
  signature: string,
  latestBlockhash: BlockhashWithExpiryBlockHeight
) {
  try {
    await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
  } catch (err) {
    if (!isBlockhashExpiryError(err)) {
      throw err;
    }
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    const value = status.value;
    if (value && !value.err && (value.confirmationStatus === 'confirmed' || value.confirmationStatus === 'finalized')) {
      return;
    }
    throw err;
  }
}

function isBlockhashExpiryError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('block height exceeded') || message.includes('has expired');
}
