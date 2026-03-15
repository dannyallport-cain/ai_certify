import { z } from 'zod';

export const fieldTypeSchema = z.enum([
  'dropdown',
  'address',
  'state_enum',
  'numeric',
  'text',
  'linked_text',
]);

export const stateOptionSchema = z.enum(['tick', 'cross', 'NA', 'LIM', 'NV']);

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
  addressConfig: z
    .object({
      mode: z.enum(['uk_postcode_format']),
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
      finalArtifactName: z.string().optional(),
      finalArtifactMimeType: z.string().optional(),
      finalArtifactBase64: z.string().optional(),
    })
    .default({ currentStep: 1, aiSuggestionsEnabled: true }),
});

export const reportDisseminatorUpdateSchema = reportDisseminatorTemplateSchema.partial();

export type ReportDisseminatorField = z.infer<typeof reportFieldSchema>;
export type ReportDisseminatorTemplateInput = z.infer<typeof reportDisseminatorTemplateSchema>;
