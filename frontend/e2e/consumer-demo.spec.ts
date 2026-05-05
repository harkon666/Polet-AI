import { expect, test } from '@playwright/test';

test.describe('consumer confidential DCA demo', () => {
  test('keeps navigation focused and first viewport operational', async ({ page }) => {
    await page.goto('/e2e/consumer-demo');

    await expect(page.getByRole('link', { name: /wallet/i })).toBeVisible();
    await expect(page.getByText('Legacy Policy')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /demo dca rahasia/i })).toBeVisible();
    await expect(page.getByText(/checklist demo/i)).toBeVisible();
    await expect(page.getByText(/confidential dca smart wallet for ai agents/i)).toHaveCount(0);
  });

  test('runs the linear checklist with redaction, safe block, and allowed Jupiter boundary', async ({ page }) => {
    await page.goto('/e2e/consumer-demo');

    const savePolicy = page.getByRole('button', { name: /sign & simpan policy/i });
    const blockRun = page.getByRole('button', { name: /try 25 usdc via proxy/i });
    const allowRun = page.getByRole('button', { name: /run 5 usdc via proxy/i });

    await expect(savePolicy).toBeDisabled();
    await expect(blockRun).toBeDisabled();
    await expect(allowRun).toBeDisabled();
    await expect(page.getByTestId('next-action')).toContainText(/setup custody pda/i);

    await page.getByRole('button', { name: /setup custody pda/i }).click();
    await expect(page.getByText(/custody siap/i)).toBeVisible();
    await expect(savePolicy).toBeEnabled();

    await expect(page.locator('input').nth(0)).toHaveValue('10');
    await expect(page.locator('input').nth(1)).toHaveValue('20');
    await savePolicy.click();
    await expect(page.getByText(/nilai privat disembunyikan/i)).toBeVisible();
    const inputValuesAfterSave = await page.locator('input').evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );
    expect(inputValuesAfterSave).not.toContain('10');
    expect(inputValuesAfterSave).not.toContain('20');

    await expect(blockRun).toBeEnabled();
    await expect(allowRun).toBeDisabled();
    await blockRun.click();
    await expect(page.getByText('DIBLOKIR', { exact: true })).toBeVisible();

    const activityLog = page.locator('section').filter({ hasText: /activity log/i }).last();
    await expect(activityLog).not.toContainText('10 USDC');
    await expect(activityLog).not.toContainText('20 USDC');
    await expect(activityLog).not.toContainText(/remaining cap|max per run 10|daily cap 20|witness:|encryptionWitness/i);

    await expect(allowRun).toBeEnabled();
    await allowRun.click();
    await expect(page.getByText('DISETUJUI', { exact: true })).toBeVisible();
    await expect(page.getByText(/jupiter route siap/i)).toBeVisible();
    await expect(page.getByText(/humidifi/i)).toBeVisible();
    await expect(page.getByText(/tx policy-gated siap/i)).toBeVisible();
    await expect(page.getByText(/preview: route\/build jupiter/i)).toBeVisible();
    await expect(page.getByText(/swap nyata tidak dikirim/i)).toBeVisible();
  });

  test('keeps the checklist readable at the active viewport width', async ({ page }) => {
    await page.goto('/e2e/consumer-demo');

    const checklist = page.getByTestId('demo-checklist');
    const nextAction = page.getByTestId('next-action');
    await expect(checklist).toBeVisible();
    await expect(nextAction).toBeVisible();

    const checklistBox = await checklist.boundingBox();
    const nextActionBox = await nextAction.boundingBox();
    expect(checklistBox).not.toBeNull();
    expect(nextActionBox).not.toBeNull();
    expect(nextActionBox!.x).toBeGreaterThanOrEqual(checklistBox!.x);
    expect(nextActionBox!.x + nextActionBox!.width).toBeLessThanOrEqual(checklistBox!.x + checklistBox!.width + 1);
    expect(nextActionBox!.width).toBeGreaterThan(180);
  });
});
