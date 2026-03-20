ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_stripe_customer_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "teams_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_stripe_subscription_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "teams_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "plan_name" varchar(50);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_status" varchar(20);
