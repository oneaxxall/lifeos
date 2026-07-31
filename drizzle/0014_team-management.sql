CREATE TABLE `team_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`period` text DEFAULT '',
	`rating` integer DEFAULT 0,
	`feedback` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '',
	`seniority` text DEFAULT 'mid' NOT NULL,
	`strengths` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_one_on_ones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`date` text NOT NULL,
	`topics` text DEFAULT '',
	`action_items` text DEFAULT '',
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
