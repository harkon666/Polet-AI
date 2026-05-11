import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 3 Policy Gate tests (issue 101).
 *
 * Exercises:
 *   - Scenario click flips composer state + rail.
 *   - Intent composer's rail control propagates back to the route.
 *   - Action buttons fire the correct `useConsole().actions.*` key per
 *     rail (preview / try-blocked / execute).
 *   - Verdict line + orb word reflect the latest receipt per rail.
 *   - Disabled states activate under each precondition (no session,
 *     no session keypair, no Ika managed chain).
 *   - ID locale mirror renders.
 *
 * The page is mounted in isolation — no real `<ConsoleStateProvider>`,
 * no wallet adapter — via module-level `vi.mock()` stubs.
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
  useLocation: () => ({ pathname: '/app/gate' }),
}))

// Mutable container for the mocked console state + action spies.
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
  runJupiterAllow: vi.fn(async () => {}),
  runJupiterBlock: vi.fn(async () => {}),
  runIkaAllow: vi.fn(async () => {}),
  runIkaBlock: vi.fn(async () => {}),
  executeJupiter: vi.fn(async () => {}),
  executeIka: vi.fn(async () => {}),
}

vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({ state: mockState.current, actions: actionSpies }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppGatePage } from './app.gate'

const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600

/** Snapshot where every readiness slot is done — used for the
 *  "all preconditions met" path. */
function readyData(): Record<string, unknown> {
  return {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '17.5' },
    usdcDcaPolicy: { enabled: true },
    policySeq: 7,
    temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
    ikaManaged: {
      registration: { label: 'managed-curve25519', curve: 2 },
    },
  }
}

function readyKeypair(): Record<string, unknown> {
  return {
    publicKey: { toBase58: () => 'AGENT11111111111111111111111111111111111111' },
  }
}

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

describe('Polet Portal — Phase 3 Policy Gate', () => {
  test('initial render — Jupiter rail, allow-jupiter scenario, amount 5', () => {
    render(<AppGatePage />)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-rail')).toBe('jupiter')
    expect(page?.getAttribute('data-scenario')).toBe('allow-jupiter')
    const amount = document.querySelector('[data-testid="composer-amount-value"]')
    expect(amount?.textContent).toBe('5')
    const rail = document.querySelector('[data-testid="composer-rail-jupiter"]')
    expect(rail?.getAttribute('data-active')).toBe('true')
  })

  test('scenario click → block-25 sets amount to 25, rail stays', () => {
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="scenario-pill-block-25"]')!)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-scenario')).toBe('block-25')
    expect(page?.getAttribute('data-rail')).toBe('jupiter')
    const amount = document.querySelector('[data-testid="composer-amount-value"]')
    expect(amount?.textContent).toBe('25')
  })

  test('scenario click → ika flips rail to Ika and amount stays 5', () => {
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="scenario-pill-ika"]')!)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-rail')).toBe('ika')
    expect(page?.getAttribute('data-scenario')).toBe('ika')
  })

  test('rail button click → ika flips scenario to ika', () => {
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="composer-rail-ika"]')!)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-rail')).toBe('ika')
    expect(page?.getAttribute('data-scenario')).toBe('ika')
  })

  test('Preview button fires runJupiterAllow on Jupiter rail', () => {
    mockState.current = {
      ...mockState.current,
      data: readyData(),
      sessionKeypair: readyKeypair(),
    }
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="gate-action-preview"]')!)
    expect(actionSpies.runJupiterAllow).toHaveBeenCalledTimes(1)
    expect(actionSpies.runIkaAllow).not.toHaveBeenCalled()
  })

  test('Preview button fires runIkaAllow on Ika rail', () => {
    mockState.current = {
      ...mockState.current,
      data: readyData(),
      sessionKeypair: readyKeypair(),
    }
    render(<AppGatePage />)
    // Switch to Ika first
    fireEvent.click(document.querySelector('[data-testid="composer-rail-ika"]')!)
    fireEvent.click(document.querySelector('[data-testid="gate-action-preview"]')!)
    expect(actionSpies.runIkaAllow).toHaveBeenCalledTimes(1)
    expect(actionSpies.runJupiterAllow).not.toHaveBeenCalled()
  })

  test('Try blocked fires runJupiterBlock + flips scenario to block-25', () => {
    mockState.current = {
      ...mockState.current,
      data: readyData(),
      sessionKeypair: readyKeypair(),
    }
    render(<AppGatePage />)
    fireEvent.click(
      document.querySelector('[data-testid="gate-action-try-blocked"]')!,
    )
    expect(actionSpies.runJupiterBlock).toHaveBeenCalledTimes(1)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-scenario')).toBe('block-25')
  })

  test('Execute fires executeJupiter when all preconditions met', () => {
    mockState.current = {
      ...mockState.current,
      data: readyData(),
      sessionKeypair: readyKeypair(),
    }
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="gate-action-execute"]')!)
    expect(actionSpies.executeJupiter).toHaveBeenCalledTimes(1)
  })

  test('Execute disabled without an active session', () => {
    // Default mockState has no temporalKeys / sessionKeypair.
    render(<AppGatePage />)
    const exec = document.querySelector(
      '[data-testid="gate-action-execute"]',
    ) as HTMLButtonElement
    expect(exec.disabled).toBe(true)
  })

  test('Execute disabled when session active but no sessionKeypair', () => {
    mockState.current = {
      ...mockState.current,
      data: readyData(),
      sessionKeypair: null,
    }
    render(<AppGatePage />)
    const exec = document.querySelector(
      '[data-testid="gate-action-execute"]',
    ) as HTMLButtonElement
    expect(exec.disabled).toBe(true)
  })

  test('Ika execute disabled when no managed Sui chain registered', () => {
    const data = readyData()
    // Wipe the ikaManaged registration → Ika execute should disable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data as any).ikaManaged = undefined
    mockState.current = {
      ...mockState.current,
      data,
      sessionKeypair: readyKeypair(),
    }
    render(<AppGatePage />)
    // Switch to Ika rail
    fireEvent.click(document.querySelector('[data-testid="composer-rail-ika"]')!)
    const exec = document.querySelector(
      '[data-testid="gate-action-execute"]',
    ) as HTMLButtonElement
    expect(exec.disabled).toBe(true)
  })

  test('Verdict pill + orb word reflect latest Jupiter receipt (allowed)', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'rc-jup',
          timestamp: Date.now(),
          action: 'JUPITER APPROVED 5 USDC',
          description: '5 USDC → SOL',
          status: 'allowed',
        },
      ],
    }
    render(<AppGatePage />)
    const pill = document.querySelector('[data-testid="gate-verdict-pill"]')
    expect(pill?.getAttribute('data-state')).toBe('allowed')
    const orbWord = document.querySelector('[data-testid="gate-orb-word"]')
    expect(orbWord?.textContent).toBe('ALLOW')
    const verdictLine = document.querySelector('[data-testid="flow-verdict-line"]')
    expect(verdictLine?.getAttribute('data-state')).toBe('allowed')
  })

  test('Verdict pill + orb word reflect latest Jupiter receipt (blocked)', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'rc-jup',
          timestamp: Date.now(),
          action: 'JUPITER BLOCKED 25 USDC',
          description: '25 USDC over cap',
          status: 'blocked',
        },
      ],
    }
    render(<AppGatePage />)
    const orbWord = document.querySelector('[data-testid="gate-orb-word"]')
    expect(orbWord?.textContent).toBe('BLOCK')
  })

  test('Loading state shows orb word "evaluating" glyph', () => {
    mockState.current = {
      ...mockState.current,
      loading: 'jupiter-allow',
    }
    render(<AppGatePage />)
    const pill = document.querySelector('[data-testid="gate-verdict-pill"]')
    expect(pill?.getAttribute('data-state')).toBe('evaluating')
  })

  test('ID locale mirrors hero + scenario chips', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppGatePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Satu gate tersegel. Dua rail eksekusi.')
    expect(body).toContain('Approval Ika Sui')
    expect(body).toContain('Allow Jupiter 5 USDC')
  })
})
