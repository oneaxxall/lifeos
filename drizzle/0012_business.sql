CREATE TABLE `business_ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`status` text DEFAULT 'baru' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `business_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`stage` text DEFAULT 'riset' NOT NULL,
	`target` text DEFAULT '',
	`deadline` text DEFAULT '',
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
