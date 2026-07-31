CREATE TABLE `embeddings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_table` text NOT NULL,
	`source_id` integer NOT NULL,
	`model` text NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`chunk_text` text NOT NULL,
	`vector` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insight_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`insight_text` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'umum' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '',
	`summary` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`priority` text DEFAULT 'sedang' NOT NULL,
	`due_date` text DEFAULT '',
	`estimate_minutes` integer DEFAULT 0,
	`status` text DEFAULT 'belum' NOT NULL,
	`area` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text DEFAULT ''
);
