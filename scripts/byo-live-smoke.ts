/**
 * BYO-wallet live smoke for the SDK agent kit.
 *
 * Uses a real agent wallet (not owner-as-session) to drive kit.execute()
 * against the running proxy + devnet. Demonstrates:
 *
 *  - Owner != Session (BYO pattern)
 *  - Agent wallet pays gas from its own balance (feePayer = sessionKey)
 *  - Session authorized on-chain; agent privkey held by the "Hermes-side"
 *    only — proxy never sees it.
 *
 * Requires the proxy running on localhost:3001 and both owner + agent
 * wallets already present on-chain (owner initialized, agent authorized).
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createPoletAgentKit } from '../sdk/src/index.js';

const OWNER = 'BZiugeMWHFyL5BLuAo4fH6VgNzFLx2cFsP6tcA5e6HHe';
const SESSION = 'ECFFvJe8yPaTSH2qdXP1CkQTxWfWy5B3fZ7HEcCQPhSn';
const AGENT_SECRET =
  '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie';
const PROXY_URL = 'http://localhost:3001';
const RPC_URL = 'https://api.devnet.solana.com';

const agentSigner = Keypair.fromSecretKey(bs58.decode(AGENT_SECRET));

if (agentSigner.publicKey.toBase58() !== SESSION) {
  console.error(
    `Agent privkey does not match session pubkey.\n  expected: ${SESSION}\n  derived:  ${agentSigner.publicKey.toBase58()}`,
  );
  process.exit(1);
}

console.log('Owner  :', OWNER);
console.log('Session:', SESSION, '(agent, signs trades + pays gas)');
console.log();

const connection = new Connection(RPC_URL, 'confirmed');
const kit = createPoletAgentKit({
  owner: OWNER,
  sessionKey: SESSION,
  baseUrl: PROXY_URL,
  rpcUrl: RPC_URL,
  connection,
  agentSigner,
});

console.log('=== 1. kit.status() ===');
const status = await kit.status();
console.log(JSON.stringify(status, null, 2).slice(0, 1200));
console.log();

console.log('=== 2. kit.trade({3 USDC -> SOL, jupiter}) — within cap, expect allowed ===');
try {
  const trade = await kit.trade({ from: 'USDC', to: 'SOL', amount: 3, rail: 'jupiter' });
  console.log(
    JSON.stringify(
      {
        allowed: trade.allowed,
        status: trade.status,
        rail: trade.rail,
        policyCode: trade.policy.code,
        reason: trade.policy.reason,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log('trade error:', e instanceof Error ? e.message : e);
}
console.log();

console.log('=== 3. kit.trade({5 USDC -> SOL, jupiter}) — over 4 USDC cap, expect blocked ===');
try {
  const trade = await kit.trade({ from: 'USDC', to: 'SOL', amount: 5, rail: 'jupiter' });
  console.log(
    JSON.stringify(
      {
        allowed: trade.allowed,
        status: trade.status,
        policyCode: trade.policy.code,
        reason: trade.policy.reason,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log('trade error:', e instanceof Error ? e.message : e);
}
console.log();

console.log('=== 4. kit.execute({1 USDC -> SUI, ika}) — BYO end-to-end Ika rail ===');
try {
  const exec = await kit.execute({ from: 'USDC', to: 'SUI', amount: 1, rail: 'ika' });
  console.log(
    JSON.stringify(
      {
        status: exec.status,
        ok: exec.ok,
        rail: exec.rail,
        message: exec.message,
        approvalTxSignature: (exec as unknown as { approvalTxSignature?: string }).approvalTxSignature,
        signatureHex: (exec as unknown as { signatureHex?: string }).signatureHex,
        messageApprovalPda: (exec as unknown as { messageApprovalPda?: string }).messageApprovalPda,
        lifecycleReason: (exec as unknown as { reason?: string }).reason,
        lifecycleCode: (exec as unknown as { code?: string }).code,
        ...(exec.status === 'executed' && {
          destinationChain: exec.destinationChain,
          destinationTxHash: exec.destinationTxHash,
          destinationExplorerUrl: exec.destinationExplorerUrl,
          signatureHex: exec.signatureHex,
          messageApprovalPda: exec.messageApprovalPda,
        }),
        ...(exec.status === 'broadcast-disabled' && {
          signatureHex: (exec as unknown as { signatureHex?: string }).signatureHex,
          messageApprovalPda: (exec as unknown as { messageApprovalPda?: string }).messageApprovalPda,
        }),
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log('execute error:', e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
}

process.exit(0);
