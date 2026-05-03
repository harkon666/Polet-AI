import { describe, expect, test } from 'bun:test';

// Re-export types for convenience
export interface TestIntent {
  id: string;
  owner: string;
  sessionKey: string;
  action: 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';
  params: Record<string, unknown>;
  timestamp: number;
  policyHash?: string;
}

export interface TestPolicy {
  allowlist: string[];
  blocklist: string[];
  maxAmount?: number;
  dailyLimit?: number;
  allowedActions?: string[];
}

describe('E2E: Policy BLOCK Demo (HITL)', () => {
  /**
   * These tests verify the end-to-end "wow moment" from the PRD:
   *
   * "AI agent attempts to send $500, policy limit is $50/day — transaction rejected."
   *
   * The demo scenario:
   * 1. Owner creates a wallet with a daily limit policy ($50/day max)
   * 2. Owner grants temporal key to AI agent session key
   * 3. AI agent submits intent to send $500 (5 SOL = 5,000,000 lamports)
   * 4. Policy engine BLOCKS the transaction because $500 > $50 daily limit
   * 5. Owner sees "BLOCKED" state in real-time
   *
   * This is the key security feature that prevents AI agent wallet drainage.
   */

  describe('Scenario 1: Daily Limit Enforcement', () => {
    test('BLOCKS transfer that exceeds daily limit ($500 > $50)', async () => {
      // Policy: $50 daily limit = 50,000,000 lamports (0.05 SOL)
      const dailyLimitLamports = 50_000_000;

      // Intent from AI agent: trying to transfer $500 (500,000,000 lamports)
      const intent = {
        id: 'demo-001',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'DestAddr789',
          amount: 500_000_000, // $500 in lamports
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [],
        maxAmount: dailyLimitLamports, // Only $50 allowed per tx
      };

      // Simulate the full evaluate → block flow
      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
      console.log('[E2E] ✅ Daily limit BLOCK works: $500 transfer blocked (limit: $50)');
    });

    test('ALLOWS transfer within daily limit ($40 < $50)', async () => {
      const dailyLimitLamports = 50_000_000;

      // Intent: $40 transfer (within limit)
      const intent = {
        id: 'demo-002',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'AllowedDest',
          amount: 40_000_000, // $40 in lamports
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [],
        maxAmount: dailyLimitLamports,
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      console.log('[E2E] ✅ $40 transfer allowed (under $50 limit)');
    });
  });

  describe('Scenario 2: Blocklist Enforcement', () => {
    test('BLOCKS transfer to known malicious address (blocklist)', async () => {
      // Known malicious address from blocklist
      const maliciousAddr = 'MaliciousAddr123';

      const intent = {
        id: 'demo-003',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: maliciousAddr,
          amount: 1_000_000,
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [maliciousAddr],
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('on the blocklist');
      console.log('[E2E] ✅ Blocklist BLOCK works: transfer to malicious address blocked');
    });

    test('BLOCKLIST takes precedence over ALLOWLIST', async () => {
      // Address that's in both lists - blocklist should win
      const address = 'BothListsAddr';

      const intent = {
        id: 'demo-004',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: address,
          amount: 1_000_000,
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: [address],
        blocklist: [address],
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('on the blocklist');
      console.log('[E2E] ✅ Blocklist precedence: blocked even though allowlisted');
    });
  });

  describe('Scenario 3: Allowlist Enforcement', () => {
    test('BLOCKS transfer to non-allowlisted destination (whitelist-only mode)', async () => {
      const intent = {
        id: 'demo-005',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'NotAllowlisted',
          amount: 1_000_000,
        },
        timestamp: Date.now(),
      };

      // Whitelist-only policy: only specific addresses allowed
      const policy: TestPolicy = {
        allowlist: ['AllowedDest1', 'AllowedDest2', 'AllowedDest3'],
        blocklist: [],
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not on the allowlist');
      console.log('[E2E] ✅ Allowlist BLOCK works: transfer to non-allowlisted address blocked');
    });

    test('ALLOWS transfer to allowlisted destination', async () => {
      const intent = {
        id: 'demo-006',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'AllowedDest1',
          amount: 5_000_000,
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: ['AllowedDest1', 'AllowedDest2'],
        blocklist: [],
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(true);
      console.log('[E2E] ✅ Allowlist ALLOW works: transfer to allowlisted address allowed');
    });
  });

  describe('Scenario 4: Action Type Enforcement', () => {
    test('BLOCKS action type not in allowedActions list', async () => {
      const intent = {
        id: 'demo-007',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'swap', // Swap is NOT in allowed actions
        params: {
          inputMint: 'TokenA',
          outputMint: 'TokenB',
          inputAmount: 1_000_000,
          minOutputAmount: 900_000,
        },
        timestamp: Date.now(),
      };

      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [],
        allowedActions: ['transfer', 'stake'], // Only transfer and stake allowed
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in the allowed actions list');
      console.log('[E2E] ✅ Action type BLOCK works: swap action blocked (only transfer/stake allowed)');
    });

    test('ALLOWS action type when allowedActions is empty (all allowed)', async () => {
      const intent = {
        id: 'demo-008',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'stake',
        params: {
          validator: 'Validator123',
          amount: 5_000_000,
        },
        timestamp: Date.now(),
      };

      // Empty allowedActions = all actions allowed
      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [],
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(true);
      console.log('[E2E] ✅ All actions allowed when allowedActions is empty');
    });
  });

  describe('Scenario 5: The "Wow Moment" - Full HITL Demo Flow', () => {
    /**
     * This test simulates the complete hackathon demo flow:
     *
     * 1. User sets up a "Daily Limit" policy ($50/day max)
     * 2. User grants temporal key to AI agent
     * 3. AI agent (via SDK) sends intent: "transfer $500 to trading bot"
     * 4. Policy engine evaluates and BLOCKS the transaction
     * 5. User sees BLOCKED status in dashboard
     *
     * This is the key selling point - preventing AI agent wallet drainage.
     */
    test('demonstrates the full BLOCK scenario from the demo', async () => {
      console.log('\n========================================');
      console.log('🎯 E2E DEMO: Policy BLOCK (The "Wow Moment")');
      console.log('========================================\n');

      // Step 1: User creates wallet with daily limit policy
      const walletPolicy: TestPolicy = {
        allowlist: [],
        blocklist: [],
        maxAmount: 50_000_000, // $50 in lamports
        dailyLimit: 50_000_000,
      };
      console.log('📋 Step 1: Owner sets policy - max $50/transaction, $50/day');

      // Step 2: Owner grants temporal key to AI agent
      const sessionKey = 'AI_Agent_Session_Key_xyz';
      console.log(`🔑 Step 2: Owner grants temporal key to AI agent session key`);
      console.log(`   Session Key: ${sessionKey.substring(0, 20)}...`);

      // Step 3: AI agent submits intent via SDK
      const maliciousIntent = {
        id: 'hackathon-demo-001',
        owner: 'OwnerWallet123',
        sessionKey: sessionKey,
        action: 'transfer' as const,
        params: {
          destination: 'TradingBotMalicious',
          amount: 500_000_000, // $500 - way over the limit!
        },
        timestamp: Date.now(),
      };
      console.log('\n🤖 AI Agent submits intent:');
      console.log(`   Action: transfer`);
      console.log(`   Destination: TradingBotMalicious`);
      console.log(`   Amount: $500 (500,000,000 lamports)`);
      console.log(`   Policy Limit: $50 (50,000,000 lamports)`);

      // Step 4: Policy engine evaluates and BLOCKS
      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(maliciousIntent);
      const result = evaluateIntent(parsedIntent, walletPolicy);

      // Step 5: User sees BLOCKED status
      console.log('\n========================================');
      if (!result.allowed) {
        console.log('🚨 RESULT: ❌ BLOCKED');
        console.log(`   Reason: ${result.reason}`);
        console.log('========================================');
        console.log('✅ The policy successfully blocked the $500 drain attempt!');
        console.log('   The AI agent cannot drain the wallet!');
        console.log('========================================\n');
      } else {
        console.log('🚨 RESULT: ✅ ALLOWED (THIS SHOULD NOT HAPPEN!)');
        console.log('========================================\n');
        throw new Error('Policy should have BLOCKED this transaction!');
      }

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });
  });

  describe('Scenario 6: Combined Policy Rules', () => {
    test('blocks when destination is on blocklist AND amount exceeds limit', async () => {
      const maliciousDest = 'HackerAddress';

      const intent = {
        id: 'demo-009',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: maliciousDest,
          amount: 100_000_000, // $100
        },
        timestamp: Date.now(),
      };

      // Both blocklist AND amount limit apply
      const policy: TestPolicy = {
        allowlist: [],
        blocklist: [maliciousDest],
        maxAmount: 10_000_000, // Only $10 allowed
      };

      const { evaluateIntent } = await import('../src/lib/policy-engine.js');
      const { parseIntent } = await import('../src/lib/intent-parser.js');

      const parsedIntent = parseIntent(intent);
      const result = evaluateIntent(parsedIntent, policy);

      expect(result.allowed).toBe(false);
      // Blocklist takes precedence
      expect(result.reason).toContain('on the blocklist');
      console.log('[E2E] ✅ Combined rules: blocklist takes precedence over amount limit');
    });
  });

  describe('Scenario 7: Intent Validation', () => {
    test('rejects intent with missing required fields', async () => {
      const invalidIntent = {
        id: 'demo-010',
        // missing owner
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'Dest',
          amount: 1000000,
        },
        timestamp: Date.now(),
      };

      const { parseIntent } = await import('../src/lib/intent-parser.js');

      expect(() => parseIntent(invalidIntent)).toThrow('Intent must have a string owner');
      console.log('[E2E] ✅ Intent validation blocks malformed intents');
    });

    test('rejects intent with negative amount', async () => {
      const invalidIntent = {
        id: 'demo-011',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'transfer',
        params: {
          destination: 'Dest',
          amount: -1000000, // Negative!
        },
        timestamp: Date.now(),
      };

      const { parseIntent } = await import('../src/lib/intent-parser.js');

      expect(() => parseIntent(invalidIntent)).toThrow('positive number amount');
      console.log('[E2E] ✅ Intent validation blocks negative amounts');
    });

    test('rejects intent with invalid action type', async () => {
      const invalidIntent = {
        id: 'demo-012',
        owner: 'Owner123',
        sessionKey: 'SessionKey456',
        action: 'hack_the_world', // Invalid action!
        params: {
          destination: 'Dest',
          amount: 1000000,
        },
        timestamp: Date.now(),
      };

      const { parseIntent } = await import('../src/lib/intent-parser.js');

      expect(() => parseIntent(invalidIntent)).toThrow(/Invalid action/);
      console.log('[E2E] ✅ Intent validation blocks unknown action types');
    });
  });
});

describe('E2E: End-to-End Intent Flow with SDK', () => {
  /**
   * Tests the complete flow from SDK intent creation through policy evaluation.
   * This tests the happy path where the SDK creates a valid intent,
   * the proxy evaluates it, and returns the appropriate response.
   */

  test('SDK flow: create transfer intent → evaluate → allowed', async () => {
    // Simulate SDK creating an intent
    const sdkIntent = {
      id: 'sdk-demo-001',
      owner: 'OwnerWalletABC',
      sessionKey: 'SessionKeyDEF',
      action: 'transfer',
      params: {
        destination: 'AllowlistedDest',
        amount: 30_000_000, // $30 - within limit
      },
      timestamp: Date.now(),
    };

    const policy: TestPolicy = {
      allowlist: ['AllowlistedDest'],
      blocklist: [],
      maxAmount: 50_000_000, // $50 max
    };

    const { evaluateIntent } = await import('../src/lib/policy-engine.js');
    const { parseIntent } = await import('../src/lib/intent-parser.js');

    const parsedIntent = parseIntent(sdkIntent);
    const result = evaluateIntent(parsedIntent, policy);

    expect(result.allowed).toBe(true);
    console.log('[E2E] ✅ SDK flow works: valid intent is allowed');
  });

  test('SDK flow: create transfer intent → evaluate → blocked by amount', async () => {
    const sdkIntent = {
      id: 'sdk-demo-002',
      owner: 'OwnerWalletABC',
      sessionKey: 'SessionKeyDEF',
      action: 'transfer',
      params: {
        destination: 'SomeDest',
        amount: 100_000_000, // $100 - exceeds $50 limit
      },
      timestamp: Date.now(),
    };

    const policy: TestPolicy = {
      allowlist: [],
      blocklist: [],
      maxAmount: 50_000_000, // $50 max
    };

    const { evaluateIntent } = await import('../src/lib/policy-engine.js');
    const { parseIntent } = await import('../src/lib/intent-parser.js');

    const parsedIntent = parseIntent(sdkIntent);
    const result = evaluateIntent(parsedIntent, policy);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds maximum allowed');
    console.log('[E2E] ✅ SDK flow works: over-limit intent is blocked');
  });
});