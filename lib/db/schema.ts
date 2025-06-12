import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

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
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// Fire Safety Certificate Management Tables
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

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  customers: many(customers),
  certificates: many(certificates),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
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
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type CertificateItem = typeof certificateItems.$inferSelect;
export type NewCertificateItem = typeof certificateItems.$inferInsert;

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
