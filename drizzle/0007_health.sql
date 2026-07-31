CREATE TABLE `health_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`weight_kg` integer DEFAULT 0,
	`sleep_hours` integer DEFAULT 0,
	`exercise_minutes` integer DEFAULT 0,
	`steps` integer DEFAULT 0,
	`water_glasses` integer DEFAULT 0,
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_entries_date_unique` ON `health_entries` (`date`);--> statement-breakpoint
CREATE TABLE `health_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_weight_kg` integer DEFAULT 0,
	`exercise_per_week_minutes` integer DEFAULT 0,
	`sleep_target_hours` integer DEFAULT 0,
	`daily_steps_target` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
