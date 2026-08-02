CREATE TABLE `quote_topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`personality` text DEFAULT 'bijak' NOT NULL,
	`description` text DEFAULT '',
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_topics_name_unique` ON `quote_topics` (`name`);