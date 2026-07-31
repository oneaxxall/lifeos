CREATE TABLE `insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'harian' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'baru' NOT NULL,
	`source` text DEFAULT '',
	`date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
