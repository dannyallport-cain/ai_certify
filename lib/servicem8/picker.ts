/**
 * The shape the ServiceM8 job picker consumes.
 *
 * The picker shows the raw ServiceM8 job fields (job number, status, dates)
 * alongside the normalised ones (customer name, contact details, work address),
 * so the record is the raw job merged with its normalised form.
 *
 * `Omit<ServiceM8Job, keyof ServiceM8JobRecord>` is required because a handful of
 * names exist on both shapes with different types - notably `badges`, which is
 * the raw JSON string on the API record and a parsed `string[]` once normalised.
 * Letting the normalised record win mirrors the spread order used when building
 * the response, and keeps a single source of truth for each field.
 */

import type { ServiceM8Job, ServiceM8JobRecord } from './types';

export type ServiceM8JobPickerRecord = Omit<ServiceM8Job, keyof ServiceM8JobRecord> &
  ServiceM8JobRecord & {
    /** Normalised-contact aliases kept for backwards compatibility. */
    first_name: string | null;
    last_name: string | null;
    job_address: string | null;
    customer_name: string | null;
  };
