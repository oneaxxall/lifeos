CREATE TABLE `bad_habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'digital' NOT NULL,
	`target_text` text DEFAULT '',
	`alasan` text DEFAULT '',
	`weekly_target` integer DEFAULT 0,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habit_id` integer NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`jumlah_kambuh` integer DEFAULT 1 NOT NULL,
	`catatan` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `bad_habits`(`id`) ON UPDATE no action ON DELETE cascade
);
