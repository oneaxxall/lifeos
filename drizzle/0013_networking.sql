CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '',
	`company` text DEFAULT '',
	`context` text DEFAULT '',
	`interests` text DEFAULT '',
	`priority` text DEFAULT 'sedang' NOT NULL,
	`last_contact` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
