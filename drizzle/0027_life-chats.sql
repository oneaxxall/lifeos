CREATE TABLE `life_chats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`age` integer DEFAULT 1 NOT NULL,
	`role` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
