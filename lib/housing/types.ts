/**
 * Shared types for the housing report templates.
 *
 * The housing pack is data driven: each report is described once in
 * `lib/housing/templates` and the same definition feeds the on-screen form, the
 * live preview and the generated PDF. Keeping a single source of truth avoids
 * the field-by-field drift that happens when a form and a PDF are maintained
 * separately.
 */

export type HousingFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'yesno'
  | 'yesno-na';

export interface HousingField {
  /** Stable key used in the submitted form data. */
  id: string;
  label: string;
  type: HousingFieldType;
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** Grid span on wide screens. Defaults to 1. */
  span?: 1 | 2 | 3;
}

export interface HousingRepeatableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface HousingRepeatableGroup {
  /** Key the rows are serialised under inside `formData`. */
  id: string;
  title: string;
  description?: string;
  addLabel: string;
  emptyLabel: string;
  /** Rows rendered on first load. */
  defaultRows?: number;
  columns: HousingRepeatableColumn[];
}

export interface HousingReportSection {
  id: string;
  title: string;
  description?: string;
  fields?: HousingField[];
  repeatable?: HousingRepeatableGroup;
  guidance?: string[];
}

export interface HousingReportTemplate {
  /** URL slug, e.g. `void-inspection`. */
  key: string;
  /** Value stored in `certificates.certificate_type`. */
  certificateType: string;
  /** Prefix used when generating a certificate/report number. */
  numberPrefix: string;
  title: string;
  /** Heading printed on the generated PDF. */
  reportTitle: string;
  summary: string;
  standards: string[];
  typicalUse: string;
  /** Shown on the template picker card. */
  explanatoryNotes: string[];
  sections: HousingReportSection[];
}

export const HOUSING_YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const HOUSING_YES_NO_NA_OPTIONS = ['Yes', 'No', 'N/A'] as const;
