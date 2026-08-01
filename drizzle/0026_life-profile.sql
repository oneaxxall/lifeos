CREATE TABLE `life_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`birth_date` text DEFAULT '',
	`values` text DEFAULT '',
	`childhood_wounds` text DEFAULT '',
	`parenting` text DEFAULT '',
	`family` text DEFAULT '',
	`life_notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
