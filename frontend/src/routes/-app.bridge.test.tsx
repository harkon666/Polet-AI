import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 6 Agent Bridge tests (issue 104).
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
  useLocation: () => ({ pathname: '/app/bridge' }),
}))

// Stub the legacy WalletDashboard so the test doesn't drag the full
// v1 console + wallet adapter tree into the unit env.
vi.mock('../components/app/WalletDashboard', () => ({
  WalletDashboard: () => <div data-testid="legacy-wallet-dashboard">legacy</div>,
}))

type MockState = {
  connected: boolean
  publicKey: { toBase58: () => string } | null
  data: Record<string, unknown> | null
  solBalance: number | null
  receipts: Array<Record<string, unknown>>
  loading: string | null
  error: null
  sessionKeypair: {
    publicKey: { toBase58: () => string }
    secretKey: Uint8Array
  } | null
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

import { AppBridgePage } from './app.bridge'

afterEach(() => {
  document.body.innerHTML = ''
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

describe('Polet Portal — Phase 6 Agent Bridge', () => {
  test('renders config block with placeholder strings when no session', () => {
    render(<AppBridgePage />)
    const json = document.querySelector(
      '[data-testid="bridge-config-json"]',
    ) as HTMLElement
    expect(json).not.toBeNull()
    const txt = json.textContent ?? ''
    expect(txt).toContain('<owner-wallet-pubkey>')
    expect(txt).toContain('<grant-session-first>')
    expect(txt).toContain('<download-polet-agent-json-first>')
  })

  test('renders config with real values when session keypair present', () => {
    mockState.current = {
      ...mockState.current,
      publicKey: { toBase58: () => 'OWNER1111111111111111111111111111111111111' },
      sessionKeypair: {
        publicKey: {
          toBase58: () => 'AGENT11111111111111111111111111111111111111',
        },
        secretKey: new Uint8Array(64).fill(7),
      },
    }
    render(<AppBridgePage />)
    const json = document.querySelector(
      '[data-testid="bridge-config-json"]',
    ) as HTMLElement
    const txt = json.textContent ?? ''
    expect(txt).toContain('OWNER1111111111111111111111111111111111111')
    expect(txt).toContain('AGENT11111111111111111111111111111111111111')
    expect(txt).not.toContain('<grant-session-first>')
    const panel = document.querySelector(
      '[data-testid="bridge-config-panel"]',
    )
    expect(panel?.getAttribute('data-ready')).toBe('true')
  })

  test('Copy button calls navigator.clipboard.writeText with the JSON', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<AppBridgePage />)
    const btn = document.querySelector(
      '[data-testid="bridge-copy-button"]',
    ) as HTMLButtonElement
    fireEvent.click(btn)
    await new Promise((r) => setTimeout(r, 0))
    expect(writeText).toHaveBeenCalledTimes(1)
    const arg = writeText.mock.calls[0]?.[0] as string
    expect(arg).toContain('"mcpServers"')
    expect(arg).toContain('"polet"')
  })

  test('5 MCP tool rows present', () => {
    render(<AppBridgePage />)
    for (const name of [
      'polet_balance',
      'polet_status',
      'polet_enable_chain',
      'polet_trade',
      'polet_execute',
    ]) {
      expect(
        document.querySelector(`[data-testid="mcp-tool-${name}"]`),
      ).not.toBeNull()
    }
  })

  test('Download button disabled when no session', () => {
    render(<AppBridgePage />)
    const btn = document.querySelector(
      '[data-testid="bridge-download-button"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  test('Download button enabled when session keypair present', () => {
    mockState.current = {
      ...mockState.current,
      publicKey: { toBase58: () => 'OWNER1111111111111111111111111111111111111' },
      sessionKeypair: {
        publicKey: { toBase58: () => 'AGENT1111111111111111' },
        secretKey: new Uint8Array(64).fill(7),
      },
    }
    render(<AppBridgePage />)
    const btn = document.querySelector(
      '[data-testid="bridge-download-button"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  test('Advanced collapse summary present, body collapsed by default', () => {
    render(<AppBridgePage />)
    const collapse = document.querySelector(
      '[data-testid="bridge-advanced-collapse"]',
    ) as HTMLDetailsElement
    expect(collapse).not.toBeNull()
    expect(collapse.open).toBe(false)
    // The body still mounts because details renders children always; but
    // the legacy stub should be present (we've stubbed WalletDashboard).
    expect(
      document.querySelector('[data-testid="legacy-wallet-dashboard"]'),
    ).not.toBeNull()
  })

  test('ID locale mirrors hero + advanced summary', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppBridgePage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Hubungkan agent kamu ke Polet dalam 90 detik.')
    expect(body).toContain('Konsol kontrol penuh')
    expect(body).toContain('Lanjutan')
  })
})
