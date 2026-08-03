ALTER TABLE `clipper_presets` ADD `hook_voice` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clipper_presets` ADD `hook_voice_name` text DEFAULT 'id-ID-GadisNeural' NOT NULL;--> statement-breakpoint
ALTER TABLE `clipper_presets` ADD `show_intro` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clipper_presets` ADD `intro_duration` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `clipper_presets` ADD `intro_bg` text DEFAULT '#0D9488' NOT NULL;