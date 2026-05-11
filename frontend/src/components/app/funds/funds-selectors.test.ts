import { describe, expect, test } from 'vitest'
import type { ConsoleState } from '../use-console-actions'
import {
  getAgentGasStatus,
  getCustodyBalances,
  getIkaDwalletStatus,
  getOwnerAuthority,
} from './funds-selectors'

function makeState(over: Partial<ConsoleState>): ConsoleState {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connected: false as any,
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

describe('getCustodyBalances', () => {
  test('returns zeros + unfunded when no data', () => {
    const b = getCustodyBalances(makeState({}))
    expect(b.usdc).toBe('0.000')
    expect(b.sol).toBe('0.000')
    expect(b.hasUsdc).toBe(false)
    expect(b.funded).toBe(false)
  })

  test('formats positive balances', () => {
    const s = makeState({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        custodyBalances: { usdcUi: '17.5', nativeSolUi: '0.123' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
    const b = getCustodyBalances(s)
    expect(b.usdc).toBe('17.500')
    expect(b.sol).toBe('0.123')
    expect(b.hasUsdc).toBe(true)
    expect(b.funded).toBe(true)
  })

  test('flags funded via deposit receipt even when balance is zero', () => {
    const s = makeState({
      receipts: [
        {
          id: 'r-1',
          timestamp: Date.now(),
          action: '5 USDC DEPOSITED',
          description: 'deposit',
          status: 'allowed',
        },
      ],
    })
    expect(getCustodyBalances(s).funded).toBe(true)
  })
})

describe('getAgentGasStatus', () => {
  test('pending when no session', () => {
    expect(getAgentGasStatus(makeState({}))).toBe('pending')
  })

  test('needs when session active but no fund-gas receipt', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const s = makeState({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        temporalKeys: [{ authorized: true, expiresAt: future }] as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionKeypair: null,
    })
    expect(getAgentGasStatus(s)).toBe('needs')
  })

  test('done when keypair present and fund-gas receipt seen', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const s = makeState({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        temporalKeys: [{ authorized: true, expiresAt: future }] as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionKeypair: { publicKey: { toBase58: () => 'X' } } as any,
      receipts: [
        {
          id: 'g',
          timestamp: Date.now(),
          action: 'SOL FUNDED TO AGENT',
          description: 'funded',
          status: 'allowed',
        },
      ],
    })
    expect(getAgentGasStatus(s)).toBe('done')
  })
})

describe('getIkaDwalletStatus', () => {
  test('null when no managed registration', () => {
    expect(getIkaDwalletStatus(makeState({}))).toBeNull()
  })

  test('sui label when curve 2 registered', () => {
    const s = makeState({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ikaManaged: {
          registration: { label: 'managed-curve25519', curve: 2 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
    expect(getIkaDwalletStatus(s)?.chain).toBe('sui')
    expect(getIkaDwalletStatus(s)?.label).toContain('Sui')
  })
})

describe('getOwnerAuthority', () => {
  test('always returns "owner" today (placeholder for recovery work)', () => {
    expect(getOwnerAuthority(makeState({}))).toBe('owner')
  })
})
