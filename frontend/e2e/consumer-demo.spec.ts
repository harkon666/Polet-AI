import { expect, test } from '@playwright/test';

test.describe('consumer confidential DCA demo', () => {
  test('keeps navigation focused and first viewport operational', async ({ page }) => {
    await page.goto('/e2e/consumer-demo');

    await expect(page.getByRole('link', { name: /wallet/i })).toBeVisible();
    await expect(page.getByText('Legacy Policy')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /control layer rahasia untuk ai agents/i })).toBeVisible();
    await expect(page.getByText(/checklist demo/i)).toBeVisible();
    await expect(page.getByText(/jupiter strategy rail/i)).toBeVisible();
    await expect(page.getByText(/sui\/sui primary destination/i)).toBeVisible();
    await expect(page.getByText(/ethereum\/eth optional future/i)).toBeVisible();
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

  test('shows blocked Ika request and approved Sui dWallet proof without leaking thresholds', async ({ page }) => {
    await page.goto('/e2e/consumer-demo');

    await page.getByRole('button', { name: /setup custody pda/i }).click();
    await expect(page.getByText(/custody siap/i)).toBeVisible();
    await page.getByRole('button', { name: /sign & simpan policy/i }).click();
    await expect(page.getByText(/nilai privat disembunyikan/i)).toBeVisible();

    const ikaBlock = page.getByRole('button', { name: /try 25 ika request/i });
    const ikaAllow = page.getByRole('button', { name: /approve 5 usdc-equivalent ika/i });

    await ikaBlock.click();
    await expect(page.getByText(/ika request blocked/i)).toBeVisible();
    let activityLog = page.getByTestId('activity-log-panel');
    await expect(activityLog).not.toContainText(/dwallet|messageapproval|message hash/i);

    await ikaAllow.click();
    await expect(page.getByText('Ika approval transaction prepared', { exact: true })).toBeVisible();
    await expect(page.getByText('Ika dWallet approval')).toBeVisible();
    await expect(page.getByText(/technical proof/i)).toBeVisible();
    await expect(page.getByText(/messageapproval/i)).toBeVisible();
    await expect(page.getByText(/message hash/i)).toBeVisible();
    await expect(page.getByText(/ed25519-prealpha/i)).toBeVisible();
    activityLog = page.getByTestId('activity-log-panel');
    await expect(activityLog).not.toContainText('10 USDC');
    await expect(activityLog).not.toContainText('20 USDC');
    await expect(activityLog).not.toContainText(/remaining cap|max per run 10|daily cap 20|witness:|encryptionWitness/i);
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
