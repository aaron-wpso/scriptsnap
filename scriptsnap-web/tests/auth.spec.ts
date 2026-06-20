import { test, expect } from '@playwright/test';

// These tests run WITHOUT stored auth state (auth-tests project in playwright.config.ts)
// They test the login/signup UI itself.

test.describe('Auth page', () => {
  test('unauthenticated visit to / redirects to /auth', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/auth');
    await expect(page).toHaveURL('/auth');
  });

  test('unauthenticated visit to /dashboard redirects to /auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('/auth');
    await expect(page).toHaveURL('/auth');
  });

  test('shows sign in form with correct fields', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /sign in to scriptsnap/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/no account/i)).toBeVisible();
  });

  test('toggle switches between sign in and create account', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /sign in to scriptsnap/i })).toBeVisible();

    await page.getByText(/no account/i).click();

    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    await expect(page.getByText(/already have an account/i)).toBeVisible();

    // Toggle back
    await page.getByText(/already have an account/i).click();
    await expect(page.getByRole('heading', { name: /sign in to scriptsnap/i })).toBeVisible();
  });

  test('sign in button shows loading state on submit', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    const button = page.getByRole('button', { name: /sign in/i });
    await button.click();

    // Button should briefly show loading state
    await expect(button).toHaveText(/please wait/i);
    await expect(button).toBeDisabled();
  });

  test('wrong credentials shows inline error and re-enables button', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
    // Fields stay filled
    await expect(page.getByLabel(/email/i)).toHaveValue('wrong@example.com');
  });

  test('sign up with duplicate email shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.getByText(/no account/i).click();
    await page.getByLabel(/email/i).fill(process.env.TEST_EMAIL ?? 'existing@example.com');
    await page.getByLabel(/password/i).fill('somepassword123');
    await page.getByRole('button', { name: /sign up/i }).click();

    await expect(page.getByText(/user already registered/i)).toBeVisible();
  });
});
