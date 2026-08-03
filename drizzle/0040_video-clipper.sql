CREATE TABLE `clipper_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`url` text DEFAULT '',
	`video_id` integer DEFAULT 0,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`message` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clipper_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`channel` text DEFAULT '',
	`url` text DEFAULT '',
	`file_path` text NOT NULL,
	`duration_sec` integer DEFAULT 0,
	`size_bytes` integer DEFAULT 0,
	`thumbnail` text DEFAULT '',
	`status` text DEFAULT 'downloaded' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
