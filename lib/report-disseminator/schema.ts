import { z } from 'zod';
import { DEFAULT_STATE_OPTIONS, DISSEMINATOR_FIELD_TYPES } from '@/lib/report-disseminator/field-analysis';

export const fieldTypeSchema = z.enum(DISSEMINATOR_FIELD_TYPES);

export const stateOptionSchema = z.enum(DEFAULT_STATE_OPTIONS);

export const boundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const reportFieldSchema = z.object({
  id: z.string().min(1),
  page: z.number().int().min(1),
  label: z.string().min(1),
  fieldType: fieldTypeSchema,
  required: z.boolean().default(false),
  plainTextHint: z.string().optional(),
  boundingBox: boundingBoxSchema.optional(),
  dropdownOptions: z.array(z.string().min(1)).optional(),
  dropdownDefault: z.string().optional(),
  inspectionPeriodConfig: z
    .object({
      period: z.enum(['1y', '3y', '5y', '10y', 'custom']),
      inspectionDateFieldId: z.string(),
    })
    .optional(),
  addressConfig: z
    .object({
      mode: z.enum(['uk_address', 'uk_postcode_format']),
    })
    .optional(),
  postcodeConfig: z
    .object({
      country: z.enum(['GB']).default('GB'),
      validateAddress: z.boolean().default(true),
    })
    .optional(),
  phoneConfig: z
    .object({
      country: z.enum(['GB']).default('GB'),
    })
    .optional(),
  stateOptions: z.array(stateOptionSchema).optional(),
  numericConfig: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      resolution: z.number().positive().optional(),
      unit: z.string().optional(),
    })
    .optional(),
  linkedConfig: z
    .object({
      relatedSection: z.string().min(1),
      relatedFieldId: z.string().min(1),
      relationType: z.enum(['mirrors', 'derived_from', 'depends_on']),
    })
    .optional(),
  // Rules for fields that should be greyed out (set to 'N/A') when this field changes.
  // whenValues: if set and non-empty, only triggers when the value matches one of these; otherwise any non-empty value triggers.
  excludes: z
    .array(
      z.object({
        fieldId: z.string().min(1),
        whenValues: z.array(z.string()).optional(),
        excludeValues: z.array(z.string()).optional(),
      })
    )
    .optional(),
  // Max options to return from Search Online Options (default 12, max 40)
  searchOptionsMax: z.number().int().min(1).max(40).optional(),
});

export const reportDisseminatorTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'review', 'published', 'archived']).default('draft'),
  fields: z.array(reportFieldSchema).default([]),
  wizardData: z
    .object({
      currentStep: z.number().int().min(1).default(1),
      notes: z.string().optional(),
      aiSuggestionsEnabled: z.boolean().default(true),
      previewValues: z.record(z.string()).optional(),
    })
    .default({ currentStep: 1, aiSuggestionsEnabled: true }),
});

export const reportDisseminatorUpdateSchema = reportDisseminatorTemplateSchema.partial();

export const REPORT_DISSEMINATOR_REPORT_STATUSES = ['draft', 'completed', 'archived'] as const;

export const reportDisseminatorReportStatusSchema = z.enum(REPORT_DISSEMINATOR_REPORT_STATUSES);

export const reportDisseminatorReportSchema = z.object({
  templateId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: reportDisseminatorReportStatusSchema.default('draft'),
  values: z.record(z.string()).default({}),
  notes: z.string().optional(),
  snapshot: z
    .object({
      templateName: z.string().min(1),
      templateVersion: z.number().int().min(1),
      sourceFileName: z.string().min(1),
      sourceMimeType: z.string().min(1),
      sourcePdfBase64: z.string().min(1),
      fields: z.array(reportFieldSchema).default([]),
    })
    .optional(),
});

export const reportDisseminatorReportUpdateSchema = reportDisseminatorReportSchema
  .omit({
    templateId: true,
    snapshot: true,
  })
  .partial();

export type ReportDisseminatorField = z.infer<typeof reportFieldSchema>;
export type ReportDisseminatorTemplateInput = z.infer<typeof reportDisseminatorTemplateSchema>;
export type ReportDisseminatorReportInput = z.infer<typeof reportDisseminatorReportSchema>;
