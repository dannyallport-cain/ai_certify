import { PDFDocument } from 'pdf-lib';
import { analyzeFieldDefinition } from '@/lib/report-disseminator/field-analysis';
import { type ReportDisseminatorField } from '@/lib/report-disseminator/schema';

type AcroFieldPlacement = Omit<ReportDisseminatorField, 'id' | 'required'>;

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

function toNormalizedLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function extractAcroFormPlacements(bytes: Uint8Array) {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageRefToNumber = new Map(pdfDoc.getPages().map((page, index) => [page.ref.toString(), index + 1]));

  return pdfDoc
    .getForm()
    .getFields()
    .flatMap((field) => {
      const name = field.getName();
      const fieldTypeHint = mapPdfFieldType(field.constructor.name, name);
      const analysis = analyzeFieldDefinition(name, { fieldTypeHint });
      const widgets = (field as any).acroField?.getWidgets?.() ?? [];

      if (!widgets.length) {
        return [
          {
            page: 1,
            label: analysis.label,
            fieldType: analysis.fieldType,
            plainTextHint: analysis.plainTextHint,
            dropdownOptions: analysis.dropdownOptions,
            stateOptions: analysis.stateOptions,
            addressConfig: analysis.addressConfig,
            postcodeConfig: analysis.postcodeConfig,
            phoneConfig: analysis.phoneConfig,
            numericConfig: analysis.numericConfig,
          } satisfies AcroFieldPlacement,
        ];
      }

      return widgets.map((widget: any) => {
        const rectangle = widget.getRectangle();
        const pageRef = widget.P?.();
        const page = pageRef ? pageRefToNumber.get(pageRef.toString()) || 1 : 1;

        return {
          page,
          label: analysis.label,
          fieldType: analysis.fieldType,
          plainTextHint: analysis.plainTextHint,
          boundingBox: rectangle,
          dropdownOptions: analysis.dropdownOptions,
          stateOptions: analysis.stateOptions,
          addressConfig: analysis.addressConfig,
          postcodeConfig: analysis.postcodeConfig,
          phoneConfig: analysis.phoneConfig,
          numericConfig: analysis.numericConfig,
        } satisfies AcroFieldPlacement;
      });
    });
}

export async function enrichFieldsWithAcroFormPlacements(
  fields: ReportDisseminatorField[],
  sourcePdfBase64: string,
) {
  const base64 = sourcePdfBase64.replace(/^data:[^;]+;base64,/, '');
  const placements = await extractAcroFormPlacements(new Uint8Array(Buffer.from(base64, 'base64')));
  const placementBuckets = new Map<string, AcroFieldPlacement[]>();

  for (const placement of placements) {
    const key = toNormalizedLabel(placement.label);
    const bucket = placementBuckets.get(key) || [];
    bucket.push(placement);
    placementBuckets.set(key, bucket);
  }

  let changed = false;
  const enrichedFields = fields.map((field) => {
    if (field.boundingBox) {
      return field;
    }

    const key = toNormalizedLabel(field.label);
    const bucket = placementBuckets.get(key);
    const placement = bucket?.shift();
    if (!placement?.boundingBox) {
      return field;
    }

    changed = true;
    return {
      ...field,
      page: placement.page,
      boundingBox: placement.boundingBox,
    };
  });

  return {
    fields: enrichedFields,
    changed,
  };
}