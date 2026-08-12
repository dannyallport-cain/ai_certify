/**
 * generate-blank-eicr.ts
 * ======================
 * Generates a blank, printable EICR PDF using the complete BS 7671:2018 layout.
 * All section headers, labels, tables and boxes are rendered — data fields are
 * intentionally left empty so the form can be completed by hand or digitally.
 *
 * Usage:
 *   pnpm exec ts-node --project tsconfig.json scripts/generate-blank-eicr.ts
 *
 * Output: test-results/blank-eicr-template.pdf
 */

import { generateCertificatePDF } from '../lib/pdf/generator';
import { createBlankEICR } from '../lib/pdf/eicr-blank-template';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Build a blank EICR — all fields empty except for structural defaults.
// Override with your company details here if you want them pre-printed.
const blankCert = createBlankEICR({
  // ── Optional: pre-fill company header ──────────────────────────────────
  // Uncomment and edit these if you want the company details pre-printed
  // formDataOverrides: {
  //   tradingTitle:       'Your Company Ltd',
  //   companyAddress:     '1 Example Street, Manchester, M1 1AA',
  //   companyEmail:       'info@yourcompany.co.uk',
  //   companyTelephone:   '01234 567 890',
  //   registrationNumber: '123456789',
  //   inspectorPosition:  'Qualified Supervisor',
  // },
});

// Ensure the output directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../test-results');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'blank-eicr-template.pdf');

async function main() {
  try {
    const pdfBytes = await generateCertificatePDF(blankCert);
    fs.writeFileSync(outPath, Buffer.from(pdfBytes));
    console.log(`Blank EICR template written to: ${outPath}`);
    console.log(`File size: ${pdfBytes.length} bytes`);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR generating blank EICR PDF:', err);
    process.exit(1);
  }
}

void main();
