/**
 * ServiceM8 REST API record shapes and normalised domain records.
 *
 * The field names, nullability and presence below mirror the official OpenAPI
 * definitions published at https://developer.servicem8.com/reference exactly.
 *
 * IMPORTANT - do not add fields that ServiceM8 does not return. The previous
 * version of this module declared `email`, `phone`, `mobile`, `first_name`,
 * `last_name` and `company_name` on the Client (Company) record. ServiceM8
 * never returns those on `/company.json`; contact details only exist on
 * `/companycontact.json`. Because they were typed as optional, TypeScript never
 * complained and every one of them silently resolved to `undefined`, which is
 * why imported clients showed blank names, emails and phone numbers.
 */

// ─── Raw API records ─────────────────────────────────────────────────────────

/** `GET /company.json` - "Client" in the ServiceM8 UI. */
export interface ServiceM8Company {
  uuid: string;
  name: string | null;
  abn_number: string | null;
  /** Complete address in a single text field (multi-line). */
  address: string | null;
  /** Complete billing address in a single text field (multi-line). */
  billing_address: string | null;
  is_individual: number | null;
  /** When set, this record is a Site belonging to the referenced parent company. */
  parent_company_uuid: string | null;
  website: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postcode: string | null;
  address_country: string | null;
  fax_number: string | null;
  /** JSON array of Badge UUIDs. */
  badges: string | null;
  tax_rate_uuid: string | null;
  billing_attention: string | null;
  payment_terms: string | null;
  deposit_percent: number | null;
  active: number;
  /** `YYYY-MM-DD HH:MM:SS` - timestamp the record was last modified. */
  edit_date: string | null;
}

/** `GET /companycontact.json` - the only source of names, email and phone. */
export interface ServiceM8CompanyContact {
  uuid: string;
  company_uuid: string;
  first: string | null;
  last: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  /** e.g. 'BILLING', 'JOB'. */
  type: string | null;
  is_primary_contact: string | null;
  active: number;
  edit_date: string | null;
}

/**
 * `GET /attachment.json` - the single attachment collection.
 *
 * There is no `/jobattachment.json` endpoint. Attachments for every object type
 * (job, company, staff, ...) live here and are distinguished by `related_object`
 * and `related_object_uuid`.
 */
export interface ServiceM8Attachment {
  uuid: string;
  /** 'job', 'company', 'staff', ... */
  related_object: string | null;
  related_object_uuid: string | null;
  attachment_name: string | null;
  /** File extension including the leading dot, e.g. '.jpg'. */
  file_type: string | null;
  attachment_source: string | null;
  tags: string | null;
  lng: number | null;
  lat: number | null;
  photo_width: number | null;
  photo_height: number | null;
  extracted_info: string | null;
  is_favourite: number | null;
  class_name: string | null;
  metadata: Record<string, unknown> | null;
  created_by_staff_uuid: string | null;
  timestamp: string | null;
  signature_data: Record<string, unknown> | null;
  active: number;
  edit_date: string | null;
}

/** `GET /job.json` */
export interface ServiceM8Job {
  uuid: string;
  created_by_staff_uuid: string | null;
  /** `YYYY-MM-DD`. */
  date: string | null;
  company_uuid: string | null;
  billing_address: string | null;
  status: string | null;
  lng: number | null;
  lat: number | null;
  category_uuid: string | null;
  geo_is_valid: number | null;
  purchase_order_number: string | null;
  invoice_sent: number | null;
  invoice_sent_stamp: string | null;
  invoice_date: string | null;
  geo_country: string | null;
  geo_postcode: string | null;
  geo_state: string | null;
  geo_city: string | null;
  geo_street: string | null;
  geo_number: string | null;
  queue_uuid: string | null;
  queue_expiry_date: string | null;
  queue_assigned_staff_uuid: string | null;
  /** JSON array of Badge UUIDs. */
  badges: string | null;
  quote_date: string | null;
  quote_sent: number | null;
  quote_sent_stamp: string | null;
  work_order_date: string | null;
  job_address: string | null;
  job_description: string | null;
  work_done_description: string | null;
  generated_job_id: string | null;
  total_invoice_amount: string | null;
  payment_processed: number | null;
  payment_processed_stamp: string | null;
  payment_received: number | null;
  payment_received_stamp: string | null;
  payment_amount: string | null;
  completion_date: string | null;
  completion_actioned_by_uuid: string | null;
  unsuccessful_date: string | null;
  job_is_scheduled_until_stamp: string | null;
  active: number;
  edit_date: string | null;
}

/** `GET /staff.json` */
export interface ServiceM8Staff {
  uuid: string;
  first: string | null;
  last: string | null;
  email: string | null;
  mobile: string | null;
  job_title: string | null;
  color: string | null;
  custom_icon_url: string | null;
  status_message: string | null;
  active: number;
}

/** `GET /jobcategory.json` */
export interface ServiceM8JobCategory {
  uuid: string;
  name: string | null;
  active: number;
}

/** `GET /jobmaterial.json` */
export interface ServiceM8JobMaterial {
  uuid: string;
  job_uuid: string | null;
  name: string | null;
  qty: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  active: number;
}

/** `GET /companycontactinfo.json` - the connected account's own company. */
export interface ServiceM8CompanyInfo {
  uuid: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}

// ─── Normalised (domain) records ─────────────────────────────────────────────

/** A postal address split into its parts, plus a flattened display form. */
export interface ServiceM8Address {
  /** Single-line form suitable for a form field or table cell. */
  formatted: string | null;
  /** Raw multi-line value as stored by ServiceM8. */
  raw: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ServiceM8ContactRecord {
  uuid: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  /** e.g. 'BILLING', 'JOB'. */
  type: string | null;
  isPrimary: boolean;
  active: number;
  editDate: string | null;
}

export interface ServiceM8AttachmentRecord {
  uuid: string;
  /** 'job', 'company', 'staff', ... */
  relatedObject: string | null;
  relatedObjectUuid: string | null;
  name: string | null;
  fileName: string | null;
  extension: string | null;
  mimeType: string | null;
  isImage: boolean;
  width: number | null;
  height: number | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  source: string | null;
  isFavourite: boolean;
  createdByStaffUuid: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /**
   * Same-origin proxy path that streams the file, so the OAuth token stays on
   * the server. ServiceM8's own download URL is a short-lived signed link.
   */
  fileUrl: string;
}

/**
 * A fully-hydrated ServiceM8 client.
 *
 * The flat `name` / `email` / `phone` / `address` / `postcode` fields are kept
 * for backwards compatibility with existing API responses; the richer
 * `contacts`, `images` and `*Address` fields carry everything else.
 */
export interface ServiceM8ClientRecord {
  uuid: string;
  name: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  billingContactName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  faxNumber: string | null;
  website: string | null;
  abnNumber: string | null;
  isIndividual: boolean;
  parentCompanyUuid: string | null;
  /** Flattened site address, for backwards compatibility. */
  address: string | null;
  /** Flattened billing address, for backwards compatibility. */
  billingAddress: string | null;
  addressDetails: ServiceM8Address;
  billingAddressDetails: ServiceM8Address;
  postcode: string | null;
  billingPostcode: string | null;
  billingAttention: string | null;
  paymentTerms: string | null;
  taxRateUuid: string | null;
  depositPercent: number | null;
  badges: string[];
  active: number;
  editDate: string | null;
  contacts: ServiceM8ContactRecord[];
  images: ServiceM8AttachmentRecord[];
  openInServiceM8Url: string;
}

export interface ServiceM8JobRecord {
  uuid: string;
  generatedJobId: string | null;
  status: string | null;
  /** Flattened work address, for backwards compatibility. */
  address: string | null;
  billingAddress: string | null;
  workAddress: string | null;
  postcode: string | null;
  billingPostcode: string | null;
  workAddressDetails: ServiceM8Address;
  billingAddressDetails: ServiceM8Address;
  description: string | null;
  workDoneDescription: string | null;
  date: string | null;
  completionDate: string | null;
  quoteDate: string | null;
  workOrderDate: string | null;
  invoiceDate: string | null;
  unsuccessfulDate: string | null;
  editDate: string | null;
  jobIsScheduledUntil: string | null;
  companyUuid: string | null;
  companyName: string | null;
  categoryUuid: string | null;
  /** First badge UUID, kept for backwards compatibility. */
  badge: string | null;
  badges: string[];
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  billingContactName: string | null;
  customerName: string | null;
  customerUuid: string | null;
  purchaseOrderNumber: string | null;
  totalInvoiceAmount: number | null;
  paymentReceived: boolean;
  invoiceSent: boolean;
  quoteSent: boolean;
  active: number;
  openInServiceM8Url: string;
}

/** A single page of results plus the cursor needed to fetch the next one. */
export interface ServiceM8Page<T> {
  records: T[];
  nextCursor: string | null;
}
