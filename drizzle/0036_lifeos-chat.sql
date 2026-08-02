CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`role` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT 'Percakapan baru' NOT NULL,
	`context` text DEFAULT 'umum' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
