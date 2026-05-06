import { chromium } from '@playwright/test';
import { SignJWT } from 'jose';

async function createSessionToken(userId: number) {
  const key = new TextEncoder().encode('dev-secret');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return new SignJWT({
    user: { id: userId },
    expires: expires.toISOString(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

async function assertPage(pageUrl: string, expectedText: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const token = await createSessionToken(133);
  await context.addCookies([
    {
      name: 'session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console:${message.text()}`);
    }
  });

  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const bodyText = (await page.locator('body').innerText()).trim();
  const hasExpectedText = bodyText.includes(expectedText);
  const title = await page.locator('h1').first().textContent().catch(() => null);

  console.log(JSON.stringify({
    pageUrl,
    title,
    hasExpectedText,
    bodyPreview: bodyText.slice(0, 400),
    errors,
  }, null, 2));

  await browser.close();
}

async function main() {
  await assertPage('http://localhost:4000/certificates/new/cp12', 'CP12 Gas Safety Record');
  await assertPage('http://localhost:4000/certificates/new/eicr', 'EICR');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
