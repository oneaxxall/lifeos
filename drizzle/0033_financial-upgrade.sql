CREATE TABLE `financial_children` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer DEFAULT 0 NOT NULL,
	`school_level` text DEFAULT 'kuliah' NOT NULL,
	`school_cost_year` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `debts` ADD `interest_rate` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `debts` ADD `monthly_installment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `financial_plans` ADD `age` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `financial_plans` ADD `dividend_target` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `financial_plans` ADD `dividend_yield` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `financial_plans` ADD `analysis` text DEFAULT '';