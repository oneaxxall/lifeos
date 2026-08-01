CREATE TABLE `affiliate_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product` text NOT NULL,
	`marketplace` text DEFAULT 'tiktok-shop' NOT NULL,
	`link` text DEFAULT '',
	`price` integer DEFAULT 0 NOT NULL,
	`commission_pct` integer DEFAULT 5 NOT NULL,
	`analysis` text DEFAULT '',
	`idea_id` integer,
	`script_id` integer,
	`status` text DEFAULT 'riset' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`commission_received` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`format` text DEFAULT 'review',
	`ideas` text NOT NULL,
	`status` text DEFAULT 'ide' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`idea_id` integer,
	`duration` integer DEFAULT 45 NOT NULL,
	`script` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
