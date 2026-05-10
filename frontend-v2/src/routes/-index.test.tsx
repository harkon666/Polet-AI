import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * jsdom 28 + Node 24 ship a partial localStorage that breaks `setItem`.
 * Provide a minimal in-memory polyfill so tests that toggle locale work.
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
    // Render as a plain anchor — keeps tests SSR-/router-free
    // while preserving href semantics for a11y assertions.
    // eslint-disable-next-line jsx-a11y/anchor-has-content, react/no-children-prop
    <a href={to ?? '#'} {...(props as Record<string, unknown>)} children={children} />
  ),
  useLocation: () => ({ pathname: '/' }),
}))

// Import AFTER mocks so the route's TanStack imports resolve to the stubs.
import { LandingPage } from './index'

afterEach(() => {
  document.body.innerHTML = ''
})

beforeEach(() => {
  // Default to EN unless overridden in the test.
  try {
    window.localStorage.removeItem('polet.locale')
  } catch {
    // Ignore — localStorage may be blocked in test env
  }
  document.documentElement.setAttribute('lang', 'en')
})

describe('Landing page (v2) — content per section', () => {
  test('renders EN content across all 9 sections', () => {
    render(<LandingPage />)
    const body = document.body.textContent ?? ''

    // Hero
    expect(body).toContain('Confidential Solana control layer')

    // Trust strip — brand wordmarks
    expect(body).toMatch(/Solana|Anchor|Ika|Jupiter|Encrypt|Colosseum/i)

    // Stats counter — at least one of the headline numbers
    expect(body).toMatch(/49|8|2|1/)

    // Manifesto cards
    expect(body).toMatch(/policy|agent|chain/i)

    // Rails section
    expect(body).toContain('Encrypt')
    expect(body).toContain('Ika')
    expect(body).toContain('Jupiter')

    // Demo widget header (technical schematic)
    expect(body).toContain('See the policy gate in 30 seconds.')

    // Security 4-quadrant
    expect(body).toContain('Layered defenses, no unilateral authority.')
    expect(body).toContain('Smart wallet PDA')
    expect(body).toContain('Session keys')
    expect(body).toContain('Anti-replay')
    expect(body).toContain('Multisig & recovery')

    // Final CTA
    expect(body).toContain('Try the policy gate on devnet.')
    expect(body).toContain('Build')
    expect(body).toContain('Review')
    expect(body).toContain('Explore')

    // Footer
    expect(body).toContain('Devnet · Live')
    expect(body).toContain('F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p')
    expect(body).toContain('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY')
    expect(body).toMatch(/All rights reserved/i)
  })

  test('renders ID content when locale is id', () => {
    window.localStorage.setItem('polet.locale', 'id')
    document.documentElement.setAttribute('lang', 'id')

    render(<LandingPage />)
    const body = document.body.textContent ?? ''

    // Security headline (ID)
    expect(body).toContain('Pertahanan berlapis, tanpa otoritas unilateral.')

    // Final CTA heading (ID)
    expect(body).toContain('Coba policy gate di devnet.')

    // Footer column heading (ID)
    expect(body).toContain('Sistem')

    // Footer copyright text (ID)
    expect(body).toMatch(/Hak cipta dilindungi/i)

    // Should NOT contain English equivalents (sanity)
    expect(body).not.toContain('Layered defenses, no unilateral authority.')
    expect(body).not.toContain('Try the policy gate on devnet.')
  })

  test('Day 6 sections expose anchor IDs for nav', () => {
    render(<LandingPage />)

    expect(document.querySelector('#security')).not.toBeNull()
    expect(document.querySelector('#cta')).not.toBeNull()
    expect(document.querySelector('footer')).not.toBeNull()
  })

  test('Footer hosts the LocaleToggle (moved from header)', () => {
    render(<LandingPage />)

    // LocaleToggle has role="group" with aria-label from localeToggle.aria
    const footer = document.querySelector('footer')
    expect(footer).not.toBeNull()
    const toggle = footer!.querySelector('[role="group"]')
    expect(toggle).not.toBeNull()

    // Both ID and EN buttons present
    const buttons = toggle!.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    const labels = Array.from(buttons).map((b) => b.textContent?.trim())
    expect(labels).toContain('ID')
    expect(labels).toContain('EN')
  })
})
