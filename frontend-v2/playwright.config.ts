import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for v2 landing e2e smoke tests.
 *
 * Boots `bun run dev` on port 3001 and exercises the landing surface
 * end-to-end (load → demo scenario → locale toggle → mobile nav).
 *
 * Tests live in `frontend-v2/e2e/` (excluded from the vitest pattern
 * via the `exclude: ['e2e/**']` rule in vite.config.ts).
 */
export default defineConfig({
  testDir: './e2e',
  // Serial: tests share the dev server + TanStack devtools websocket; parallel
  // workers race on hydration and produce flaky failures. The full suite
  // takes ~30s serial which is fine for a landing-page smoke set.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
