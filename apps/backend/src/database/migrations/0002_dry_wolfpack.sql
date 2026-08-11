CREATE TABLE IF NOT EXISTS "financial_goals" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"title" varchar(255) NOT NULL,
	"target_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"category" varchar(100),
	"target_date" timestamp with time zone,
	"color" varchar(50) DEFAULT 'default' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
