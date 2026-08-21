CREATE TABLE IF NOT EXISTS "user_category_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"normalized_term" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category" SET DEFAULT 'Uncategorized';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_source" varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_confidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "transactions" SET "description" = "category", "category" = 'Uncategorized', "category_source" = 'unknown', "category_confidence" = 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_category_mappings" ADD CONSTRAINT "user_category_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_category_mappings_user_id_idx" ON "user_category_mappings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_category_mappings_user_term_idx" ON "user_category_mappings" ("user_id","normalized_term");