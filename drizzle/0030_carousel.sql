CREATE TABLE `carousel_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_name` text DEFAULT 'LifeOS',
	`handle` text DEFAULT '@lifeos',
	`tagline` text DEFAULT '',
	`initials` text DEFAULT 'L',
	`show_branding` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `carousels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`slide_count` integer DEFAULT 5 NOT NULL,
	`theme` text DEFAULT 'teal' NOT NULL,
	`bg_source` text DEFAULT 'ai' NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
