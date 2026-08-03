CREATE TABLE `bonds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text DEFAULT '',
	`type` text DEFAULT 'fr' NOT NULL,
	`nominal` integer DEFAULT 0 NOT NULL,
	`buy_price` integer DEFAULT 0,
	`coupon_rate` integer DEFAULT 0,
	`maturity_date` text DEFAULT '',
	`status` text DEFAULT 'aktif' NOT NULL,
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gold_holdings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`grams` real DEFAULT 0 NOT NULL,
	`buy_price_per_gram` integer DEFAULT 0 NOT NULL,
	`current_price_per_gram` integer DEFAULT 0,
	`status` text DEFAULT 'simpan' NOT NULL,
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mutual_funds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'pasar_uang' NOT NULL,
	`units` integer DEFAULT 0 NOT NULL,
	`nav_price` integer DEFAULT 0 NOT NULL,
	`invested_amount` integer DEFAULT 0,
	`status` text DEFAULT 'aktif' NOT NULL,
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
