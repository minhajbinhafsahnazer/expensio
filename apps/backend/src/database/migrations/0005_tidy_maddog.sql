DO $$ BEGIN
 CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE transaction_type USING type::transaction_type;
ALTER TABLE "transactions" ALTER COLUMN "type" SET DEFAULT 'expense'::transaction_type;