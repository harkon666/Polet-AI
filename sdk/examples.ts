/**
 * Polet AI SDK - Usage Examples
 *
 * This file demonstrates how AI agents integrate with the Polet AI SDK
 * to submit secure wallet transactions.
 */

import {
  createTransferIntent,
  createSwapIntent,
  createStakeIntent,
  createCustomIntent,
  createDcaIntent,
  createPoletAgent,
  createRiskGatedSwapIntent,
  isValidIntent,
  generateIntentId,
  submitIntent,
  evaluateIntentWithProxy,
  formatPublicKey,
  estimateFee,
  lamportsToSol,
  type Intent,
  type TransferParams,
} from './index.js';

/**
 * Example 1: Transfer SOL
 *
 * An AI agent wants to transfer 0.05 SOL from the user's wallet to another address.
 * The session key (which has been granted temporal authority) submits this intent.
 */
export async function example_transfer() {
  // Create a transfer intent
  const intent = createTransferIntent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2', // user's wallet
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4', // AI agent's session key
    destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', // recipient
    amount: 50_000_000, // 0.05 SOL in lamports
    policyHash: 'QmXz123456789abcdef', // optional policy hash
  });

  // Validate before sending
  if (!isValidIntent(intent)) {
    throw new Error('Invalid intent - cannot submit to proxy');
  }

  // Submit to the legacy public policy compatibility endpoint.
  const response = await fetch('https://proxy.polet.ai/legacy/intent/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intent),
  });

  const result = await response.json();
  if (!result.allowed) {
    console.error('Transfer blocked:', result.reason);
    return;
  }

  console.log('Transfer approved! Attestation:', result.attestation);
}

/**
 * Example 2: Swap tokens (Jupiter)
 *
 * An AI agent wants to swap 1 SOL for USDC via Jupiter aggregator.
 */
export async function example_swap() {
  const intent = createSwapIntent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    inputMint: 'So11111111111111111111111111111111111111112', // wSOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    inputAmount: 1_000_000_000, // 1 SOL = 1B lamports
    minOutputAmount: 140_000_000, // minimum 140 USDC (with slippage)
    policyHash: 'QmXz123456789abcdef',
  });

  if (!isValidIntent(intent)) {
    throw new Error('Invalid swap intent');
  }

  // Submit to the legacy public policy compatibility endpoint.
  const response = await fetch('https://proxy.polet.ai/legacy/intent/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intent),
  });

  const result = await response.json();
  console.log('Swap evaluation:', result);
}

/**
 * Example 3: Stake SOL (Marinade/Jito)
 *
 * An AI agent wants to stake 5 SOL to a validator.
 */
export async function example_stake() {
  const intent = createStakeIntent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    validator: 'GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x', // validator vote address
    amount: 5_000_000_000, // 5 SOL
    policyHash: 'QmXz123456789abcdef',
  });

  if (!isValidIntent(intent)) {
    throw new Error('Invalid stake intent');
  }

  console.log('Staking', lamportsToSol(intent.params.amount), 'SOL');
  console.log('Estimated fee:', lamportsToSol(estimateFee(1)), 'SOL');
}

/**
 * Example 4: Custom program interaction
 *
 * An AI agent wants to interact with a custom program directly.
 */
export async function example_custom() {
  const intent = createCustomIntent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
    instructionData: 'base64EncodedInstructionData',
    accounts: [
      'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', // source account
      'DxY0lq0rDmQafX2Y22Uj36tB6jzC3mD1kN5oX8yT4zA', // destination account
    ],
    policyHash: 'QmXz123456789abcdef',
  });

  if (!isValidIntent(intent)) {
    throw new Error('Invalid custom intent');
  }

  console.log('Custom program call to', formatPublicKey(intent.params.programId));
}

/**
 * Example 5: Batch intent submission
 *
 * An AI agent wants to execute multiple intents in sequence.
 */
export async function example_batch() {
  const intents: Intent[] = [];

  // Create multiple transfer intents
  for (let i = 0; i < 3; i++) {
    const intent = createTransferIntent({
      owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
      sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
      destination: `Destination${i}Base58Key111111111111111111111111`,
      amount: 10_000_000, // 0.01 SOL each
      intentId: generateIntentId(), // unique ID for each
    });
    intents.push(intent);
  }

  // Submit batch to proxy
  const response = await fetch('https://proxy.polet.ai/intent/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intents }),
  });

  const results = await response.json();
  console.log('Batch results:', results);
}

/**
 * Example 6: OpenClaw Integration Pattern
 *
 * This shows how an OpenClaw agent would use the SDK.
 */
export async function example_openclaw_integration() {
  // In OpenClaw, the AI agent has a session key
  const sessionKey = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
  const userWallet = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';

  // AI decides to execute a transfer
  const intent = createTransferIntent({
    owner: userWallet,
    sessionKey: sessionKey,
    destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
    amount: 100_000_000, // 0.1 SOL
  });

  // Validate locally first
  if (!isValidIntent(intent)) {
    console.error('Invalid intent - OpenClaw should not generate invalid intents');
    return;
  }

  // Send to the legacy public policy compatibility endpoint.
  const result = await fetch('https://proxy.polet.ai/legacy/intent/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intent),
  }).then(r => r.json());

  if (!result.allowed) {
    console.log('[Polet AI] Blocked:', result.reason);
    return;
  }

  console.log('[Polet AI] Approved - executing transaction');
}

/**
 * Example 7: OpenClaw/Hermes DCA Strategy Pattern
 *
 * This is the confidential DCA flow used by the hackathon demo. The agent
 * creates a structured request and lets the Polet proxy perform Jupiter
 * prechecks, confidential policy evaluation, and unsigned transaction building.
 */
export async function example_agent_dca_strategy() {
  const sessionKey = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
  const userWallet = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';
  const proxyUrl = 'https://proxy.polet.ai';

  const intent = createDcaIntent({
    owner: userWallet,
    sessionKey,
    amountUsdc: 5,
    encryptionWitness: Array.from({ length: 32 }, (_, index) => index + 1),
    slippageBps: 100,
  });

  const result = await submitIntent(intent, { baseUrl: proxyUrl });
  console.log('[Polet AI] DCA strategy result:', result);
}

/**
 * Example 8: Risk-Gated Jupiter Swap Evaluation
 *
 * Agent runtimes can ask Polet to evaluate a Jupiter swap intent before
 * execution while preserving compatibility with the existing swap action.
 */
export async function example_agent_risk_gated_swap() {
  const intent = createRiskGatedSwapIntent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    outputMint: 'So11111111111111111111111111111111111111112',
    inputAmount: 5_000_000,
    minOutputAmount: 30_000_000,
    slippageBps: 100,
    risk: {
      maxPriceImpactBps: 50,
      requireVerifiedTokens: true,
    },
  });

  const result = await evaluateIntentWithProxy(intent, {
    baseUrl: 'https://proxy.polet.ai',
  });
  console.log('[Polet AI] Risk-gated swap evaluation:', result);
}

/**
 * Example 9: High-Level Agent Trade API
 *
 * AI agents can use one Polet control-layer interface for guarded trades.
 * Jupiter returns a route/build preview. Ika returns a policy-approved signed
 * intent proof shape plus an unsigned Polet approval transaction for the
 * session signer; this MVP slice does not execute Ika settlement.
 */
export async function example_polet_agent_trade() {
  const polet = createPoletAgent({
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    baseUrl: 'https://proxy.polet.ai',
    encryptionWitness: Array.from({ length: 32 }, (_, index) => index + 1),
  });

  const jupiterPreview = await polet.trade({
    from: 'USDC',
    to: 'SOL',
    amount: '5',
  });

  const ikaRequest = await polet.trade({
    rail: 'ika',
    from: { chain: 'solana', asset: 'USDC' },
    to: { chain: 'sui', asset: 'SUI' },
    amount: '5',
    strategy: 'dca',
  });

  console.log('[Polet AI] Jupiter status:', jupiterPreview.status, jupiterPreview.settlement);
  console.log('[Polet AI] Ika status:', ikaRequest.status, ikaRequest.settlement);
  console.log('[Polet AI] Ika proof:', ikaRequest.details?.proof);

  if (ikaRequest.status === 'blocked') {
    console.log('[Polet AI] Ika blocked without exposing private thresholds.');
  }
  if (ikaRequest.status === 'approval-transaction-prepared') {
    console.log('[Polet AI] Session signer can inspect/sign the Polet approval transaction.');
  }
}
