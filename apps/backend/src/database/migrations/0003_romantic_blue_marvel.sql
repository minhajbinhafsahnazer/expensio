ALTER TABLE "financial_goals" ADD COLUMN "priority" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" DROP COLUMN IF EXISTS "category";