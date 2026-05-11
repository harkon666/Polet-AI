import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 4 Funds & Setup tests (issue 102).
 */

function ensureLocalStorage() {
  if (typeof window.localStorage?.setItem === 'function') return
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v)
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k]
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length
      },
    },
  })
}
ensureLocalStorage()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to?: string
  } & Record<string, unknown>) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content, react/no-children-prop
    <a href={to ?? '#'} {...(props as Record<string, unknown>)} children={children} />
  ),
  useLocation: () => ({ pathname: '/app/funds' }),
}))

type MockState = {
  connected: boolean
  publicKey: null
  data: Record<string, unknown> | null
  solBalance: number | null
  receipts: Array<Record<string, unknown>>
  loading: string | null
  error: null
  sessionKeypair: Record<string, unknown> | null
}

const mockState: { current: MockState } = {
  current: {
    connected: true,
    publicKey: null,
    data: null,
    solBalance: null,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
  },
}

const actionSpies = {
  initializeWallet: vi.fn(async () => {}),
  registerCustody: vi.fn(async () => {}),
  saveConfidentialPolicy: vi.fn(async () => {}),
  grantAgentSession: vi.fn(async () => {}),
  regrantAgentSession: vi.fn(async () => {}),
  depositCustody: vi.fn(async () => {}),
  withdrawCustody: vi.fn(async () => {}),
  fundAgentGas: vi.fn(async () => {}),
  enableIkaChain: vi.fn(async () => {}),
}

vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({ state: mockState.current, actions: actionSpies }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppFundsPage } from './app.funds'

const FUTURE = Math.floor(Date.now() / 1000) + 3600

afterEach(() => {
  document.body.innerHTML = ''
  for (const fn of Object.values(actionSpies)) fn.mockReset()
  mockState.current = {
    connected: true,
    publicKey: null,
    data: null,
    solBalance: null,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
  }
})

beforeEach(() => {
  try {
    window.localStorage.removeItem('polet.locale')
  } catch {
    // ignore
  }
  document.documentElement.setAttribute('lang', 'en')
})

describe('Polet Portal — Phase 4 Funds & Setup', () => {
  test('renders 4 funds rows + 5 setup rows from disconnected state', () => {
    render(<AppFundsPage />)
    expect(document.querySelector('[data-testid="funds-row-usdc"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="funds-row-sol"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="funds-row-gas"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="funds-row-ika"]')).not.toBeNull()
    for (const row of ['pda', 'custody', 'policy', 'session', 'authority']) {
      expect(
        document.querySelector(`[data-testid="setup-row-${row}"]`),
      ).not.toBeNull()
    }
  })

  test('inline action button appears on pending PDA row and fires initializeWallet', () => {
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="setup-action-pda"]',
    ) as HTMLButtonElement
    expect(btn).not.toBeNull()
    fireEvent.click(btn)
    expect(actionSpies.initializeWallet).toHaveBeenCalledTimes(1)
  })

  test('PDA row hides inline action once initialized; shows shortened PDA', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
      },
    }
    render(<AppFundsPage />)
    expect(document.querySelector('[data-testid="setup-action-pda"]')).toBeNull()
    const row = document.querySelector('[data-testid="setup-row-pda"]')
    expect(row?.getAttribute('data-state')).toBe('done')
    expect(row?.textContent ?? '').toMatch(/PDA1…1111/)
  })

  test('Deposit action disabled when custody not registered', () => {
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="funds-action-deposit"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  test('Deposit action enabled + fires depositCustody when custody registered', () => {
    mockState.current = {
      ...mockState.current,
      data: { demoCustody: { configured: true } },
    }
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="funds-action-deposit"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(actionSpies.depositCustody).toHaveBeenCalledWith('USDC', '5')
  })

  test('Fund gas action disabled without active session', () => {
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="funds-action-fund-gas"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  test('Fund gas action enabled + fires fundAgentGas when session active', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        temporalKeys: [{ authorized: true, expiresAt: FUTURE }] as any,
      },
    }
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="funds-action-fund-gas"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(actionSpies.fundAgentGas).toHaveBeenCalledWith('0.05')
  })

  test('Enable chain disabled when Ika sui already active', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ikaManaged: {
          registration: { label: 'managed-curve25519', curve: 2 },
        } as any,
      },
    }
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="funds-action-enable-chain"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  test('custody row shows funded value once registered AND positive balance', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        demoCustody: { configured: true },
        custodyBalances: { usdcUi: '5' },
      },
    }
    render(<AppFundsPage />)
    const custodyRow = document.querySelector(
      '[data-testid="setup-row-custody"]',
    )
    expect(custodyRow?.getAttribute('data-state')).toBe('done')
    expect(document.body.textContent ?? '').toContain('5.000')
  })

  test('re-grant button appears when session active but sessionKeypair missing', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        temporalKeys: [{ authorized: true, expiresAt: FUTURE }] as any,
      },
      sessionKeypair: null,
    }
    render(<AppFundsPage />)
    const btn = document.querySelector(
      '[data-testid="setup-action-regrant"]',
    ) as HTMLButtonElement
    expect(btn).not.toBeNull()
    fireEvent.click(btn)
    expect(actionSpies.regrantAgentSession).toHaveBeenCalledTimes(1)
  })

  test('ID locale mirrors hero + key list labels', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppFundsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Kontrol owner dalam dua kolom kalem.')
    expect(body).toContain('Custody USDC')
    expect(body).toContain('Otorisasi sesi')
  })
})
