ALTER TABLE "rental_contracts" ADD COLUMN "rental_period_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD COLUMN "rental_period_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_rental_period_count_check" CHECK ("rental_contracts"."rental_period_count" > 0);--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD CONSTRAINT "rental_quotes_rental_period_count_check" CHECK ("rental_quotes"."rental_period_count" > 0);