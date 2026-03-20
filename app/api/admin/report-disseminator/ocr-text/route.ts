import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const runtime = 'nodejs';

/**
 * POST /api/admin/report-disseminator/ocr-text
 * Extracts raw text from a PDF using pdf-parse (for digital PDFs).
 * 
 * Body: multipart/form-data { file: PDF }
 * Response: { text: string, method: 'pdf-parse', pageCount: number }
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
    console.log('🔵 [ocr-text] FormData received');
  } catch {
    console.error('🔴 [ocr-text] Could not parse multipart body');
    return NextResponse.json({ error: 'Could not parse multipart body' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  console.log('🔵 [ocr-text] file extracted:', file ? `File(${file.name}, ${file.size} bytes)` : 'null/undefined');
  
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  console.log('🔵 [ocr-text] arrayBuffer read:', bytes.byteLength, 'bytes');
  const buffer = Buffer.from(bytes);

  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    const text: string = data.text ?? '';
    const pageCount: number = data.numpages ?? 1;
    console.log('🔵 [ocr-text] Text extracted:', text.length, 'characters from', pageCount, 'pages');
    if (text.length > 0) {
      console.log('🔵 [ocr-text] First 300 chars:', text.slice(0, 300));
    }

    if (text.length === 0) {
      return NextResponse.json({ 
        error: 'No text found. This PDF may be scanned/image-based. Consider using AI Gateway analysis.',
        text: '',
        method: 'pdf-parse',
        pageCount 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      text: text.slice(0, 20000), 
      method: 'pdf-parse', 
      pageCount,
      totalLength: text.length 
    });
  } catch (e: any) {
    return NextResponse.json({ error: `PDF parsing failed: ${e.message}` }, { status: 500 });
  }
}
