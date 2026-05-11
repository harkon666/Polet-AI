import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 2 workspace state tests (issue 100).
 *
 * Exercises every blocking-step branch of `<AppWorkspacePage>`:
 *   - wallet  → Funds CTA + "Initialize…" title
 *   - custody → Funds CTA + "Fund custody…" title
 *   - policy  → Funds CTA + "Seal…" title
 *   - session → Funds CTA + "Authorize…" title
 *   - gas     → Funds CTA + "Top up…" title
 *   - null    → Gate CTA + "All rails ready…" title, ready status pill
 *
 * Plus:
 *   - Populated receipts render the activity line in "present" mode
 *     with the action tag coloured per `receipt.status`.
 *   - ID locale mirrors render for the blocking-wallet case.
 *
 * The page is rendered in isolation — no `<ConsoleStateProvider>`,
 * no wallet adapter — via module-level `vi.mock()` stubs. `useConsole`
 * is wired through a mutable `mockState` reference so each test picks
 * the snapshot it wants without re-mocking.
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
  useLocation: () => ({ pathname: '/app/workspace' }),
}))

// Mutable container so each test can pick its snapshot.
type MockState = {
  connected: boolean
  publicKey: null
  data: Record<string, unknown> | null
  solBalance: number | null
  receipts: Array<Record<string, unknown>>
  loading: null
  error: null
  sessionKeypair: Record<string, unknown> | null
}

const mockState: { current: MockState } = {
  current: {
    connected: false,
    publicKey: null,
    data: null,
    solBalance: null,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
  },
}

vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({ state: mockState.current, actions: {} }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppWorkspacePage } from './app.workspace'

/** Future-dated epoch so hasActiveSession() stays true. */
const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600

afterEach(() => {
  document.body.innerHTML = ''
  // Restore default disconnected snapshot.
  mockState.current = {
    connected: false,
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

describe('Polet Portal — Phase 2 workspace', () => {
  test('wallet blocking → Funds CTA + initialize title + all 5 pills pending', () => {
    // Disconnected default snapshot.
    render(<AppWorkspacePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Initialize your smart-wallet PDA to begin.')
    expect(body).toMatch(/setup pending/i)
    expect(body).toContain('Open Funds & Setup')
    const primary = document.querySelector(
      '[data-testid="workspace-continue-cta"]',
    )
    expect(primary?.getAttribute('data-target')).toBe('/app/funds')
    const pills = document.querySelectorAll('[data-testid^="readiness-pill-"]')
    expect(pills).toHaveLength(5)
    // Every pill is pending (no state data).
    for (const p of Array.from(pills)) {
      expect(p.getAttribute('data-state')).toBe('pending')
    }
  })

  test('custody blocking → Fund custody title', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
      },
    }
    render(<AppWorkspacePage />)
    expect(document.body.textContent ?? '').toContain(
      'Fund custody with demo USDC so the policy has something to meter.',
    )
    // wallet pill should now be done
    const walletPill = document.querySelector(
      '[data-testid="readiness-pill-wallet"]',
    )
    expect(walletPill?.getAttribute('data-state')).toBe('done')
  })

  test('policy blocking → Seal policy title', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
        demoCustody: { configured: true },
        custodyBalances: { usdcUi: '5' },
      },
    }
    render(<AppWorkspacePage />)
    expect(document.body.textContent ?? '').toContain(
      'Seal your confidential numeric policy.',
    )
  })

  test('session blocking → Authorize session title', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
        demoCustody: { configured: true },
        custodyBalances: { usdcUi: '5' },
        usdcDcaPolicy: { enabled: true },
        policySeq: 1,
      },
    }
    render(<AppWorkspacePage />)
    expect(document.body.textContent ?? '').toContain(
      'Authorize a time-boxed agent session key.',
    )
  })

  test('gas blocking → Top up session title, session pill done', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
        demoCustody: { configured: true },
        custodyBalances: { usdcUi: '5' },
        usdcDcaPolicy: { enabled: true },
        policySeq: 1,
        temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
      },
      sessionKeypair: null,
    }
    render(<AppWorkspacePage />)
    expect(document.body.textContent ?? '').toContain(
      'Top up the session with gas so the agent can sign.',
    )
    const sessionPill = document.querySelector(
      '[data-testid="readiness-pill-session"]',
    )
    expect(sessionPill?.getAttribute('data-state')).toBe('done')
    const gasPill = document.querySelector(
      '[data-testid="readiness-pill-gas"]',
    )
    // Session active without a gas-funding receipt → 'needs'.
    expect(gasPill?.getAttribute('data-state')).toBe('needs')
  })

  test('all ready → Gate CTA + ready status pill + compose label', () => {
    mockState.current = {
      ...mockState.current,
      data: {
        walletPda: 'PDA11111111111111111111111111111111111111',
        demoCustody: { configured: true },
        custodyBalances: { usdcUi: '5' },
        usdcDcaPolicy: { enabled: true },
        policySeq: 1,
        temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
      },
      sessionKeypair: { publicKey: { toString: () => 'mock' } },
      receipts: [
        {
          id: 'rc-gas',
          timestamp: Date.now(),
          action: 'SOL FUNDED TO AGENT',
          description: 'Funded 0.02 SOL',
          status: 'allowed',
        },
      ],
    }
    render(<AppWorkspacePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('All rails ready. Compose a policy-gated intent.')
    expect(body).toMatch(/ready to execute/i)
    expect(body).toContain('Compose an intent')
    const primary = document.querySelector(
      '[data-testid="workspace-continue-cta"]',
    )
    expect(primary?.getAttribute('data-target')).toBe('/app/gate')
  })

  test('populated receipts → activity line present + status-coloured tag', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'rc-jup-allow',
          timestamp: Date.UTC(2026, 4, 1, 12, 34, 56),
          action: 'JUPITER ALLOWED',
          description: '5 USDC → WSOL DCA',
          status: 'allowed',
        },
      ],
    }
    render(<AppWorkspacePage />)
    const activity = document.querySelector('[data-testid="activity-line"]')
    expect(activity?.getAttribute('data-state')).toBe('present')
    const tag = document.querySelector('[data-testid="activity-tag"]')
    expect(tag?.getAttribute('data-status')).toBe('allowed')
    expect(tag?.className).toContain('text-palm')
    expect(document.body.textContent ?? '').toContain('JUPITER ALLOWED')
    expect(document.body.textContent ?? '').toContain('5 USDC → WSOL DCA')
  })

  test('ID locale mirrors wallet-blocking title', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppWorkspacePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Inisialisasi smart-wallet PDA kamu untuk memulai.')
    expect(body).toContain('Buka Dana & Setup')
  })
})
