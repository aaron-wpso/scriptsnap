import { test, expect } from '@playwright/test';

// These tests use stored auth state (chromium project with storageState in playwright.config.ts)

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows header with nav links', async ({ page }) => {
    await expect(page.getByRole('banner').getByText('ScriptSnap')).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('shows transcribe form section', async ({ page }) => {
    await expect(page.getByText(/transcribe a tiktok video/i)).toBeVisible();
    await expect(page.getByPlaceholder(/tiktok/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^transcribe$/i })).toBeVisible();
  });

  test('shows history section', async ({ page }) => {
    await expect(page.getByText(/history/i)).toBeVisible();
    // Either shows existing history or the empty state message
    const historySection = page.getByTestId('history-section');
    await expect(historySection).toBeVisible();
  });

  test('empty state message when no transcriptions', async ({ page }) => {
    // This test may or may not show depending on account state —
    // the empty state message should be present if there are no rows
    const emptyMsg = page.getByText(/no transcriptions yet/i);
    const firstRow = page.getByTestId('transcription-row').first();
    const hasRows = await firstRow.isVisible().catch(() => false);
    if (!hasRows) {
      await expect(emptyMsg).toBeVisible();
    }
  });

  test('submitting empty URL shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: /^transcribe$/i }).click();
    await expect(page.getByText(/please enter a valid url/i)).toBeVisible();
  });

  test('submitting invalid URL shows validation error', async ({ page }) => {
    await page.getByPlaceholder(/tiktok/i).fill('not-a-url');
    await page.getByRole('button', { name: /^transcribe$/i }).click();
    await expect(page.getByText(/please enter a valid url/i)).toBeVisible();
  });

  test('submitting valid TikTok URL shows loading state and adds pending row', async ({ page }) => {
    const url = 'https://www.tiktok.com/@test/video/1234567890';
    await page.getByPlaceholder(/tiktok/i).fill(url);

    const button = page.getByRole('button', { name: /^transcribe$/i });
    await button.click();

    // Button shows loading state while submitting
    await expect(button).toHaveText(/submitting/i);
    await expect(button).toBeDisabled();

    // After response: button resets and URL field clears
    await expect(button).toHaveText(/^transcribe$/i, { timeout: 10_000 });
    await expect(page.getByPlaceholder(/tiktok/i)).toHaveValue('');

    // A new pending row appears at the top of history
    const firstRow = page.getByTestId('transcription-row').first();
    await expect(firstRow).toBeVisible({ timeout: 5_000 });
    await expect(firstRow.getByTestId('status-badge')).toHaveText(/pending/i);
    await expect(firstRow.getByTestId('status-badge')).toHaveClass(/yellow|pending/);
  });

  test('history rows show correct badge colours', async ({ page }) => {
    // Assert colour classes map to statuses.
    // We check the data-status attribute the component should set.
    const rows = page.getByTestId('transcription-row');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const badge = rows.nth(i).getByTestId('status-badge');
      const status = await badge.getAttribute('data-status');
      if (status === 'Pending') await expect(badge).toHaveClass(/yellow/);
      if (status === 'Processing') await expect(badge).toHaveClass(/blue/);
      if (status === 'Completed') await expect(badge).toHaveClass(/green/);
      if (status === 'Failed') await expect(badge).toHaveClass(/red/);
    }
  });

  test('completed row has show transcript toggle and copy button', async ({ page }) => {
    const completedRow = page
      .getByTestId('transcription-row')
      .filter({ has: page.getByTestId('status-badge').filter({ hasText: /completed/i }) })
      .first();

    const hasCompleted = await completedRow.isVisible().catch(() => false);
    if (!hasCompleted) {
      test.skip(); // No completed rows yet — skip rather than fail
      return;
    }

    const toggleBtn = completedRow.getByRole('button', { name: /show transcript/i });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    const transcriptBox = completedRow.getByTestId('transcript-box');
    await expect(transcriptBox).toBeVisible();

    const copyBtn = transcriptBox.getByRole('button', { name: /copy/i });
    await expect(copyBtn).toBeVisible();
  });

  test('copy button shows "Copied!" for 2 seconds then resets', async ({ page }) => {
    const completedRow = page
      .getByTestId('transcription-row')
      .filter({ has: page.getByTestId('status-badge').filter({ hasText: /completed/i }) })
      .first();

    const hasCompleted = await completedRow.isVisible().catch(() => false);
    if (!hasCompleted) {
      test.skip();
      return;
    }

    await completedRow.getByRole('button', { name: /show transcript/i }).click();
    const copyBtn = completedRow.getByTestId('transcript-box').getByRole('button', { name: /copy/i });
    await copyBtn.click();

    await expect(copyBtn).toHaveText(/copied!/i);
    await expect(copyBtn).toHaveText(/copy/i, { timeout: 3_000 });
  });

  test('sign out redirects to /auth', async ({ page }) => {
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('/auth');
    await expect(page).toHaveURL('/auth');
  });

  test('settings link navigates to /settings', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await page.waitForURL('/settings');
    await expect(page).toHaveURL('/settings');
  });
});
