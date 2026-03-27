import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { getUser } from '@/lib/db/queries';
import { extractAcroFormPlacements } from '@/lib/report-disseminator/pdf-acroform';

export const runtime = 'nodejs';

/**
 * POST /api/admin/report-disseminator/extract-fields
 * Accepts a multipart/form-data upload of a PDF and returns
 * AcroForm fields extracted by pdf-lib plus a raw text content
 * stub that the caller can use for AI suggestions.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
    console.log('🔵 [extract-fields] FormData received, entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`   - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`   - ${key}: ${String(value).slice(0, 50)}`);
      }
    }
  } catch {
    console.error('🔴 [extract-fields] Could not parse multipart body');
    return NextResponse.json({ error: 'Could not parse multipart body' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  console.log('🔵 [extract-fields] file extracted:', file ? `File(${file.name}, ${file.size} bytes, ${file.type})` : 'null/undefined');
  
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  console.log('🔵 [extract-fields] arrayBuffer read:', bytes.byteLength, 'bytes');
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const form = pdfDoc.getForm();
  const rawFields = form.getFields();
  console.log('🔵 [extract-fields] AcroForm fields found:', rawFields.length);

  const placements = await extractAcroFormPlacements(new Uint8Array(bytes));
  const fields = placements.map((placement, index) => ({
    id: crypto.randomUUID(),
    required: false,
    rawType: rawFields[index]?.constructor.name,
    ...placement,
  }));

  const pageCount = pdfDoc.getPageCount();

  return NextResponse.json({ pageCount, fields, source: 'pdf-lib' });
}
