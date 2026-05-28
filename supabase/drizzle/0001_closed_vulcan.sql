ALTER TABLE "rental_contracts" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "surcharge_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD COLUMN "surcharge_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_discount_cents_check" CHECK ("rental_contracts"."discount_cents" >= 0);--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_surcharge_cents_check" CHECK ("rental_contracts"."surcharge_cents" >= 0);--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD CONSTRAINT "rental_quotes_discount_cents_check" CHECK ("rental_quotes"."discount_cents" >= 0);--> statement-breakpoint
ALTER TABLE "rental_quotes" ADD CONSTRAINT "rental_quotes_surcharge_cents_check" CHECK ("rental_quotes"."surcharge_cents" >= 0);