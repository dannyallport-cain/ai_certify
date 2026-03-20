import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { analyzeFieldDefinition } from '@/lib/report-disseminator/field-analysis';

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
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  const fields = rawFields.map((f) => {
    const name = f.getName();
    const type = f.constructor.name; // PDFTextField, PDFDropdown, PDFCheckBox, etc.
    const analysis = analyzeFieldDefinition(name, { fieldTypeHint: mapPdfFieldType(type, name) });
    return {
      id: crypto.randomUUID(),
      page: 1, // pdf-lib doesn't expose page for all widget types easily; default 1
      label: analysis.label,
      rawType: type,
      fieldType: analysis.fieldType,
      required: false,
      plainTextHint: analysis.plainTextHint,
      dropdownOptions: analysis.dropdownOptions,
      stateOptions: analysis.stateOptions,
      addressConfig: analysis.addressConfig,
      postcodeConfig: analysis.postcodeConfig,
      phoneConfig: analysis.phoneConfig,
      numericConfig: analysis.numericConfig,
    };
  });

  const pageCount = pdfDoc.getPageCount();

  return NextResponse.json({ pageCount, fields, source: 'pdf-lib' });
}

function mapPdfFieldType(pdfType: string, name: string): string {
  const lower = name.toLowerCase();
  if (pdfType === 'PDFDropdown' || pdfType === 'PDFOptionList') return 'dropdown';
  if (pdfType === 'PDFCheckBox' || pdfType === 'PDFRadioGroup') return 'state_enum';
  if (lower.includes('phone') || lower.includes('telephone') || lower.includes('mobile')) return 'uk_phone';
  if (lower.includes('postcode') || lower.includes('post code')) return 'postcode';
  if (lower.includes('address') || lower.includes('location')) return 'address';
  if (lower.includes('resistance') || lower.includes('impedance') || lower.includes('ohms')) return 'resistance';
  if (lower.includes('voltage') || lower.includes('volts')) return 'voltage';
  if (lower.includes('number') || lower.includes('value') || lower.includes('amps')) return 'numeric';
  return 'text';
}
