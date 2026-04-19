import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function extract() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdfPath = join(process.cwd(), 'test-results', 'sample-eicr-CE202695.pdf');
  const data = readFileSync(pdfPath);

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;

  let output = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    output += `\n=== PAGE ${i} ===\n`;
    let lastY = null;
    let line = '';
    for (const item of content.items) {
      if (!item.str) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        output += line.trim() + '\n';
        line = '';
      }
      line += item.str + ' ';
      lastY = y;
    }
    if (line.trim()) output += line.trim() + '\n';
  }

  const outPath = join(process.cwd(), 'test-results', 'sample-eicr-CE202695.txt');
  writeFileSync(outPath, output);
  console.log(`Extracted text written to: ${outPath}`);
  console.log(`Pages: ${pdf.numPages}`);
}

extract().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
