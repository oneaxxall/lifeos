CREATE TABLE `stock_portfolio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`lot` integer DEFAULT 0 NOT NULL,
	`buy_price` integer DEFAULT 0 NOT NULL,
	`market_price` integer DEFAULT 0,
	`buy_date` text DEFAULT '',
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
