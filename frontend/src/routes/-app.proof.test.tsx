import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 5 Proof Trail tests (issue 103).
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
  useLocation: () => ({ pathname: '/app/proof' }),
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

vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({ state: mockState.current, actions: {} }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppProofPage } from './app.proof'

afterEach(() => {
  document.body.innerHTML = ''
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

describe('Polet Portal — Phase 5 Proof Trail', () => {
  test('empty state renders the expected sentence (EN)', () => {
    render(<AppProofPage />)
    const empty = document.querySelector(
      '[data-testid="proof-timeline-empty"]',
    )
    expect(empty).not.toBeNull()
    expect(document.body.textContent ?? '').toContain(
      'No agent activity yet — preview the gate to leave a receipt.',
    )
  })

  test('renders 3 rows with correct status tags', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'r-jup',
          timestamp: Date.UTC(2026, 4, 1, 12, 34, 56),
          action: 'JUPITER APPROVED 5 USDC',
          description: '5 USDC → SOL',
          status: 'allowed',
        },
        {
          id: 'r-blk',
          timestamp: Date.UTC(2026, 4, 1, 12, 33, 30),
          action: 'JUPITER BLOCKED 25 USDC',
          description: '25 USDC over cap',
          status: 'blocked',
        },
        {
          id: 'r-info',
          timestamp: Date.UTC(2026, 4, 1, 12, 30, 0),
          action: 'POLICY SEALED',
          description: 'cap 25 USDC',
          status: 'info',
        },
      ],
    }
    render(<AppProofPage />)
    expect(document.querySelector('[data-testid="proof-row-r-jup"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="proof-row-r-blk"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="proof-row-r-info"]')).not.toBeNull()
    const tags = document.querySelectorAll('[data-testid="proof-row-tag"]')
    expect(tags).toHaveLength(3)
    // First (head) row is the allowed one (allowed → palm tone class).
    expect(tags[0].className).toContain('text-palm')
    expect(tags[1].className).toContain('text-coral')
    expect(tags[2].className).toContain('text-lagoon-bright')
  })

  test('Allowed Jupiter receipt expands into JupiterProofPanel', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'r-jup',
          timestamp: Date.now(),
          action: 'JUPITER APPROVED 5 USDC',
          description: '5 USDC → SOL',
          status: 'allowed',
          jupiterProof: {
            inputToken: { symbol: 'USDC', isVerified: true },
            outputToken: { symbol: 'SOL', isVerified: true },
            executionPath: 'jupiter-route',
            quote: {
              slippageBps: 25,
              priceImpactPct: '0.001',
              inputAmount: '5',
              expectedOutput: '0.0123',
              minimumOutput: '0.0120',
              routeLabel: 'Orca · Whirlpool',
            },
            routeSteps: 1,
            primaryDex: 'Orca',
          },
        },
      ],
    }
    render(<AppProofPage />)
    const toggle = document.querySelector(
      '[data-testid="proof-row-toggle-r-jup"]',
    ) as HTMLButtonElement
    expect(toggle).not.toBeNull()
    expect(document.querySelector('[data-testid="jupiter-proof-panel"]')).toBeNull()
    fireEvent.click(toggle)
    expect(document.querySelector('[data-testid="jupiter-proof-panel"]')).not.toBeNull()
  })

  test('Allowed Ika receipt expands into IkaProofPanel', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'r-ika',
          timestamp: Date.now(),
          action: 'IKA APPROVED',
          description: 'Sui dWallet sign',
          status: 'allowed',
          ikaProof: {
            dwalletAccount: 'DWallet1111111111111111111111111111111111',
            messageApprovalPda: 'MsgApprov1111111111111111111111111111111',
            ikaMessageHash: '0x1234567890abcdef',
            destinationDigest: { chain: 'sui', digestBase58: 'SuiDigest1234' },
            signatureScheme: 'ed25519',
            settlement: 'cli-confirmed',
          },
        },
      ],
    }
    render(<AppProofPage />)
    fireEvent.click(
      document.querySelector(
        '[data-testid="proof-row-toggle-r-ika"]',
      )!,
    )
    expect(document.querySelector('[data-testid="ika-proof-panel"]')).not.toBeNull()
  })

  test('Solana Explorer link present on receipts with signature', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        {
          id: 'r-sig',
          timestamp: Date.now(),
          action: 'JUPITER EXECUTED',
          description: 'tx broadcast',
          signature:
            '5xVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1Zxx',
          status: 'allowed',
        },
      ],
    }
    render(<AppProofPage />)
    const a = document.querySelector(
      '[data-testid="proof-row-explorer"]',
    ) as HTMLAnchorElement
    expect(a).not.toBeNull()
    expect(a.href).toContain('https://explorer.solana.com/tx/')
    expect(a.href).toContain('cluster=devnet')
  })

  test('ID locale mirrors empty state + hero', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppProofPage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Setiap receipt yang dihasilkan agent.')
    expect(body).toContain(
      'Belum ada aktivitas agent — preview gate untuk meninggalkan receipt.',
    )
  })

  test('Receipts pill shows count + plural label when populated', () => {
    mockState.current = {
      ...mockState.current,
      receipts: [
        { id: 'a', timestamp: Date.now(), action: 'A', description: '', status: 'info' },
        { id: 'b', timestamp: Date.now(), action: 'B', description: '', status: 'info' },
      ],
    }
    render(<AppProofPage />)
    const pill = document.querySelector('[data-testid="proof-receipts-pill"]')
    expect(pill?.getAttribute('data-count')).toBe('2')
    expect(pill?.textContent ?? '').toMatch(/2/)
  })
})
