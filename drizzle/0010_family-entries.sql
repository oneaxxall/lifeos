CREATE TABLE `family_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`people` text DEFAULT '',
	`mood` text DEFAULT '',
	`ai_advice` text DEFAULT '',
	`date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
