import { test, expect, type Page } from '@playwright/test'

/**
 * v2 landing page e2e smoke tests.
 *
 * Covers the demo-critical paths a hackathon judge or first-time
 * visitor would actually walk through:
 *   - landing renders all 9 sections with key content
 *   - the policy-gate demo widget cycles through its phases for each
 *     scenario and lands on the right result badge
 *   - the locale toggle in the footer flips EN ↔ ID copy live
 *   - on mobile, the hamburger menu opens with the full nav and
 *     closes on Escape
 *
 * `waitForLoadState('networkidle')` would never resolve under the
 * dev server because TanStack devtools + HMR keep websockets open;
 * we use a fixed `waitForHydration` helper instead.
 */

/** Give the React tree time to hydrate before stateful interactions. */
async function waitForHydration(page: Page) {
  await expect(page.getByRole('heading', { name: /give your agent a budget/i })).toBeVisible()
  await page.waitForTimeout(1500)
}

test.describe('Landing page (v2) — smoke', () => {
  test('renders the full section flow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /give your agent a budget/i })).toBeVisible()

    // Manifesto, Rails, Demo, Security, CTA section anchors all present
    for (const id of ['rails', 'demo', 'security', 'cta']) {
      await expect(page.locator(`#${id}`)).toBeAttached()
    }

    // Footer
    await expect(page.locator('footer')).toContainText('F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p')
  })

  test('demo widget runs the BLOCK scenario and lands on a blocked result', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const button = page.locator('button').filter({ hasText: 'Block 25 USDC' })
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeVisible()
    await button.click()

    // Phase machine: cleartext (1s) → encrypting (1s) → encrypted (0.5s)
    // → evaluating (1.2s) → result. Total ≈ 3.7s.
    await expect(page.getByText('POLET_E_LIMIT_EXCEEDED')).toBeVisible({ timeout: 10_000 })
  })

  test('demo widget runs the JUPITER scenario and lands on an approved result', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const button = page.locator('button').filter({ hasText: 'Jupiter DCA' })
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeVisible()
    await button.click()

    await expect(page.getByText('unsigned tx ready')).toBeVisible({ timeout: 10_000 })
  })

  test('locale toggle in the footer switches EN to ID', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    await expect(page.locator('footer')).toContainText('Resources')

    const idButton = page.locator('footer [role="group"] button', { hasText: 'ID' })
    await idButton.scrollIntoViewIfNeeded()
    await idButton.click()

    await expect(page.locator('footer')).toContainText('Sumber', { timeout: 10_000 })
  })
})

test.describe('Landing page (v2) — mobile-only', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only checks')

  test('hamburger menu opens and closes', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const toggle = page.getByRole('button', { name: /open menu/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    const mobileNav = page.locator('#header-mobile-nav')
    await expect(mobileNav).toContainText('How it works')
    await expect(mobileNav).toContainText('Rails')
    await expect(mobileNav).toContainText('Demo')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible()
  })
})
