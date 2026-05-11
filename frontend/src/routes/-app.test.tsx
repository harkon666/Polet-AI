import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 1 smoke tests (issue 099).
 *
 * Covers:
 *   - Disconnected `/app` index renders the connect-first headline.
 *   - Workspace placeholder renders its kicker + title (and stays a
 *     placeholder until Phase 2 fills it in).
 *   - PortalSidebar renders the 5 nav links.
 *   - PortalRedirector calls `router.navigate` on the connect/disconnect
 *     transitions defined in issue 099.
 *   - ID locale mirror renders for the connect-first headline.
 *
 * Avoids mounting the full `<AppLayout>` to keep the wallet-adapter
 * dependency tree out of the test environment. Each piece is exercised
 * directly against mocked router + wallet hooks.
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

const navigateSpy = vi.fn()
let mockedPathname = '/app'

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
  Outlet: () => null,
  useLocation: () => ({ pathname: mockedPathname }),
  useRouter: () => ({ navigate: navigateSpy }),
  useNavigate: () => navigateSpy,
}))

let mockedWalletConnected = false
const setVisibleSpy = vi.fn()

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: mockedWalletConnected,
    publicKey: null,
    disconnect: vi.fn(),
  }),
}))

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  useWalletModal: () => ({ setVisible: setVisibleSpy }),
}))

// Phase 2: PortalSidebar + Workspace components read via `useConsole()`.
// The smoke tests here mount the components in isolation (no
// <ConsoleStateProvider>) so we stub the hook directly with a
// disconnected-but-safe snapshot that exercises the "empty" rendering
// path for every selector (blocking → 'wallet', latestReceipt → null).
vi.mock('../components/app/use-console-actions', () => ({
  useConsole: () => ({
    state: {
      connected: false,
      publicKey: null,
      data: null,
      solBalance: null,
      receipts: [],
      loading: null,
      error: null,
      sessionKeypair: null,
    },
    actions: {},
  }),
  ConsoleStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppIndexPage } from './app.index'
import { AppWorkspacePage } from './app.workspace'
import { PortalSidebar } from '../components/app/portal/PortalSidebar'
import { PortalRedirector } from '../components/app/portal/PortalRedirector'

afterEach(() => {
  document.body.innerHTML = ''
  navigateSpy.mockReset()
  setVisibleSpy.mockReset()
})

beforeEach(() => {
  try {
    window.localStorage.removeItem('polet.locale')
  } catch {
    // ignore
  }
  document.documentElement.setAttribute('lang', 'en')
  mockedPathname = '/app'
  mockedWalletConnected = false
})

describe('Polet Portal — Phase 1', () => {
  test('disconnected /app renders the connect-first headline (EN)', () => {
    render(<AppIndexPage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Connect a devnet wallet to enter the portal.')
    expect(body).toMatch(/Polet Portal/i)
    // The "Connect wallet" CTA from <WalletButton /> is the primary action.
    expect(body).toMatch(/Connect wallet/i)
  })

  test('disconnected /app renders the connect-first headline (ID)', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(<AppIndexPage />)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Hubungkan wallet devnet untuk masuk ke portal.')
  })

  test('workspace renders Phase 2 hero + readiness pills + CTA + empty activity', () => {
    render(<AppWorkspacePage />)
    const body = document.body.textContent ?? ''
    // State-aware hero — disconnected stub blocks on wallet first.
    expect(body).toContain('Workspace')
    expect(body).toContain('Initialize your smart-wallet PDA to begin.')
    // Right-side status pill (blocking path).
    expect(body).toMatch(/setup pending/i)
    // Readiness strip — pill for each slot present in the markup.
    const pills = document.querySelectorAll('[data-testid^="readiness-pill-"]')
    expect(pills).toHaveLength(5)
    // Primary CTA routes at Funds (wallet slot is blocking).
    const primary = document.querySelector(
      '[data-testid="workspace-continue-cta"]',
    )
    expect(primary?.getAttribute('data-target')).toBe('/app/funds')
    // Activity line in its empty state.
    const activity = document.querySelector('[data-testid="activity-line"]')
    expect(activity?.getAttribute('data-state')).toBe('empty')
  })

  test('PortalSidebar renders 5 nav links to portal pages', () => {
    render(<PortalSidebar />)
    const sidebar = document.querySelector('aside')
    expect(sidebar).not.toBeNull()
    const links = sidebar!.querySelectorAll('a[href^="/app/"]')
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'))
    for (const expected of [
      '/app/workspace',
      '/app/gate',
      '/app/funds',
      '/app/proof',
      '/app/bridge',
    ]) {
      expect(hrefs).toContain(expected)
    }
    expect(sidebar!.textContent).toContain('Language')
    const localeGroup = sidebar!.querySelector(
      '[role="group"][aria-label="Switch language"]',
    )
    expect(localeGroup).not.toBeNull()
    const idButton = Array.from(localeGroup!.querySelectorAll('button')).find(
      (button) => button.textContent === 'ID',
    ) as HTMLButtonElement
    fireEvent.click(idButton)
    expect(window.localStorage.getItem('polet.locale')).toBe('id')
  })

  test('PortalRedirector navigates connected user from /app to /app/workspace', () => {
    mockedWalletConnected = true
    mockedPathname = '/app'
    render(<PortalRedirector />)
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/workspace',
      replace: true,
    })
  })

  test('PortalRedirector bounces disconnected user from sub-route back to /app', () => {
    mockedWalletConnected = false
    mockedPathname = '/app/workspace'
    render(<PortalRedirector />)
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app',
      replace: true,
    })
  })

  test('PortalRedirector does NOT navigate when state is consistent', () => {
    // Connected, already at a sub-route — no redirect needed.
    mockedWalletConnected = true
    mockedPathname = '/app/gate'
    render(<PortalRedirector />)
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
