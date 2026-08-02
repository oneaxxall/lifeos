ALTER TABLE `chat_sessions` ADD `mode` text DEFAULT 'curhat' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD `advisor` text DEFAULT 'psikolog' NOT NULL;
--> statement-breakpoint
UPDATE chat_sessions SET mode='advisor';
