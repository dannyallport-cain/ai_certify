import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const EMAIL = 'sysadmin@riskassessorpro.com';
const PASSWORD = 'Verify123!!!';

test('Sysadmin can log in', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);

  // Fill in login form
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation or dashboard element (longer timeout)
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  } catch (e) {
    // Capture screenshot and page content for debugging
    await page.screenshot({ path: 'sysadmin-login-fail.png', fullPage: true });
    const content = await page.content();
    console.log('PAGE CONTENT AFTER LOGIN:', content);
    throw e;
  }
});
