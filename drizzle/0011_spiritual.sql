CREATE TABLE `spiritual_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`rituals` text DEFAULT '{}' NOT NULL,
	`quality` integer DEFAULT 0,
	`reflection` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spiritual_entries_date_unique` ON `spiritual_entries` (`date`);--> statement-breakpoint
CREATE TABLE `spiritual_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quran_khatam_juz` integer DEFAULT 0,
	`weekly_read_minutes` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
