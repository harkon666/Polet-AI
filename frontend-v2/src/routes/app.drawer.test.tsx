import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Polet Portal — Phase 7 mobile drawer + i18n sweep tests (issue 105).
 *
 * Covers:
 *   - Hamburger toggles the drawer open/closed.
 *   - The drawer's data-state attribute reflects the open/closed flag.
 *   - The backdrop click closes the drawer.
 *   - The drawer + sidebar render the same nav set.
 *
 * Drawer focus-trap (`inert` on the main shell) is exercised in a
 * lightweight assertion; ESC + route-change closing is validated via
 * the provider's effect-driven contract (covered by smoke).
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

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({ connected: false, publicKey: null, disconnect: vi.fn() }),
}))

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  useWalletModal: () => ({ setVisible: vi.fn() }),
}))

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

import { PortalShell } from '../components/app/portal/PortalShell'

afterEach(() => {
  document.body.innerHTML = ''
})

beforeEach(() => {
  try {
    window.localStorage.removeItem('polet.locale')
  } catch {
    // ignore
  }
  document.documentElement.setAttribute('lang', 'en')
})

describe('Polet Portal — Phase 7 mobile drawer', () => {
  test('drawer starts closed; hamburger toggles open then closed', () => {
    render(
      <PortalShell>
        <main data-testid="page-content">content</main>
      </PortalShell>,
    )
    const drawer = document.querySelector(
      '[data-testid="portal-drawer-root"]',
    ) as HTMLElement
    expect(drawer.getAttribute('data-state')).toBe('closed')

    const hamburger = document.querySelector(
      '[data-testid="portal-mobile-hamburger"]',
    ) as HTMLButtonElement
    expect(hamburger).not.toBeNull()
    fireEvent.click(hamburger)
    expect(drawer.getAttribute('data-state')).toBe('open')
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(hamburger)
    expect(drawer.getAttribute('data-state')).toBe('closed')
  })

  test('clicking the backdrop closes the drawer', () => {
    render(
      <PortalShell>
        <main data-testid="page-content">content</main>
      </PortalShell>,
    )
    const hamburger = document.querySelector(
      '[data-testid="portal-mobile-hamburger"]',
    ) as HTMLButtonElement
    fireEvent.click(hamburger)
    const drawer = document.querySelector(
      '[data-testid="portal-drawer-root"]',
    ) as HTMLElement
    expect(drawer.getAttribute('data-state')).toBe('open')

    const backdrop = document.querySelector(
      '[data-testid="portal-drawer-backdrop"]',
    ) as HTMLButtonElement
    fireEvent.click(backdrop)
    expect(drawer.getAttribute('data-state')).toBe('closed')
  })

  test('main shell becomes inert while the drawer is open', () => {
    render(
      <PortalShell>
        <main data-testid="page-content">content</main>
      </PortalShell>,
    )
    const shellMain = document.querySelector(
      '[data-testid="portal-shell-main"]',
    ) as HTMLElement
    expect(shellMain.hasAttribute('inert')).toBe(false)
    fireEvent.click(
      document.querySelector(
        '[data-testid="portal-mobile-hamburger"]',
      ) as HTMLButtonElement,
    )
    expect(shellMain.hasAttribute('inert')).toBe(true)
  })

  test('drawer renders the nav variant of <PortalSidebar>', () => {
    render(
      <PortalShell>
        <main data-testid="page-content">content</main>
      </PortalShell>,
    )
    fireEvent.click(
      document.querySelector(
        '[data-testid="portal-mobile-hamburger"]',
      ) as HTMLButtonElement,
    )
    const drawerSidebar = document.querySelector(
      '[data-testid="portal-drawer-panel"] aside[data-variant="drawer"]',
    )
    expect(drawerSidebar).not.toBeNull()
    const drawerNavLinks = drawerSidebar!.querySelectorAll('a[href^="/app/"]')
    expect(drawerNavLinks.length).toBeGreaterThanOrEqual(5)
  })

  test('hamburger aria-label flips between open / close (ID locale)', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')
    render(
      <PortalShell>
        <main data-testid="page-content">content</main>
      </PortalShell>,
    )
    const hamburger = document.querySelector(
      '[data-testid="portal-mobile-hamburger"]',
    ) as HTMLButtonElement
    expect(hamburger.getAttribute('aria-label')).toBe('Buka navigasi portal')
    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-label')).toBe('Tutup navigasi portal')
  })
})
