import { describe, expect, test } from 'vitest'
import type { ConsoleState, ReceiptEntry } from '../use-console-actions'
import {
  deriveReadiness,
  getActiveIkaChain,
  getReadinessPills,
  hasActiveSession,
  isAgentGasFunded,
  isCustodyFunded,
  latestRailVerdict,
  latestReceipt,
  nextBlockingStep,
} from './console-selectors'

/**
 * Unit tests for `console-selectors.ts`. Each scenario is a stable
 * snapshot of `ConsoleState` representing one step on the canonical
 * Polet onboarding journey:
 *
 *   1. disconnected           — no wallet
 *   2. justConnected          — wallet adapter ready, no on-chain data
 *   3. walletInitialized      — PDA exists, no custody yet
 *   4. custodyRegistered      — accounts exist, USDC balance still 0
 *   5. custodyFunded          — USDC > 0, policy still pending
 *   6. policySealed           — policy enabled, no session yet
 *   7. sessionActive          — session granted, no gas funded
 *   8. allReady               — gas funded, ready to execute
 */

function makeReceipt(action: string, status: ReceiptEntry['status'] = 'info'): ReceiptEntry {
  return {
    id: action,
    timestamp: 0,
    action,
    description: '',
    status,
  }
}

function makeState(over: Partial<ConsoleState>): ConsoleState {
  return {
    connected: false,
    publicKey: null,
    data: null,
    solBalance: null,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
    ...over,
  }
}

const NEAR_FUTURE_EPOCH = Math.floor(Date.now() / 1000) + 3600

const scenarios: Record<string, ConsoleState> = {
  disconnected: makeState({ connected: false }),
  justConnected: makeState({
    connected: true,
    data: null,
  }),
  walletInitialized: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
    },
  }),
  custodyRegistered: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
      demoCustody: { configured: true },
    },
  }),
  custodyFunded: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
      demoCustody: { configured: true },
      custodyBalances: { usdcUi: '5.00' },
    },
  }),
  policySealed: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
      demoCustody: { configured: true },
      custodyBalances: { usdcUi: '5.00' },
      usdcDcaPolicy: { enabled: true },
      policySeq: 42,
    },
  }),
  sessionActive: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
      demoCustody: { configured: true },
      custodyBalances: { usdcUi: '5.00' },
      usdcDcaPolicy: { enabled: true },
      policySeq: 42,
      temporalKeys: [
        {
          key: 'SESSIONKEY',
          authorized: true,
          expiresAt: NEAR_FUTURE_EPOCH,
        },
      ],
    },
  }),
  allReady: makeState({
    connected: true,
    data: {
      walletPda: 'WALLETPDA',
      demoCustody: { configured: true },
      custodyBalances: { usdcUi: '5.00' },
      usdcDcaPolicy: { enabled: true },
      policySeq: 42,
      temporalKeys: [
        {
          key: 'SESSIONKEY',
          authorized: true,
          expiresAt: NEAR_FUTURE_EPOCH,
        },
      ],
    },
    // sessionKeypair just needs to be truthy for the gas heuristic;
    // we shape-cast to the real type without actually importing
    // @solana/web3.js in this unit test.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionKeypair: { publicKey: { toBase58: () => 'SESSIONKEY' } } as any,
    receipts: [makeReceipt('0.05 SOL FUNDED TO AGENT')],
  }),
}

describe('deriveReadiness', () => {
  test('disconnected → everything pending', () => {
    const r = deriveReadiness(scenarios.disconnected)
    expect(r).toEqual({
      wallet: 'pending',
      custody: 'pending',
      policy: 'pending',
      session: 'pending',
      gas: 'pending',
    })
  })

  test('walletInitialized → wallet done, rest pending', () => {
    const r = deriveReadiness(scenarios.walletInitialized)
    expect(r.wallet).toBe('done')
    expect(r.custody).toBe('pending')
    expect(r.policy).toBe('pending')
    expect(r.session).toBe('pending')
    expect(r.gas).toBe('pending')
  })

  test('custodyRegistered → custody is needs (registered but unfunded)', () => {
    const r = deriveReadiness(scenarios.custodyRegistered)
    expect(r.custody).toBe('needs')
  })

  test('custodyFunded → custody done', () => {
    const r = deriveReadiness(scenarios.custodyFunded)
    expect(r.custody).toBe('done')
  })

  test('policySealed → policy done; session/gas still pending', () => {
    const r = deriveReadiness(scenarios.policySealed)
    expect(r.policy).toBe('done')
    expect(r.session).toBe('pending')
    expect(r.gas).toBe('pending')
  })

  test('sessionActive → session done; gas needs (session active but unfunded)', () => {
    const r = deriveReadiness(scenarios.sessionActive)
    expect(r.session).toBe('done')
    expect(r.gas).toBe('needs')
  })

  test('allReady → everything done', () => {
    const r = deriveReadiness(scenarios.allReady)
    expect(r).toEqual({
      wallet: 'done',
      custody: 'done',
      policy: 'done',
      session: 'done',
      gas: 'done',
    })
  })

  test('uses fund-gas receipt to mark gas done even when balance is unknown', () => {
    // Same as sessionActive but with a fund-gas receipt + sessionKeypair.
    const s = makeState({
      ...scenarios.sessionActive,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionKeypair: {} as any,
      receipts: [makeReceipt('0.05 SOL FUNDED TO AGENT')],
    })
    expect(deriveReadiness(s).gas).toBe('done')
  })
})

describe('nextBlockingStep', () => {
  test('returns null when everything is done', () => {
    expect(nextBlockingStep(scenarios.allReady)).toBeNull()
  })

  test('returns wallet when disconnected', () => {
    expect(nextBlockingStep(scenarios.disconnected)).toBe('wallet')
  })

  test('returns custody after wallet initialized', () => {
    expect(nextBlockingStep(scenarios.walletInitialized)).toBe('custody')
  })

  test('returns policy after custody funded', () => {
    expect(nextBlockingStep(scenarios.custodyFunded)).toBe('policy')
  })

  test('returns session after policy sealed', () => {
    expect(nextBlockingStep(scenarios.policySealed)).toBe('session')
  })

  test('returns gas when session active but unfunded', () => {
    expect(nextBlockingStep(scenarios.sessionActive)).toBe('gas')
  })
})

describe('isCustodyFunded', () => {
  test('false when balance is 0 and no deposit receipt', () => {
    expect(isCustodyFunded(scenarios.custodyRegistered)).toBe(false)
  })

  test('true when balance is > 0', () => {
    expect(isCustodyFunded(scenarios.custodyFunded)).toBe(true)
  })

  test('true when a deposit receipt is present', () => {
    const s = makeState({
      ...scenarios.custodyRegistered,
      receipts: [makeReceipt('5 USDC DEPOSITED')],
    })
    expect(isCustodyFunded(s)).toBe(true)
  })
})

describe('hasActiveSession', () => {
  test('false when no sessions array', () => {
    expect(hasActiveSession(scenarios.justConnected)).toBe(false)
  })

  test('true when temporalKeys has an authorized, unexpired entry', () => {
    expect(hasActiveSession(scenarios.sessionActive)).toBe(true)
  })

  test('false when the only session has expired', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    const s = makeState({
      connected: true,
      data: {
        temporalKeys: [{ key: 'X', authorized: true, expiresAt: past }],
      },
    })
    expect(hasActiveSession(s)).toBe(false)
  })

  test('false when the entry exists but is not authorized', () => {
    const s = makeState({
      connected: true,
      data: {
        temporalKeys: [{ key: 'X', authorized: false, expiresAt: NEAR_FUTURE_EPOCH }],
      },
    })
    expect(hasActiveSession(s)).toBe(false)
  })
})

describe('isAgentGasFunded', () => {
  test('false when no sessionKeypair', () => {
    expect(isAgentGasFunded(scenarios.sessionActive)).toBe(false)
  })

  test('true with sessionKeypair AND a fund-gas receipt', () => {
    expect(isAgentGasFunded(scenarios.allReady)).toBe(true)
  })

  test('false with sessionKeypair but no fund-gas receipt', () => {
    const s = makeState({
      ...scenarios.allReady,
      receipts: [],
    })
    expect(isAgentGasFunded(s)).toBe(false)
  })
})

describe('latestReceipt + latestRailVerdict', () => {
  test('latestReceipt picks the head of the feed', () => {
    const s = makeState({
      receipts: [makeReceipt('A'), makeReceipt('B')],
    })
    expect(latestReceipt(s)?.action).toBe('A')
  })

  test('latestReceipt returns null on empty feed', () => {
    expect(latestReceipt(makeState({}))).toBeNull()
  })

  test('latestRailVerdict picks the first matching rail entry', () => {
    const s = makeState({
      receipts: [
        makeReceipt('5 USDC APPROVED (JUPITER)', 'allowed'),
        makeReceipt('5 USDC APPROVED (IKA)', 'allowed'),
      ],
    })
    expect(latestRailVerdict(s, 'jupiter')?.entry.action).toContain('JUPITER')
    expect(latestRailVerdict(s, 'ika')?.entry.action).toContain('IKA')
  })

  test('latestRailVerdict returns null when no matching rail receipt', () => {
    expect(latestRailVerdict(makeState({}), 'jupiter')).toBeNull()
  })
})

describe('getActiveIkaChain', () => {
  test('null when no registration', () => {
    expect(getActiveIkaChain(scenarios.allReady)).toBeNull()
  })

  test('sui when registration label is managed-curve25519', () => {
    const s = makeState({
      connected: true,
      data: {
        ikaManaged: {
          registration: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: 'managed-curve25519' as any,
            curve: 2,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          gas: null,
          fixtureAvailable: true,
          fixtureDisclosure: null,
        },
      },
    })
    expect(getActiveIkaChain(s)).toBe('sui')
  })

  test('ethereum when registration label is managed-secp256k1', () => {
    const s = makeState({
      connected: true,
      data: {
        ikaManaged: {
          registration: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: 'managed-secp256k1' as any,
            curve: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          gas: null,
          fixtureAvailable: true,
          fixtureDisclosure: null,
        },
      },
    })
    expect(getActiveIkaChain(s)).toBe('ethereum')
  })
})

describe('getReadinessPills', () => {
  test('returns 5 pills in canonical order', () => {
    const pills = getReadinessPills(scenarios.disconnected)
    expect(pills.map((p) => p.slot)).toEqual([
      'wallet',
      'custody',
      'policy',
      'session',
      'gas',
    ])
    for (const p of pills) {
      expect(p.value).toBe('pending')
    }
  })

  test('marks each slot done when all ready', () => {
    const pills = getReadinessPills(scenarios.allReady)
    expect(pills.every((p) => p.value === 'done')).toBe(true)
  })
})
