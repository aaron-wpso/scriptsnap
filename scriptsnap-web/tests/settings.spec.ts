import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('shows header with back link', async ({ page }) => {
    await expect(page.getByRole('banner').getByText('ScriptSnap')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('back to dashboard link navigates to /dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /back to dashboard/i }).click();
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('account section shows user email read-only', async ({ page }) => {
    await expect(page.getByText(/account/i).first()).toBeVisible();
    const emailDisplay = page.getByTestId('account-email');
    await expect(emailDisplay).toBeVisible();
    // Email should match the logged-in test user
    if (process.env.TEST_EMAIL) {
      await expect(emailDisplay).toContainText(process.env.TEST_EMAIL);
    }
  });

  test.describe('Telegram section — unlinked state', () => {
    // These tests assume the test account has no Telegram linked.
    // If already linked, the unlink step is needed first (see linked state tests).

    test('shows Telegram section heading', async ({ page }) => {
      await expect(page.getByText(/telegram/i).first()).toBeVisible();
    });

    test('Option A: shows bot code entry form with step-by-step guide', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      await expect(section).toBeVisible();

      // Step guide mentions bot username
      await expect(section.getByText(/@scriptsnap_bot/i)).toBeVisible();
      await expect(section.getByText(/\/link/i)).toBeVisible();
      await expect(section.getByText(/6-digit/i)).toBeVisible();

      // Code input and Link button
      await expect(section.getByPlaceholder(/6-digit code/i)).toBeVisible();
      await expect(section.getByRole('button', { name: /^link$/i })).toBeVisible();
    });

    test('Option A: invalid code shows error message', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      await section.getByPlaceholder(/6-digit code/i).fill('000000');
      await section.getByRole('button', { name: /^link$/i }).click();

      await expect(section.getByText(/invalid or expired code/i)).toBeVisible({ timeout: 10_000 });
      await expect(section.getByRole('button', { name: /^link$/i })).toBeEnabled();
    });

    test('Option A: link button shows loading state', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      await section.getByPlaceholder(/6-digit code/i).fill('123456');
      const btn = section.getByRole('button', { name: /^link$/i });
      await btn.click();
      await expect(btn).toHaveText(/linking/i);
      await expect(btn).toBeDisabled();
    });

    test('Option B: "Or link manually" is collapsed by default', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      const manualSection = section.getByTestId('telegram-manual');
      // Manual section exists but should not show the input yet
      await expect(section.getByText(/or link manually/i)).toBeVisible();
      await expect(manualSection.getByLabel(/telegram user id/i)).not.toBeVisible();
    });

    test('Option B: expands manual section on toggle click', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      await section.getByText(/or link manually/i).click();

      const manualSection = section.getByTestId('telegram-manual');
      await expect(manualSection.getByText(/@userinfobot/i)).toBeVisible();
      await expect(manualSection.getByLabel(/telegram user id/i)).toBeVisible();
      await expect(manualSection.getByRole('button', { name: /^link$/i })).toBeVisible();
    });

    test('Option B: collapses when toggle clicked again', async ({ page }) => {
      const section = page.getByTestId('telegram-section');
      await section.getByText(/or link manually/i).click();
      await section.getByText(/or link manually/i).click();
      await expect(section.getByTestId('telegram-manual').getByLabel(/telegram user id/i)).not.toBeVisible();
    });
  });

  test.describe('Telegram section — linked state', () => {
    // These tests simulate the already-linked state.
    // In a real run, you'd need to link first OR mock the API.
    // For now they assert the UI once linked state is shown.

    test('linked state shows green card with Unlink button', async ({ page }) => {
      const linkedCard = page.getByTestId('telegram-linked');
      const isLinked = await linkedCard.isVisible().catch(() => false);
      if (!isLinked) {
        test.skip(); // Not linked — skip
        return;
      }

      await expect(linkedCard).toContainText(/telegram linked/i);
      await expect(linkedCard.getByRole('button', { name: /unlink/i })).toBeVisible();
    });

    test('unlink button returns to unlinked state', async ({ page }) => {
      const linkedCard = page.getByTestId('telegram-linked');
      const isLinked = await linkedCard.isVisible().catch(() => false);
      if (!isLinked) {
        test.skip();
        return;
      }

      await linkedCard.getByRole('button', { name: /unlink/i }).click();
      // Should return to unlinked state immediately
      await expect(page.getByTestId('telegram-section').getByPlaceholder(/6-digit code/i)).toBeVisible({
        timeout: 5_000,
      });
    });
  });
});
