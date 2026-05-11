/**
 * Ad-hoc visual audit — navigates to /app and the dev-only
 * /app/workspace-preview page, taking screenshots for manual review
 * of the Phase 2 portal palette across every readiness state. This
 * spec runs explicitly via
 *   `npx playwright test e2e/phase2-visual.spec.ts`.
 */
import { test, expect } from '@playwright/test'

test('visual audit: /app connect-first (desktop)', async ({ page }) => {
  await page.goto('/app', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside[aria-label="Polet Portal navigation"]')
  await page.waitForTimeout(500)
  await page.screenshot({
    path: 'e2e/screenshots/phase2-app-connect-desktop.png',
    fullPage: true,
  })
  expect(true).toBe(true)
})

test('visual audit: /app connect-first (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: 'e2e/screenshots/phase2-app-connect-mobile.png',
    fullPage: true,
  })
  expect(true).toBe(true)
})

test('visual audit: workspace preview (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/workspace-preview', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside[aria-label="Polet Portal navigation"]')
  await page.waitForTimeout(800)
  await page.screenshot({
    path: 'e2e/screenshots/phase2-workspace-preview-desktop.png',
    fullPage: true,
  })
  expect(true).toBe(true)
})

test('visual audit: workspace preview (mobile, full page)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/workspace-preview', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: 'e2e/screenshots/phase2-workspace-preview-mobile-fullpage.png',
    fullPage: true,
  })
  expect(true).toBe(true)
})

test('visual audit: workspace preview (mobile, viewport only)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/workspace-preview', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: 'e2e/screenshots/phase2-workspace-preview-mobile-viewport.png',
    fullPage: false,
  })
  expect(true).toBe(true)
})

test('visual audit: gate preview (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/gate-preview', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside[aria-label="Polet Portal navigation"]')
  await page.waitForTimeout(1200)
  await page.screenshot({
    path: 'e2e/screenshots/phase3-gate-preview-desktop.png',
    fullPage: true,
  })
  expect(true).toBe(true)
})

test('visual audit: gate preview (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/gate-preview', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.screenshot({
    path: 'e2e/screenshots/phase3-gate-preview-mobile.png',
    fullPage: false,
  })
  expect(true).toBe(true)
})
