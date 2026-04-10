#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing pdf-parse import...\n');

try {
  // Test require with createRequire (what we're using in the API route)
  const pdfParse = require('pdf-parse');
  console.log('✅ pdf-parse imported successfully');
  console.log('Type:', typeof pdfParse);
  console.log('Keys:', Object.keys(pdfParse));
  console.log('Is default a function?', typeof pdfParse.default);
  console.log('Full export:', pdfParse);
  
  // Find a test PDF
  const testPdfPath = join(__dirname, 'test-results', 'EICR-Test-Output.pdf');
  let buffer;
  
  try {
    buffer = readFileSync(testPdfPath);
    console.log(`✅ Found test PDF: ${testPdfPath} (${buffer.length} bytes)`);
  } catch (err) {
    console.log('⚠️  No test PDF found, skipping actual parsing test');
    process.exit(0);
  }
  
  // Test parsing
  console.log('\nParsing PDF...');
  const data = await pdfParse(buffer);
  
  console.log(`✅ PDF parsed successfully!`);
  console.log(`   Pages: ${data.numpages}`);
  console.log(`   Text length: ${data.text.length} characters`);
  console.log(`   First 100 chars: "${data.text.slice(0, 100).replace(/\n/g, ' ')}..."`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
