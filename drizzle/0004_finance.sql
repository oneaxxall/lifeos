CREATE TABLE `finance_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'keluar' NOT NULL,
	`icon` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_categories_name_unique` ON `finance_categories` (`name`);--> statement-breakpoint
CREATE TABLE `finance_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` integer NOT NULL,
	`type` text DEFAULT 'keluar' NOT NULL,
	`description` text DEFAULT '',
	`category_id` integer,
	`date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON UPDATE no action ON DELETE set null
);
