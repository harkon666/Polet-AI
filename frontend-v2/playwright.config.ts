import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for v2 landing e2e smoke tests.
 *
 * Boots `bun run dev` on port 3002 (port 3001 reserved for the
 * @polet-ai/proxy server, port 3000 reserved for the legacy v1
 * frontend during the cutover) and exercises the landing surface
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
    baseURL: 'http://localhost:3002',
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
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
