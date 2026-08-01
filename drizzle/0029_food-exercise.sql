CREATE TABLE `exercise_programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal` text NOT NULL,
	`program` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`request` text DEFAULT '',
	`recipe` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
