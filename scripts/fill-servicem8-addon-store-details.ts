import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

type Region =
  | 'Australia'
  | 'Canada'
  | 'New Zealand'
  | 'Other'
  | 'United Kingdom'
  | 'United States';

type AddonStoreDetailsConfig = {
  url: string;
  addonActivationUrl?: string;
  addonManifestFilePath?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportWebsite?: string;
  privacyPolicy?: string;
  longDescription?: string;
  youtubeVideoId?: string;
  tags?: string;
  description?: string;
  supportedRegions?: Region[];
  saveButtonText?: string; // defaults to "Save"
};

function getArg(name: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('-')) return null;
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

async function readJson<T>(filePath: string): Promise<T> {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = await fs.readFile(abs, 'utf8');
  return JSON.parse(raw) as T;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function waitForLoginOrTarget(page: puppeteer.Page) {
  // Wait until the actual add-on edit form is visible instead of matching generic footer text.
  const needles = [
    'support email address',
    'support website',
    'long description',
    'addon manifest',
    'addon store details',
    'add-on store details',
  ];

  const start = Date.now();
  const timeoutMs = 10 * 60 * 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ok = await page
      .evaluate((needlesInner) => {
        const title = (document.title || '').toLowerCase();
        const bodyText = (document.body?.innerText || '').toLowerCase();
        if (title.includes('page not found') || bodyText.includes('404') || bodyText.includes("page you're looking for doesn't exist")) {
          return false;
        }

        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).length;
        const textareas = Array.from(document.querySelectorAll('textarea')).length;
        const matchedNeedles = needlesInner.filter((n) => bodyText.includes(n)).length;

        return matchedNeedles >= 2 || (fileInputs >= 1 && textareas >= 1);
      }, needles)
      .catch(() => false);

    if (ok) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        'Timed out waiting for the add-on edit page. Please ensure you are logged in and on the correct form page.',
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function findFieldElementByLabel(
  page: puppeteer.Page,
  labelText: string,
): Promise<puppeteer.ElementHandle<Element>> {
  const handle = await page.evaluateHandle((labelTextInner) => {
    const target = labelTextInner.replace(/\s+/g, ' ').trim().toLowerCase();

    const labelCandidates = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
    for (const label of labelCandidates) {
      const labelTextValue = (label.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!labelTextValue.includes(target)) continue;

      if (label.htmlFor) {
        const byFor = document.getElementById(label.htmlFor);
        if (byFor) return byFor;
      }

      const nested = label.querySelector('input:not([type=hidden]), textarea, select');
      if (nested) return nested;

      const container =
        label.closest('tr, .field, .form-group, .row, li, section, article, div') || label.parentElement;
      const inContainer = container?.querySelector?.('input:not([type=hidden]), textarea, select') || null;
      if (inContainer) return inContainer;

      const sibling = label.nextElementSibling;
      if (sibling) {
        const sibField =
          (sibling.matches('input:not([type=hidden]), textarea, select') ? sibling : null) ||
          sibling.querySelector?.('input:not([type=hidden]), textarea, select') ||
          null;
        if (sibField) return sibField;
      }
    }

    const textCandidates = Array.from(document.querySelectorAll('th, dt, .label, .field-label, span, div, p'));
    for (const el of textCandidates) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!t.includes(target)) continue;

      const container =
        el.closest('tr, .field, .form-group, .row, li, section, article, div') || el.parentElement;
      const field = container?.querySelector?.('input:not([type=hidden]), textarea, select') || null;
      if (field) return field;

      const sibling = el.nextElementSibling;
      if (sibling) {
        const sibField =
          (sibling.matches('input:not([type=hidden]), textarea, select') ? sibling : null) ||
          sibling.querySelector?.('input:not([type=hidden]), textarea, select') ||
          null;
        if (sibField) return sibField;
      }
    }

    return null;
  }, labelText);

  const el = handle.asElement();
  if (!el) {
    throw new Error(`Could not find a form field for label "${labelText}".`);
  }
  return el;
}

async function setFieldValue(
  page: puppeteer.Page,
  labelText: string,
  value: string | undefined,
) {
  if (value === undefined) return;
  const trimmed = value.trim();
  const el = await findFieldElementByLabel(page, labelText);

  await page.evaluate(
    (element, nextValue) => {
      const isTextLike =
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
      if (!isTextLike) throw new Error('Unsupported element type for setFieldValue');

      if (element instanceof HTMLSelectElement) {
        const target = String(nextValue);
        let option: HTMLOptionElement | null = null;
        for (const candidate of Array.from(element.options)) {
          if (candidate.value === target || candidate.label === target || (candidate.textContent || '').trim() === target) {
            option = candidate;
            break;
          }
        }
        if (option) element.value = option.value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      element.focus();
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.value = String(nextValue);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    el,
    trimmed,
  );
}

async function setFileByLabel(
  page: puppeteer.Page,
  labelText: string,
  filePathValue: string | undefined,
) {
  if (filePathValue === undefined) return;
  const resolved = path.isAbsolute(filePathValue)
    ? filePathValue
    : path.join(process.cwd(), filePathValue);

  await fs.access(resolved);

  const el = await findFieldElementByLabel(page, labelText);
  const input = el as puppeteer.ElementHandle<HTMLInputElement>;

  const inputType = await page.evaluate((element) => {
    return element instanceof HTMLInputElement ? element.type : '';
  }, el);

  if (inputType !== 'file') {
    throw new Error(`Field "${labelText}" is not a file input (found type="${inputType}").`);
  }

  await input.uploadFile(resolved);
}

async function setCheckboxByText(page: puppeteer.Page, text: string, checked: boolean) {
  const normalizedTarget = normalizeText(text);
  const clicked = await page.evaluate(
    ({ normalizedTarget, checked }) => {
      const candidates = Array.from(document.querySelectorAll('label, span, div, p, li, td'));

      for (const node of candidates) {
        const nodeText = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!nodeText.includes(normalizedTarget)) continue;

        const container =
          node.closest('tr, .field, .form-group, .row, li, section, article, div') || node.parentElement;
        if (!container) continue;

        const checkbox =
          (container.querySelector('input[type="checkbox"]') as HTMLInputElement | null) ||
          (node instanceof HTMLLabelElement
            ? ((node.control as HTMLInputElement | null) ?? null)
            : null);
        if (!checkbox) continue;

        if (checkbox.checked !== checked) {
          checkbox.click();
        }
        return true;
      }
      return false;
    },
    { normalizedTarget, checked },
  );

  if (!clicked) {
    throw new Error(`Could not find checkbox for "${text}".`);
  }
}

async function clickButtonByText(page: puppeteer.Page, text: string) {
  const normalized = normalizeText(text);
  const clicked = await page.evaluate((normalized) => {
    const buttons = Array.from(
      document.querySelectorAll('button, input[type="submit"], input[type="button"]'),
    ) as Array<HTMLButtonElement | HTMLInputElement>;

    let match: HTMLButtonElement | HTMLInputElement | undefined;
    for (const b of buttons) {
      const t =
        b instanceof HTMLInputElement
          ? b.value || b.getAttribute('aria-label') || ''
          : b.innerText || b.getAttribute('aria-label') || '';
      const normalizedText = t.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalizedText.includes(normalized)) {
        match = b;
        break;
      }
    }

    if (!match) return false;
    match.scrollIntoView({ block: 'center', inline: 'center' });
    (match as any).click();
    return true;
  }, normalized);

  if (!clicked) {
    throw new Error(`Could not find a button containing text "${text}".`);
  }
}

async function main() {
  const configPath = getArg('--config');
  const urlArg = getArg('--url');
  const headless = hasFlag('--headless');
  const save = hasFlag('--save');

  if (!configPath && !urlArg) {
    // eslint-disable-next-line no-console
    console.log(
      'Usage:\n  pnpm exec tsx scripts/fill-servicem8-addon-store-details.ts --config scripts/servicem8-addon-store-details.example.json\n  pnpm exec tsx scripts/fill-servicem8-addon-store-details.ts --url "<edit page url>" --headless\n\nFlags:\n  --save      clicks Save (or saveButtonText)\n  --headless  run without UI (only if already authenticated)\n',
    );
    process.exit(1);
  }

  const fromFile = configPath
    ? await readJson<Partial<AddonStoreDetailsConfig>>(configPath)
    : ({} as Partial<AddonStoreDetailsConfig>);
  const config: AddonStoreDetailsConfig = {
    url: urlArg || String(fromFile.url || ''),
    addonActivationUrl: fromFile.addonActivationUrl,
    addonManifestFilePath: fromFile.addonManifestFilePath,
    supportEmail: fromFile.supportEmail,
    supportPhone: fromFile.supportPhone,
    supportWebsite: fromFile.supportWebsite,
    privacyPolicy: fromFile.privacyPolicy,
    longDescription: fromFile.longDescription,
    youtubeVideoId: fromFile.youtubeVideoId,
    tags: fromFile.tags,
    description: fromFile.description,
    supportedRegions: fromFile.supportedRegions,
    saveButtonText: fromFile.saveButtonText || 'Save',
  };

  if (!config.url) {
    throw new Error('Missing required "url". Provide --url or set url in the config JSON.');
  }

  let executablePath: string | undefined = process.env.CHROME_PATH;
  if (!executablePath) {
    try {
      // Reuse Playwright's browser binary (already in this repo) to avoid downloading Chromium again.
      // @playwright/test is installed in this project.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pw = require('playwright') as typeof import('playwright');
      executablePath = pw.chromium.executablePath();
    } catch {
      executablePath = undefined;
    }
  }

  if (!executablePath) {
    throw new Error(
      'Could not find a Chromium executable. Set CHROME_PATH to a local Chrome/Chromium, or ensure Playwright browsers are installed.',
    );
  }

  const browser = await puppeteer.launch({
    headless,
    executablePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);

  // eslint-disable-next-line no-console
  console.log(`Opening: ${config.url}`);
  await page.goto(config.url, { waitUntil: 'domcontentloaded' });

  if (!headless) {
    // eslint-disable-next-line no-console
    console.log('If prompted, log in to ServiceM8 in the browser window. Waiting for the edit form…');
  }

  await waitForLoginOrTarget(page);

  await setFieldValue(page, 'Addon Activation URL', config.addonActivationUrl);
  await setFileByLabel(page, 'Addon Manifest', config.addonManifestFilePath);

  await setFieldValue(page, 'Support Email Address', config.supportEmail);
  await setFieldValue(page, 'Support Phone Number', config.supportPhone);
  await setFieldValue(page, 'Support Website', config.supportWebsite);
  await setFieldValue(page, 'Privacy Policy', config.privacyPolicy);
  await setFieldValue(page, 'Long Description', config.longDescription);
  await setFieldValue(page, 'Youtube Video ID', config.youtubeVideoId);
  await setFieldValue(page, 'Tags', config.tags);
  await setFieldValue(page, 'Description', config.description);

  if (config.supportedRegions?.length) {
    for (const region of config.supportedRegions) {
      await setCheckboxByText(page, region, true);
    }
  }

  await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
  const beforePath = path.join(process.cwd(), 'tmp', 'servicem8-addon-filled.png');
  await page.screenshot({ path: beforePath, fullPage: true });
  // eslint-disable-next-line no-console
  console.log(`Saved screenshot: ${beforePath}`);

  if (save) {
    await clickButtonByText(page, config.saveButtonText || 'Save');
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 60_000 }).catch(() => {});
    const afterPath = path.join(process.cwd(), 'tmp', 'servicem8-addon-after-save.png');
    await page.screenshot({ path: afterPath, fullPage: true });
    // eslint-disable-next-line no-console
    console.log(`Saved screenshot: ${afterPath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log('Filled fields. Re-run with --save to click the save button automatically.');
  }

  await browser.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
