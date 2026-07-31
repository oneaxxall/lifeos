CREATE TABLE `sick_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symptoms` text NOT NULL,
	`duration` text DEFAULT '',
	`notes` text DEFAULT '',
	`ai_advice` text DEFAULT '',
	`needs_professional` integer DEFAULT false NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
