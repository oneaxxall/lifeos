PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clipper_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ratio` text DEFAULT '9:16' NOT NULL,
	`caption_position` text DEFAULT 'bottom' NOT NULL,
	`caption_size` integer DEFAULT 28 NOT NULL,
	`caption_color` text DEFAULT 'white' NOT NULL,
	`caption_bg` text DEFAULT 'black@0.4' NOT NULL,
	`cta_text` text DEFAULT '',
	`cta_position` text DEFAULT 'bottom' NOT NULL,
	`cta_color` text DEFAULT '#FFD400' NOT NULL,
	`cta_size` integer DEFAULT 32 NOT NULL,
	`cta_border_size` integer DEFAULT 0 NOT NULL,
	`cta_border_color` text DEFAULT '#000000' NOT NULL,
	`show_source` integer DEFAULT 0 NOT NULL,
	`source_position` text DEFAULT 'bottom' NOT NULL,
	`source_show_url` integer DEFAULT 1 NOT NULL,
	`source_prefix` text DEFAULT 'Sumber YouTube :' NOT NULL,
	`src_bg` text DEFAULT 'black@0.55' NOT NULL,
	`font_family` text DEFAULT 'Inter' NOT NULL,
	`caption_mode` text DEFAULT 'sentence' NOT NULL,
	`cta_bg` text DEFAULT 'black@0.5' NOT NULL,
	`watermark` text DEFAULT '',
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_clipper_presets`("id", "name", "ratio", "caption_position", "caption_size", "caption_color", "caption_bg", "cta_text", "cta_position", "cta_color", "cta_size", "cta_border_size", "cta_border_color", "show_source", "source_position", "source_show_url", "source_prefix", "src_bg", "font_family", "caption_mode", "cta_bg", "watermark", "is_default", "created_at") SELECT "id", "name", "ratio", "caption_position", "caption_size", "caption_color", "caption_bg", "cta_text", "cta_position", "cta_color", "cta_size", "cta_border_size", "cta_border_color", "show_source", "source_position", "source_show_url", "source_prefix", "src_bg", "font_family", "caption_mode", "cta_bg", "watermark", "is_default", "created_at" FROM `clipper_presets`;--> statement-breakpoint
DROP TABLE `clipper_presets`;--> statement-breakpoint
ALTER TABLE `__new_clipper_presets` RENAME TO `clipper_presets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;