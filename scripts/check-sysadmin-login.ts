import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:4000/sign-in', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill('sysadmin@riskassessorpro.com');
  await page.getByLabel('Password').fill('Verify123!!!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/\/admin(\/users)?/, { timeout: 15000 }).catch(() => null);

  console.log('After sign-in URL:', page.url());
  console.log('After sign-in body snippet:', (await page.locator('body').innerText()).slice(0, 400));

  await page.goto('http://localhost:4000/admin/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();
  console.log('Admin user rows:', rowCount);

  for (let i = 0; i < Math.min(rowCount, 10); i += 1) {
    const text = await rows.nth(i).innerText();
    if (text.toLowerCase().includes('sysadmin@riskassessorpro.com')) {
      console.log('Sysadmin row:', text);
      break;
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
