CREATE TABLE IF NOT EXISTS "user_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_categories_user_id_idx" ON "user_categories" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_categories_user_normalized_name_idx" ON "user_categories" ("user_id","normalized_name");