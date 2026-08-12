import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  json,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { USER_ROLES } from '@/lib/auth/roles';

export type EicrProfileDefaults = {
  tradingTitle?: string;
  companyAddress?: string;
  registrationNumber?: string;
  companyTelephone?: string;
  companyEmail?: string;
  approvalSchemes?: string[];
};

export type EicrInspectorHistoryEntry = {
  name: string;
  position: string;
};

export const userRoleEnum = pgEnum('UserRole', USER_ROLES);
export const userStatusEnum = pgEnum('UserStatus', ['pending', 'active', 'inactive', 'suspended']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  customEmail: varchar('custom_email', { length: 255 }),
  customEmailSignature: text('custom_email_signature'),
  passwordHash: text('password_hash').notNull(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  activatedAt: timestamp('activated_at'),
  avatarR2Key: text('avatar_r2_key'),
  avatarUpdatedAt: timestamp('avatar_updated_at'),
  avatarUrl: text('avatar_url'),
  deactivatedAt: timestamp('deactivated_at'),
  deletedAt: timestamp('deleted_at'),
  signatureR2Key: text('signature_r2_key'),
  signatureUpdatedAt: timestamp('signature_updated_at'),
  signatureUrl: text('signature_url'),
  eicrProfileDefaults: json('eicr_profile_defaults').$type<EicrProfileDefaults | null>(),
  eicrInspectorHistory: json('eicr_inspector_history').$type<EicrInspectorHistoryEntry[] | null>(),
  statusChangedAt: timestamp('status_changed_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: text('plan_name'),
  subscriptionStatus: text('subscription_status'),
  discountPercentage: integer('discount_percentage'),
  subscriptionBypass: boolean('subscription_bypass'),
  subscriptionBypassReason: text('subscription_bypass_reason'),
  subscriptionBypassRemovedAt: timestamp('subscription_bypass_removed_at'),
  subscriptionBypassSetAt: timestamp('subscription_bypass_set_at'),
  subscriptionBypassSetBy: integer('subscription_bypass_set_by'),
  trialEndDate: timestamp('trial_end_date'),
  logoDataUri: text('logo_data_uri'),
});

export const teamRuntimeSafeColumns = {
  id: teams.id,
  name: teams.name,
  createdAt: teams.createdAt,
  updatedAt: teams.updatedAt,
  stripeCustomerId: teams.stripeCustomerId,
  stripeSubscriptionId: teams.stripeSubscriptionId,
  stripeProductId: teams.stripeProductId,
  planName: teams.planName,
  subscriptionStatus: teams.subscriptionStatus,
  discountPercentage: teams.discountPercentage,
  subscriptionBypass: teams.subscriptionBypass,
  subscriptionBypassReason: teams.subscriptionBypassReason,
  subscriptionBypassRemovedAt: teams.subscriptionBypassRemovedAt,
  subscriptionBypassSetAt: teams.subscriptionBypassSetAt,
  subscriptionBypassSetBy: teams.subscriptionBypassSetBy,
  trialEndDate: teams.trialEndDate,
  logoDataUri: teams.logoDataUri,
};

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('email_verification_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('email_verification_tokens_expires_at_idx').on(
      table.expiresAt
    ),
  })
);

export const paymentTypeEnum = pgEnum('PaymentType', ['subscription', 'one_time']);
export const paymentModeEnum = pgEnum('PaymentMode', ['subscription', 'payment', 'setup']);
export const paymentTransactionStatusEnum = pgEnum('PaymentTransactionStatus', [
  'pending',
  'requires_action',
  'processing',
  'succeeded',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'expired',
]);
export const purchaseEntitlementStatusEnum = pgEnum('PurchaseEntitlementStatus', [
  'pending',
  'active',
  'consumed',
  'expired',
  'revoked',
]);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    paymentType: paymentTypeEnum('payment_type').notNull(),
    mode: paymentModeEnum('mode').notNull().default('payment'),
    purchaseType: varchar('purchase_type', { length: 100 }),
    stripeCustomerId: text('stripe_customer_id'),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeInvoiceId: text('stripe_invoice_id'),
    stripeChargeId: text('stripe_charge_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeProductId: text('stripe_product_id'),
    stripePriceId: text('stripe_price_id'),
    amount: integer('amount'),
    amountSubtotal: integer('amount_subtotal'),
    amountTax: integer('amount_tax'),
    amountDiscount: integer('amount_discount'),
    currency: varchar('currency', { length: 10 }),
    status: paymentTransactionStatusEnum('status').notNull().default('pending'),
    description: text('description'),
    metadata: json('metadata'),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teamIdIdx: index('payment_transactions_team_id_idx').on(table.teamId),
    userIdIdx: index('payment_transactions_user_id_idx').on(table.userId),
    statusIdx: index('payment_transactions_status_idx').on(table.status),
    paymentTypeIdx: index('payment_transactions_payment_type_idx').on(table.paymentType),
    createdAtIdx: index('payment_transactions_created_at_idx').on(table.createdAt),
    stripeCheckoutSessionIdIdx: uniqueIndex('payment_transactions_checkout_session_id_idx').on(
      table.stripeCheckoutSessionId
    ),
    stripePaymentIntentIdIdx: uniqueIndex('payment_transactions_payment_intent_id_idx').on(
      table.stripePaymentIntentId
    ),
    stripeInvoiceIdIdx: uniqueIndex('payment_transactions_invoice_id_idx').on(
      table.stripeInvoiceId
    ),
    stripeChargeIdIdx: uniqueIndex('payment_transactions_charge_id_idx').on(
      table.stripeChargeId
    ),
    stripeSubscriptionIdIdx: index('payment_transactions_subscription_id_idx').on(
      table.stripeSubscriptionId
    ),
  })
);

export const purchaseEntitlements = pgTable(
  'purchase_entitlements',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    paymentTransactionId: integer('payment_transaction_id').references(() => paymentTransactions.id, {
      onDelete: 'set null',
    }),
    paymentType: paymentTypeEnum('payment_type').notNull(),
    purchaseType: varchar('purchase_type', { length: 100 }).notNull(),
    featureKey: varchar('feature_key', { length: 100 }),
    quantity: integer('quantity').notNull().default(1),
    status: purchaseEntitlementStatusEnum('status').notNull().default('pending'),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    consumedAt: timestamp('consumed_at'),
    revokedAt: timestamp('revoked_at'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teamIdIdx: index('purchase_entitlements_team_id_idx').on(table.teamId),
    userIdIdx: index('purchase_entitlements_user_id_idx').on(table.userId),
    paymentTransactionIdIdx: index('purchase_entitlements_payment_transaction_id_idx').on(
      table.paymentTransactionId
    ),
    purchaseTypeIdx: index('purchase_entitlements_purchase_type_idx').on(table.purchaseType),
    featureKeyIdx: index('purchase_entitlements_feature_key_idx').on(table.featureKey),
    statusIdx: index('purchase_entitlements_status_idx').on(table.status),
    createdAtIdx: index('purchase_entitlements_created_at_idx').on(table.createdAt),
  })
);

// Fire Safety Certificate Management Tables
export const mainProtectiveDevice = pgTable('main_protective_device', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const circuitProtectiveDevice = pgTable('circuit_protective_device', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cableType = pgTable('cable_type', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rcdRcboType = pgTable('rcd_rcbo_type', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const protectiveDeviceRating = pgTable('protective_device_rating', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const approvalSchemeTypes = pgTable('approval_scheme_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  shortLabel: varchar('short_label', { length: 100 }).notNull(),
  description: text('description'),
  accentColor: varchar('accent_color', { length: 20 }).notNull().default('#1d4ed8'),
  textColor: varchar('text_color', { length: 20 }).notNull().default('#ffffff'),
  symbol: varchar('symbol', { length: 20 }).notNull().default(''),
  logoSrc: text('logo_src'),
  logoAlt: text('logo_alt'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  postcode: varchar('postcode', { length: 20 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  certificateType: varchar('certificate_type', { length: 50 }).notNull(), // BS5839-1, BS5839-6, BS5266, FIRE_EXTINGUISHER, DRY_RISER
  certificateNumber: varchar('certificate_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, completed, issued

  // Common fields
  siteName: varchar('site_name', { length: 255 }),
  siteAddress: text('site_address'),
  inspectionDate: date('inspection_date'),
  nextInspectionDate: date('next_inspection_date'),
  inspectorName: varchar('inspector_name', { length: 255 }),
  inspectorSignature: text('inspector_signature'),

  // Form data - stored as JSON for flexibility
  formData: json('form_data'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const certificateItems = pgTable('certificate_items', {
  id: serial('id').primaryKey(),
  certificateId: integer('certificate_id')
    .notNull()
    .references(() => certificates.id),
  itemType: varchar('item_type', { length: 100 }).notNull(), // detector, call_point, panel, etc.
  location: varchar('location', { length: 255 }),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull(), // satisfactory, unsatisfactory, not_tested
  defects: text('defects'),
  recommendations: text('recommendations'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const certificateTemplates = pgTable('certificate_templates', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  name: varchar('name', { length: 255 }).notNull(),
  certificateType: varchar('certificate_type', { length: 50 }).notNull(), // BS5839-1, BS5839-6, BS5266, FIRE_EXTINGUISHER, DRY_RISER
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),

  // Template design configuration stored as JSON
  template: json('template').notNull(), // Contains sections, styles, layout configuration

  // Metadata
  description: text('description'),
  version: integer('version').default(1),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
});

export const fireAlarmRoomCaptures = pgTable(
  'fire_alarm_room_captures',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    externalSessionId: varchar('external_session_id', { length: 255 }).notNull(),
    sessionName: varchar('session_name', { length: 255 }),
    captureStatus: varchar('capture_status', { length: 50 }).notNull().default('completed'),
    units: varchar('units', { length: 20 }),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    deviceCount: integer('device_count').notNull().default(0),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teamIdIdx: index('fire_alarm_room_captures_team_id_idx').on(table.teamId),
    createdByIdx: index('fire_alarm_room_captures_created_by_idx').on(table.createdBy),
    externalSessionIdx: uniqueIndex('fire_alarm_room_captures_team_session_idx').on(
      table.teamId,
      table.externalSessionId
    ),
    createdAtIdx: index('fire_alarm_room_captures_created_at_idx').on(table.createdAt),
  })
);

export const fireAlarmCaptureDevices = pgTable(
  'fire_alarm_capture_devices',
  {
    id: serial('id').primaryKey(),
    captureId: integer('capture_id')
      .notNull()
      .references(() => fireAlarmRoomCaptures.id, { onDelete: 'cascade' }),
    externalDeviceId: varchar('external_device_id', { length: 255 }),
    deviceType: varchar('device_type', { length: 50 }).notNull(),
    label: varchar('label', { length: 255 }),
    manufacturerName: varchar('manufacturer_name', { length: 255 }),
    manufacturerConfidence: real('manufacturer_confidence'),
    confidence: real('confidence'),
    locationX: real('location_x'),
    locationY: real('location_y'),
    locationZ: real('location_z'),
    boundingBox: json('bounding_box'),
    notes: text('notes'),
    source: varchar('source', { length: 50 }),
    roomId: varchar('room_id', { length: 255 }),
    wallSegmentId: varchar('wall_segment_id', { length: 255 }),
    identifiedByUser: boolean('identified_by_user').notNull().default(false),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    captureIdIdx: index('fire_alarm_capture_devices_capture_id_idx').on(table.captureId),
    deviceTypeIdx: index('fire_alarm_capture_devices_device_type_idx').on(table.deviceType),
    externalDeviceIdx: index('fire_alarm_capture_devices_external_device_id_idx').on(
      table.externalDeviceId
    ),
    createdAtIdx: index('fire_alarm_capture_devices_created_at_idx').on(table.createdAt),
  })
);

export const servicem8Connections = pgTable('servicem8_connections', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  servicem8AccountUuid: varchar('servicem8_account_uuid', { length: 255 }),
  servicem8CompanyName: varchar('servicem8_company_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  syncEnabled: boolean('sync_enabled').default(true),
  // Which direction to sync: 'to_servicem8', 'from_servicem8', 'bidirectional'
  syncDirection: varchar('sync_direction', { length: 20 }).default('bidirectional'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const servicem8JobMappings = pgTable('servicem8_job_mappings', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  servicem8ConnectionUserId: integer('servicem8_connection_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  certificateId: integer('certificate_id')
    .notNull()
    .references(() => certificates.id),
  servicem8JobUuid: varchar('servicem8_job_uuid', { length: 255 }).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('synced'), // synced, pending, error
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const servicem8ClientMappings = pgTable('servicem8_client_mappings', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  servicem8ConnectionUserId: integer('servicem8_connection_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  servicem8CompanyUuid: varchar('servicem8_company_uuid', { length: 255 }).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('synced'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reportDisseminatorTemplates = pgTable('report_disseminator_templates', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
  sourceMimeType: varchar('source_mime_type', { length: 100 }).notNull(),
  sourcePdfBase64: text('source_pdf_base64').notNull(),
  fields: json('fields').notNull(),
  wizardData: json('wizard_data').notNull(),
  publishedAt: timestamp('published_at'),
  archivedAt: timestamp('archived_at'),
  parentTemplateId: integer('parent_template_id').references((): any => reportDisseminatorTemplates.id, {
    onDelete: 'set null',
  }),
  finalArtifactName: varchar('final_artifact_name', { length: 255 }),
  finalArtifactMimeType: varchar('final_artifact_mime_type', { length: 100 }),
  finalArtifactBase64: text('final_artifact_base64'),
  storageProvider: varchar('storage_provider', { length: 50 }),
  storageKey: text('storage_key'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reportDisseminatorReports = pgTable('report_disseminator_reports', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  templateId: integer('template_id')
    .notNull()
    .references(() => reportDisseminatorTemplates.id),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  templateVersion: integer('template_version').notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
  sourceMimeType: varchar('source_mime_type', { length: 100 }).notNull(),
  sourcePdfBase64: text('source_pdf_base64').notNull(),
  fields: json('fields').notNull(),
  values: json('values').notNull(),
  notes: text('notes'),
  completedAt: timestamp('completed_at'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  customers: many(customers),
  certificates: many(certificates),
  certificateTemplates: many(certificateTemplates),
  fireAlarmRoomCaptures: many(fireAlarmRoomCaptures),
  reportDisseminatorTemplates: many(reportDisseminatorTemplates),
  reportDisseminatorReports: many(reportDisseminatorReports),
  servicem8Connections: many(servicem8Connections),
  servicem8JobMappings: many(servicem8JobMappings),
  servicem8ClientMappings: many(servicem8ClientMappings),
  paymentTransactions: many(paymentTransactions),
  purchaseEntitlements: many(purchaseEntitlements),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  fireAlarmRoomCaptures: many(fireAlarmRoomCaptures),
  reportDisseminatorTemplates: many(reportDisseminatorTemplates),
  reportDisseminatorReports: many(reportDisseminatorReports),
  emailVerificationTokens: many(emailVerificationTokens),
  paymentTransactions: many(paymentTransactions),
  purchaseEntitlements: many(purchaseEntitlements),
  servicem8Connections: many(servicem8Connections),
  servicem8JobMappings: many(servicem8JobMappings),
  servicem8ClientMappings: many(servicem8ClientMappings),
}));

export const emailVerificationTokensRelations = relations(
  emailVerificationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerificationTokens.userId],
      references: [users.id],
    }),
  })
);

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one, many }) => ({
  team: one(teams, {
    fields: [paymentTransactions.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [paymentTransactions.userId],
    references: [users.id],
  }),
  purchaseEntitlements: many(purchaseEntitlements),
}));

export const purchaseEntitlementsRelations = relations(purchaseEntitlements, ({ one }) => ({
  team: one(teams, {
    fields: [purchaseEntitlements.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [purchaseEntitlements.userId],
    references: [users.id],
  }),
  paymentTransaction: one(paymentTransactions, {
    fields: [purchaseEntitlements.paymentTransactionId],
    references: [paymentTransactions.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  team: one(teams, {
    fields: [customers.teamId],
    references: [teams.id],
  }),
  certificates: many(certificates),
}));

export const certificatesRelations = relations(certificates, ({ one, many }) => ({
  team: one(teams, {
    fields: [certificates.teamId],
    references: [teams.id],
  }),
  customer: one(customers, {
    fields: [certificates.customerId],
    references: [customers.id],
  }),
  items: many(certificateItems),
}));

export const certificateItemsRelations = relations(certificateItems, ({ one }) => ({
  certificate: one(certificates, {
    fields: [certificateItems.certificateId],
    references: [certificates.id],
  }),
}));

export const certificateTemplatesRelations = relations(certificateTemplates, ({ one }) => ({
  team: one(teams, {
    fields: [certificateTemplates.teamId],
    references: [teams.id],
  }),
  createdBy: one(users, {
    fields: [certificateTemplates.createdBy],
    references: [users.id],
  }),
}));

export const fireAlarmRoomCapturesRelations = relations(fireAlarmRoomCaptures, ({ one, many }) => ({
  team: one(teams, {
    fields: [fireAlarmRoomCaptures.teamId],
    references: [teams.id],
  }),
  createdByUser: one(users, {
    fields: [fireAlarmRoomCaptures.createdBy],
    references: [users.id],
  }),
  devices: many(fireAlarmCaptureDevices),
}));

export const fireAlarmCaptureDevicesRelations = relations(fireAlarmCaptureDevices, ({ one }) => ({
  capture: one(fireAlarmRoomCaptures, {
    fields: [fireAlarmCaptureDevices.captureId],
    references: [fireAlarmRoomCaptures.id],
  }),
}));

export const reportDisseminatorTemplatesRelations = relations(reportDisseminatorTemplates, ({ one }) => ({
  team: one(teams, {
    fields: [reportDisseminatorTemplates.teamId],
    references: [teams.id],
  }),
  createdBy: one(users, {
    fields: [reportDisseminatorTemplates.createdBy],
    references: [users.id],
  }),
}));

export const reportDisseminatorReportsRelations = relations(reportDisseminatorReports, ({ one }) => ({
  team: one(teams, {
    fields: [reportDisseminatorReports.teamId],
    references: [teams.id],
  }),
  template: one(reportDisseminatorTemplates, {
    fields: [reportDisseminatorReports.templateId],
    references: [reportDisseminatorTemplates.id],
  }),
  createdBy: one(users, {
    fields: [reportDisseminatorReports.createdBy],
    references: [users.id],
  }),
}));

export const servicem8ConnectionsRelations = relations(servicem8Connections, ({ one }) => ({
  team: one(teams, {
    fields: [servicem8Connections.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [servicem8Connections.userId],
    references: [users.id],
  }),
}));

export const servicem8JobMappingsRelations = relations(servicem8JobMappings, ({ one }) => ({
  team: one(teams, {
    fields: [servicem8JobMappings.teamId],
    references: [teams.id],
  }),
  connectionUser: one(users, {
    fields: [servicem8JobMappings.servicem8ConnectionUserId],
    references: [users.id],
  }),
  certificate: one(certificates, {
    fields: [servicem8JobMappings.certificateId],
    references: [certificates.id],
  }),
}));

export const servicem8ClientMappingsRelations = relations(servicem8ClientMappings, ({ one }) => ({
  team: one(teams, {
    fields: [servicem8ClientMappings.teamId],
    references: [teams.id],
  }),
  connectionUser: one(users, {
    fields: [servicem8ClientMappings.servicem8ConnectionUserId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [servicem8ClientMappings.customerId],
    references: [customers.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type PurchaseEntitlement = typeof purchaseEntitlements.$inferSelect;
export type NewPurchaseEntitlement = typeof purchaseEntitlements.$inferInsert;
export type MainProtectiveDevice = typeof mainProtectiveDevice.$inferSelect;
export type NewMainProtectiveDevice = typeof mainProtectiveDevice.$inferInsert;
export type CircuitProtectiveDevice = typeof circuitProtectiveDevice.$inferSelect;
export type NewCircuitProtectiveDevice = typeof circuitProtectiveDevice.$inferInsert;
export type CableType = typeof cableType.$inferSelect;
export type NewCableType = typeof cableType.$inferInsert;
export type RcdRcboType = typeof rcdRcboType.$inferSelect;
export type NewRcdRcboType = typeof rcdRcboType.$inferInsert;
export type ProtectiveDeviceRating = typeof protectiveDeviceRating.$inferSelect;
export type NewProtectiveDeviceRating = typeof protectiveDeviceRating.$inferInsert;
export type ApprovalSchemeType = typeof approvalSchemeTypes.$inferSelect;
export type NewApprovalSchemeType = typeof approvalSchemeTypes.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type CertificateItem = typeof certificateItems.$inferSelect;
export type NewCertificateItem = typeof certificateItems.$inferInsert;
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type NewCertificateTemplate = typeof certificateTemplates.$inferInsert;
export type FireAlarmRoomCapture = typeof fireAlarmRoomCaptures.$inferSelect;
export type NewFireAlarmRoomCapture = typeof fireAlarmRoomCaptures.$inferInsert;
export type FireAlarmCaptureDevice = typeof fireAlarmCaptureDevices.$inferSelect;
export type NewFireAlarmCaptureDevice = typeof fireAlarmCaptureDevices.$inferInsert;
export type ReportDisseminatorTemplate = typeof reportDisseminatorTemplates.$inferSelect;
export type NewReportDisseminatorTemplate = typeof reportDisseminatorTemplates.$inferInsert;
export type ReportDisseminatorReport = typeof reportDisseminatorReports.$inferSelect;
export type NewReportDisseminatorReport = typeof reportDisseminatorReports.$inferInsert;
export type ServiceM8Connection = typeof servicem8Connections.$inferSelect;
export type NewServiceM8Connection = typeof servicem8Connections.$inferInsert;
export type ServiceM8JobMapping = typeof servicem8JobMappings.$inferSelect;
export type NewServiceM8JobMapping = typeof servicem8JobMappings.$inferInsert;
export type ServiceM8ClientMapping = typeof servicem8ClientMappings.$inferSelect;
export type NewServiceM8ClientMapping = typeof servicem8ClientMappings.$inferInsert;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export type CertificateWithCustomer = Certificate & {
  customer: Customer;
};

export type CertificateWithItems = Certificate & {
  customer: Customer;
  items: CertificateItem[];
};

export enum CertificateType {
  BS5839_1 = 'BS5839-1',
  BS5839_6 = 'BS5839-6',
  BS5266 = 'BS5266',
  FIRE_EXTINGUISHER = 'FIRE_EXTINGUISHER',
  DRY_RISER = 'DRY_RISER',
  CP12 = 'CP12',
  EICR = 'EICR',
}

export enum CertificateStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
  ISSUED = 'issued',
}

export enum ItemStatus {
  SATISFACTORY = 'satisfactory',
  UNSATISFACTORY = 'unsatisfactory',
  NOT_TESTED = 'not_tested',
}

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESEND_VERIFICATION_EMAIL = 'RESEND_VERIFICATION_EMAIL',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  CREATE_CUSTOMER = 'CREATE_CUSTOMER',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER = 'DELETE_CUSTOMER',
  CREATE_CERTIFICATE = 'CREATE_CERTIFICATE',
  UPDATE_CERTIFICATE = 'UPDATE_CERTIFICATE',
  DELETE_CERTIFICATE = 'DELETE_CERTIFICATE',
  ISSUE_CERTIFICATE = 'ISSUE_CERTIFICATE',
  EXPORT_CERTIFICATE = 'EXPORT_CERTIFICATE',
}
