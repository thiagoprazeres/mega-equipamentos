ALTER TABLE "rental_contracts" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "payment_date" date;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "payment_method" text DEFAULT 'not_defined' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "financial_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "operational_code" text DEFAULT 'SR' NOT NULL;--> statement-breakpoint
CREATE INDEX "rental_contracts_due_date_idx" ON "rental_contracts" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "rental_contracts_financial_status_idx" ON "rental_contracts" USING btree ("financial_status");--> statement-breakpoint
CREATE INDEX "rental_contracts_operational_code_idx" ON "rental_contracts" USING btree ("operational_code");--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_payment_method_check" CHECK ("rental_contracts"."payment_method" in ('not_defined', 'pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'courtesy', 'other'));--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_financial_status_check" CHECK ("rental_contracts"."financial_status" in ('pending', 'paid', 'overdue', 'partial', 'cancelled'));--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_operational_code_check" CHECK ("rental_contracts"."operational_code" in ('CR', 'SR', 'SR/C'));
