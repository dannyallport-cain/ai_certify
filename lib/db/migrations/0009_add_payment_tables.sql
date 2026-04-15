DO $$ BEGIN
 CREATE TYPE "public"."PaymentType" AS ENUM('subscription', 'one_time');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."PaymentMode" AS ENUM('subscription', 'payment', 'setup');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."PaymentTransactionStatus" AS ENUM(
  'pending',
  'requires_action',
  'processing',
  'succeeded',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'expired'
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."PurchaseEntitlementStatus" AS ENUM(
  'pending',
  'active',
  'consumed',
  'expired',
  'revoked'
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL,
  "user_id" integer,
  "payment_type" "public"."PaymentType" NOT NULL,
  "mode" "public"."PaymentMode" DEFAULT 'payment'::"public"."PaymentMode" NOT NULL,
  "purchase_type" varchar(100),
  "stripe_customer_id" text,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "stripe_invoice_id" text,
  "stripe_charge_id" text,
  "stripe_subscription_id" text,
  "stripe_product_id" text,
  "stripe_price_id" text,
  "amount" integer,
  "amount_subtotal" integer,
  "amount_tax" integer,
  "amount_discount" integer,
  "currency" varchar(10),
  "status" "public"."PaymentTransactionStatus" DEFAULT 'pending'::"public"."PaymentTransactionStatus" NOT NULL,
  "description" text,
  "metadata" json,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "purchase_entitlements" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL,
  "user_id" integer,
  "payment_transaction_id" integer,
  "payment_type" "public"."PaymentType" NOT NULL,
  "purchase_type" varchar(100) NOT NULL,
  "feature_key" varchar(100),
  "quantity" integer DEFAULT 1 NOT NULL,
  "status" "public"."PurchaseEntitlementStatus" DEFAULT 'pending'::"public"."PurchaseEntitlementStatus" NOT NULL,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "consumed_at" timestamp,
  "revoked_at" timestamp,
  "metadata" json,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_payment_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_transactions_team_id_idx" ON "payment_transactions" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_user_id_idx" ON "payment_transactions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_payment_type_idx" ON "payment_transactions" ("payment_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_created_at_idx" ON "payment_transactions" ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_checkout_session_id_idx" ON "payment_transactions" ("stripe_checkout_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_payment_intent_id_idx" ON "payment_transactions" ("stripe_payment_intent_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_invoice_id_idx" ON "payment_transactions" ("stripe_invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_charge_id_idx" ON "payment_transactions" ("stripe_charge_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_subscription_id_idx" ON "payment_transactions" ("stripe_subscription_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "purchase_entitlements_team_id_idx" ON "purchase_entitlements" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_user_id_idx" ON "purchase_entitlements" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_payment_transaction_id_idx" ON "purchase_entitlements" ("payment_transaction_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_purchase_type_idx" ON "purchase_entitlements" ("purchase_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_feature_key_idx" ON "purchase_entitlements" ("feature_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_status_idx" ON "purchase_entitlements" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_entitlements_created_at_idx" ON "purchase_entitlements" ("created_at");
