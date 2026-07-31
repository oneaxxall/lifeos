CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `knowledge_categories` (
	`knowledge_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`knowledge_id`, `category_id`),
	FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_tags` (
	`knowledge_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`knowledge_id`, `tag_id`),
	FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
-- ── Migrasi data lama: freetext category → tabel categories ──
INSERT INTO `categories` (`name`)
SELECT DISTINCT lower(trim(`category`)) FROM `knowledge`
WHERE `category` IS NOT NULL AND trim(`category`) != '';
--> statement-breakpoint
INSERT INTO `knowledge_categories` (`knowledge_id`, `category_id`)
SELECT k.`id`, c.`id` FROM `knowledge` k
JOIN `categories` c ON lower(trim(k.`category`)) = c.`name`
WHERE k.`category` IS NOT NULL AND trim(k.`category`) != '';
--> statement-breakpoint
-- ── Migrasi data lama: freetext tags (comma) → tabel tags ──
INSERT INTO `tags` (`name`)
SELECT DISTINCT trim(value) FROM `knowledge`,
json_each('["' || replace(`tags`, ',', '","') || '"]')
WHERE `tags` IS NOT NULL AND trim(`tags`) != '' AND trim(value) != '';
--> statement-breakpoint
INSERT INTO `knowledge_tags` (`knowledge_id`, `tag_id`)
SELECT k.`id`, t.`id` FROM `knowledge` k
JOIN `tags` t ON EXISTS (
  SELECT 1 FROM json_each('["' || replace(k.`tags`, ',', '","') || '"]')
  WHERE trim(value) = t.`name`
)
WHERE k.`tags` IS NOT NULL AND trim(k.`tags`) != '';
--> statement-breakpoint
ALTER TABLE `knowledge` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `knowledge` DROP COLUMN `tags`;
