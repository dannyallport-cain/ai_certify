import { PDFDocument } from 'pdf-lib';

type SanitizedPdfResult = {
  base64: string;
  changed: boolean;
};

function decodeBase64Pdf(input: string) {
  const normalized = input.replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(normalized, 'base64');
}

function encodeBase64Pdf(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64');
}

export async function sanitizeStoredPdfBase64(sourcePdfBase64: string): Promise<SanitizedPdfResult> {
  const originalBase64 = sourcePdfBase64.replace(/^data:[^;]+;base64,/, '');

  try {
    const pdfDoc = await PDFDocument.load(decodeBase64Pdf(sourcePdfBase64), {
      ignoreEncryption: true,
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (!fields.length) {
      return { base64: originalBase64, changed: false };
    }

    let changed = false;

    for (const field of fields) {
      const pdfField = field as any;

      try {
        if (typeof pdfField.setText === 'function') {
          pdfField.setText('');
          changed = true;
          continue;
        }

        if (typeof pdfField.uncheck === 'function') {
          pdfField.uncheck();
          changed = true;
          continue;
        }

        if (typeof pdfField.clear === 'function') {
          pdfField.clear();
          changed = true;
          continue;
        }
      } catch {
        // Best-effort sanitization: ignore field-specific failures and continue.
      }
    }

    if (!changed) {
      return { base64: originalBase64, changed: false };
    }

    try {
      form.flatten();
    } catch {
      // Flattening is optional; the cleared values are enough for preview purposes.
    }

    const sanitizedBytes = await pdfDoc.save();
    return {
      base64: encodeBase64Pdf(sanitizedBytes),
      changed: true,
    };
  } catch {
    return { base64: originalBase64, changed: false };
  }
}