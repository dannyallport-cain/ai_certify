import type { HousingReportSection } from '@/lib/housing/types';

/**
 * Reusable section builders shared by the housing report templates.
 *
 * Each builder returns a fresh section object so templates can be composed
 * without accidentally sharing mutable state.
 */

export const PROPERTY_CONDITION_OPTIONS = [
  'Good',
  'Fair',
  'Poor',
  'Unfit for habitation',
] as const;

export const PRIORITY_OPTIONS = ['Urgent', 'High', 'Standard', 'Low'] as const;

export const WORK_STATUS_OPTIONS = ['Open', 'In progress', 'Complete', 'Not required'] as const;

export function propertyDetailsSection(options?: { includeTenancy?: boolean }): HousingReportSection {
  const includeTenancy = options?.includeTenancy ?? true;
  const fields: HousingReportSection['fields'] = [
    {
      id: 'propertyType',
      label: 'Property type',
      type: 'select',
      options: ['Flat', 'House', 'Bungalow', 'Maisonette', 'Bedsit', 'Sheltered unit', 'Other'],
    },
    { id: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: 'e.g. 2' },
    { id: 'propertyReference', label: 'Property reference', type: 'text', placeholder: 'Asset or UPRN reference' },
    { id: 'estateOrScheme', label: 'Estate / scheme', type: 'text', placeholder: 'Estate, block or scheme name' },
  ];

  if (includeTenancy) {
    fields.push(
      { id: 'tenancyReference', label: 'Tenancy reference', type: 'text' },
      { id: 'tenantName', label: 'Tenant name', type: 'text' },
      { id: 'housingProvider', label: 'Landlord / housing provider', type: 'text' },
      { id: 'vacancyDate', label: 'Vacancy date', type: 'date' },
    );
  }

  fields.push({
    id: 'propertyNotes',
    label: 'Property notes',
    type: 'textarea',
    span: 3,
    placeholder: 'Access notes, known history, or anything the next visit needs to know.',
  });

  return {
    id: 'property',
    title: 'Property and tenancy details',
    description: 'Identifies the property and who is responsible for it.',
    fields,
  };
}

export function inspectionContextSection(options?: { title?: string; description?: string }): HousingReportSection {
  return {
    id: 'inspection-context',
    title: options?.title ?? 'Inspection context',
    description: options?.description ?? 'Why the visit took place and who attended.',
    fields: [
      { id: 'inspectionType', label: 'Inspection type', type: 'text', placeholder: 'e.g. Void handover, Routine survey' },
      { id: 'inspectorRole', label: 'Inspector role', type: 'text', placeholder: 'e.g. Housing officer' },
      { id: 'accompaniedBy', label: 'Accompanied by', type: 'text', placeholder: 'Names of anyone present' },
      { id: 'accessMethod', label: 'Access method', type: 'select', options: ['Keys', 'Tenant present', 'Caretaker', 'Contractor', 'No access'] },
      { id: 'weatherConditions', label: 'Weather conditions', type: 'text', placeholder: 'e.g. Dry, 12°C' },
      { id: 'inspectionDuration', label: 'Time on site', type: 'text', placeholder: 'e.g. 45 minutes' },
    ],
  };
}

export function photoEvidenceSection(): HousingReportSection {
  return {
    id: 'photo-evidence',
    title: 'Photo evidence',
    description: 'Confirms what was photographed so the report can be audited later.',
    fields: [
      { id: 'photosFrontElevation', label: 'Front elevation photographed', type: 'yesno' },
      { id: 'photosEachRoom', label: 'Each room photographed', type: 'yesno' },
      { id: 'photosDamageCloseUps', label: 'Damage close-ups photographed', type: 'yesno' },
      { id: 'photosMeters', label: 'Meter readings photographed', type: 'yesno' },
      { id: 'photosKeys', label: 'Keys / access items photographed', type: 'yesno' },
      {
        id: 'photoReferences',
        label: 'Photo references and notes',
        type: 'textarea',
        span: 3,
        placeholder: 'List any photo references or describe evidence that is stored separately.',
      },
    ],
  };
}

export function signOffSection(options?: { includeManager?: boolean }): HousingReportSection {
  const includeManager = options?.includeManager ?? true;
  const fields: HousingReportSection['fields'] = [
    { id: 'completedBy', label: 'Report completed by', type: 'text' },
    { id: 'completedDate', label: 'Date completed', type: 'date' },
  ];

  if (includeManager) {
    fields.push(
      { id: 'managerReview', label: 'Manager review', type: 'text' },
      { id: 'managerReviewDate', label: 'Manager review date', type: 'date' },
    );
  }

  fields.push({
    id: 'signOffNotes',
    label: 'Sign-off notes',
    type: 'textarea',
    span: 3,
    placeholder: 'Any caveats, limitations or follow-up agreed with the reviewer.',
  });

  return {
    id: 'sign-off',
    title: 'Sign-off',
    description: 'Who completed and reviewed the report.',
    fields,
  };
}

export function actionSummarySection(): HousingReportSection {
  return {
    id: 'actions',
    title: 'Actions and next steps',
    description: 'What happens next and who owns it.',
    fields: [
      { id: 'repairsTeamAction', label: 'Repairs team action', type: 'textarea', span: 3 },
      { id: 'lettingsTeamAction', label: 'Lettings team action', type: 'textarea', span: 3 },
      { id: 'complianceTeamAction', label: 'Compliance team action', type: 'textarea', span: 3 },
      { id: 'followUpOwner', label: 'Follow-up owner', type: 'text' },
      { id: 'followUpDueDate', label: 'Follow-up due date', type: 'date' },
      {
        id: 'overallStatus',
        label: 'Overall status',
        type: 'select',
        options: ['Vacant', 'Occupied', 'Partial access', 'Unsafe', 'Complete'],
      },
    ],
  };
}
