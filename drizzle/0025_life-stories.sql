CREATE TABLE `life_stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`age` integer DEFAULT 1 NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'lainnya' NOT NULL,
	`actors` text DEFAULT '',
	`story` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
