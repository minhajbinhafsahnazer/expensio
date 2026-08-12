ALTER TABLE "users" ADD COLUMN "superior_categories_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "superior_category" text;