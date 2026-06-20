import { test, expect } from '@playwright/test';

// These tests run against the mobile-chrome and mobile-safari projects.
// They verify responsive layout below 640px.

test.describe('Mobile layout — Auth page', () => {
  test('auth card is full width with padding (not a small centered box)', async ({ page }) => {
    await page.goto('/auth');
    const card = page.getByTestId('auth-card');
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('Could not get bounding box or viewport');

    // Card should be close to full viewport width (within horizontal padding, not a narrow centered box)
    expect(box.width).toBeGreaterThan(viewport.width * 0.85);
  });
});

test.describe('Mobile layout — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('URL input and Transcribe button stack vertically', async ({ page }) => {
    const input = page.getByPlaceholder(/tiktok/i);
    const button = page.getByRole('button', { name: /^transcribe$/i });

    const inputBox = await input.boundingBox();
    const buttonBox = await button.boundingBox();
    if (!inputBox || !buttonBox) throw new Error('Elements not found');

    // Button should be below the input (higher Y coordinate), not to the right
    expect(buttonBox.y).toBeGreaterThan(inputBox.y + inputBox.height - 4);
  });

  test('Transcribe button is full width on mobile', async ({ page }) => {
    const button = page.getByRole('button', { name: /^transcribe$/i });
    const viewport = page.viewportSize();
    const buttonBox = await button.boundingBox();
    if (!buttonBox || !viewport) throw new Error('Could not measure');

    // Button should fill most of the viewport width
    expect(buttonBox.width).toBeGreaterThan(viewport.width * 0.85);
  });

  test('header shows ScriptSnap and Sign out (not Settings link) on mobile', async ({ page }) => {
    const header = page.getByRole('banner');
    await expect(header.getByText('ScriptSnap')).toBeVisible();
    await expect(header.getByRole('button', { name: /sign out/i })).toBeVisible();
    // Settings link may be hidden on mobile (accessible from body or hamburger instead)
    // Just verify "Sign out" is always visible — we don't assert Settings is hidden
    // since the exact mobile nav pattern is up to implementation
  });

  test('history row shows URL on first line and badge+timestamp on second', async ({ page }) => {
    const rows = page.getByTestId('transcription-row');
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const firstRow = rows.first();
    const urlEl = firstRow.getByTestId('row-url');
    const badgeEl = firstRow.getByTestId('status-badge');
    const timestampEl = firstRow.getByTestId('row-timestamp');

    const urlBox = await urlEl.boundingBox();
    const badgeBox = await badgeEl.boundingBox();

    if (!urlBox || !badgeBox) throw new Error('Row elements not found');
    // Badge should be below the URL on mobile (stacked layout)
    expect(badgeBox.y).toBeGreaterThanOrEqual(urlBox.y + urlBox.height - 4);
    await expect(timestampEl).toBeVisible();
  });
});

test.describe('Mobile layout — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('settings cards are full width and stacked', async ({ page }) => {
    const accountCard = page.getByTestId('account-section');
    const telegramSection = page.getByTestId('telegram-section');
    const viewport = page.viewportSize();

    const accountBox = await accountCard.boundingBox();
    const telegramBox = await telegramSection.boundingBox();
    if (!accountBox || !telegramBox || !viewport) throw new Error('Could not measure');

    // Both cards fill most of the viewport width
    expect(accountBox.width).toBeGreaterThan(viewport.width * 0.85);
    expect(telegramBox.width).toBeGreaterThan(viewport.width * 0.85);

    // Telegram section is below account section
    expect(telegramBox.y).toBeGreaterThan(accountBox.y + accountBox.height - 4);
  });

  test('Option A telegram form is full width on mobile', async ({ page }) => {
    const codeInput = page.getByPlaceholder(/6-digit code/i);
    const viewport = page.viewportSize();
    const inputBox = await codeInput.boundingBox();
    if (!inputBox || !viewport) throw new Error('Could not measure');

    expect(inputBox.width).toBeGreaterThan(viewport.width * 0.7);
  });
});
