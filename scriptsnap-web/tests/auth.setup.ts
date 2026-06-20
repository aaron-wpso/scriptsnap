import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

// This setup file logs in once and saves the auth state.
// All other tests that depend on 'setup' will reuse this session
// instead of logging in again — keeps the test suite fast.
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL and TEST_PASSWORD env vars must be set. ' +
        'Create a dedicated test account in your Supabase project.'
    );
  }

  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('/dashboard');
  await expect(page.getByText('ScriptSnap')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
