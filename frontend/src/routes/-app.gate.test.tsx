import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Policy Gate tests (post BYO redesign).
 *
 * Exercises:
 *   - Free-form amount input in `<IntentComposer>`.
 *   - Preset chips in `<ScenarioRow>` fill the amount + rail.
 *   - Single primary "Run trade" button calls
 *     `actions.executeAsOwnerSession({ rail, amountUsdc })`.
 *   - Authorize-self banner appears when the owner wallet is not in
 *     the session list; banner's button calls `grantAgentSessionByo`
 *     with `agentPubkey = owner.toBase58()`.
 *   - Run button is disabled when owner not a session / amount
 *     invalid / Ika chain missing (per rail).
 *   - Verdict pill tracks the latest receipt status per rail.
 *   - ID locale renders.
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

const OWNER_PUBKEY = 'AGENT11111111111111111111111111111111111111'
const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600

type MockState = {
  connected: boolean
  publicKey: { toBase58: () => string } | null
  data: Record<string, unknown> | null
  solBalance: number | null
  receipts: Array<Record<string, unknown>>
  loading: string | null
  error: null
  sessionKeypair: Record<string, unknown> | null
  revealedPolicyValues: Record<string, unknown>
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
    revealedPolicyValues: {},
  },
}

const actionSpies = {
  executeAsOwnerSession: vi.fn(async () => {}),
  testPolicy: vi.fn(async () => {}),
  grantAgentSessionByo: vi.fn(async () => {}),
  revokeAgentSessionByo: vi.fn(async () => {}),
  saveConfidentialPolicyCustom: vi.fn(async () => {}),
  revealPolicyValue: vi.fn(async () => {}),
  hidePolicyValue: vi.fn(() => {}),
}

vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({ state: mockState.current, actions: actionSpies }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppGatePage } from './app.gate'

/** State with custody + policy sealed + owner registered as session. */
function ownerAsSessionData(): Record<string, unknown> {
  return {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '17.5' },
    usdcDcaPolicy: { enabled: true },
    policySeq: 7,
    lastRevokedSlot: 0,
    temporalKeys: [
      {
        key: OWNER_PUBKEY,
        authorized: true,
        expiresAt: FUTURE_EXPIRES_AT,
        grantedSlot: 10,
      },
    ],
    ikaManaged: {
      registration: { label: 'managed-curve25519', curve: 2 },
    },
  }
}

function ownerPubkey(): { toBase58: () => string } {
  return { toBase58: () => OWNER_PUBKEY }
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
    revealedPolicyValues: {},
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

describe('Polet Portal — Policy Gate (BYO owner self-test surface)', () => {
  test('initial render — Jupiter rail, amount 5, default preset is allow-jupiter', () => {
    render(<AppGatePage />)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-rail')).toBe('jupiter')
    expect(page?.getAttribute('data-scenario')).toBe('allow-jupiter')
    const input = document.querySelector(
      '[data-testid="composer-amount-input"]',
    ) as HTMLInputElement
    expect(input.value).toBe('5')
  })

  test('preset click → block-25 sets amount to 25 (rail unchanged)', () => {
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="scenario-pill-block-25"]')!)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-scenario')).toBe('block-25')
    expect(page?.getAttribute('data-rail')).toBe('jupiter')
    const input = document.querySelector(
      '[data-testid="composer-amount-input"]',
    ) as HTMLInputElement
    expect(input.value).toBe('25')
  })

  test('preset click → ika flips rail to Ika and amount stays 5', () => {
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="scenario-pill-ika"]')!)
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-rail')).toBe('ika')
    expect(page?.getAttribute('data-scenario')).toBe('ika')
  })

  test('manual amount edit goes to "custom" scenario', () => {
    render(<AppGatePage />)
    const input = document.querySelector(
      '[data-testid="composer-amount-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '3.5' } })
    const page = document.querySelector('[data-testid="gate-page"]')
    expect(page?.getAttribute('data-scenario')).toBe('custom')
    expect(input.value).toBe('3.5')
  })

  test('Run button fires executeAsOwnerSession with current amount + rail', () => {
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data: ownerAsSessionData(),
    }
    render(<AppGatePage />)
    const input = document.querySelector(
      '[data-testid="composer-amount-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.click(document.querySelector('[data-testid="gate-action-run"]')!)
    expect(actionSpies.executeAsOwnerSession).toHaveBeenCalledTimes(1)
    expect(actionSpies.executeAsOwnerSession).toHaveBeenCalledWith({
      rail: 'jupiter',
      amountUsdc: '2',
    })
  })

  test('Run button switches rail payload when Ika rail selected', () => {
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data: ownerAsSessionData(),
    }
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="composer-rail-ika"]')!)
    fireEvent.click(document.querySelector('[data-testid="gate-action-run"]')!)
    expect(actionSpies.executeAsOwnerSession).toHaveBeenCalledWith({
      rail: 'ika',
      amountUsdc: '5',
    })
  })

  test('authorize-self banner appears when owner wallet not in sessions', () => {
    const data = ownerAsSessionData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data as any).temporalKeys = []
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data,
    }
    render(<AppGatePage />)
    expect(
      document.querySelector('[data-testid="gate-authorize-banner"]'),
    ).not.toBeNull()
    const runBtn = document.querySelector(
      '[data-testid="gate-action-run"]',
    ) as HTMLButtonElement
    expect(runBtn.disabled).toBe(true)
  })

  test('Authorize-self button calls grantAgentSessionByo with owner pubkey', () => {
    const data = ownerAsSessionData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data as any).temporalKeys = []
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data,
    }
    render(<AppGatePage />)
    fireEvent.click(
      document.querySelector('[data-testid="gate-action-authorize-self"]')!,
    )
    expect(actionSpies.grantAgentSessionByo).toHaveBeenCalledTimes(1)
    expect(actionSpies.grantAgentSessionByo).toHaveBeenCalledWith({
      agentPubkey: OWNER_PUBKEY,
      expiresInHours: 24,
      dailyLimitSol: 0.05,
    })
  })

  test('Run disabled when amount is 0 or invalid', () => {
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data: ownerAsSessionData(),
    }
    render(<AppGatePage />)
    const input = document.querySelector(
      '[data-testid="composer-amount-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '0' } })
    const runBtn = document.querySelector(
      '[data-testid="gate-action-run"]',
    ) as HTMLButtonElement
    expect(runBtn.disabled).toBe(true)
  })

  test('Ika run disabled when no managed Sui chain registered', () => {
    const data = ownerAsSessionData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data as any).ikaManaged = undefined
    mockState.current = {
      ...mockState.current,
      publicKey: ownerPubkey(),
      data,
    }
    render(<AppGatePage />)
    fireEvent.click(document.querySelector('[data-testid="composer-rail-ika"]')!)
    const runBtn = document.querySelector(
      '[data-testid="gate-action-run"]',
    ) as HTMLButtonElement
    expect(runBtn.disabled).toBe(true)
  })

  test('Verdict pill reflects latest Jupiter receipt (allowed)', () => {
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
  })

  test('Verdict pill reflects blocked receipt', () => {
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
    const pill = document.querySelector('[data-testid="gate-verdict-pill"]')
    expect(pill?.getAttribute('data-state')).toBe('blocked')
  })

  test('Loading state reflects evaluating pill for the active rail', () => {
    mockState.current = {
      ...mockState.current,
      loading: 'test-policy-jupiter',
    }
    render(<AppGatePage />)
    const pill = document.querySelector('[data-testid="gate-verdict-pill"]')
    expect(pill?.getAttribute('data-state')).toBe('evaluating')
  })

  test('ID locale renders hero + preset chip copy', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppGatePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Satu gate tersegel. Dua rail eksekusi.')
    expect(body).toContain('Approval Ika Sui')
    expect(body).toContain('Allow Jupiter 5 USDC')
  })
})
