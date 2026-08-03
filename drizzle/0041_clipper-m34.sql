CREATE TABLE `clipper_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`summary` text DEFAULT '',
	`candidates_json` text NOT NULL,
	`model` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clipper_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`preset_id` integer DEFAULT 0,
	`start_sec` integer NOT NULL,
	`end_sec` integer NOT NULL,
	`quality` integer DEFAULT 720 NOT NULL,
	`file_path` text NOT NULL,
	`size_bytes` integer DEFAULT 0,
	`status` text DEFAULT 'done' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clipper_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ratio` text DEFAULT '9:16' NOT NULL,
	`caption_position` text DEFAULT 'bottom' NOT NULL,
	`caption_size` integer DEFAULT 28 NOT NULL,
	`caption_color` text DEFAULT 'white' NOT NULL,
	`caption_bg` text DEFAULT 'black@0.4' NOT NULL,
	`cta_text` text DEFAULT '',
	`cta_position` text DEFAULT 'bottom' NOT NULL,
	`watermark` text DEFAULT '',
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clipper_transcripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`lang` text DEFAULT '',
	`text` text NOT NULL,
	`segments_json` text NOT NULL,
	`model` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
