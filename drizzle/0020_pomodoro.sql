CREATE TABLE `pomodoro_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`duration_minutes` integer DEFAULT 25 NOT NULL,
	`cycle` integer DEFAULT 1 NOT NULL,
	`task` text DEFAULT '',
	`completed` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
