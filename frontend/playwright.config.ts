import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});
