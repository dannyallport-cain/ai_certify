import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function extract() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const pdfPath = join(__dirname, '../146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf');
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
  
  const outPath = join(__dirname, '../eicr_extracted_text.txt');
  writeFileSync(outPath, output);
  console.log('Done. Written to eicr_extracted_text.txt');
  console.log('Pages:', pdf.numPages);
}

extract().catch(e => { console.error(e.message || e); process.exit(1); });
