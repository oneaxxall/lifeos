PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`priority` text DEFAULT 'sedang' NOT NULL,
	`due_date` text DEFAULT '',
	`estimate_minutes` integer DEFAULT 0,
	`status` text DEFAULT 'backlog' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`area` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text DEFAULT ''
);
--> statement-breakpoint
-- Mapping status lama → kolom kanban (belum→todo, selesai→done, tertunda→backlog)
-- position tidak ada di tabel lama → pakai default 0 (literal)
INSERT INTO `__new_todos`("id", "title", "description", "priority", "due_date", "estimate_minutes", "status", "area", "created_at", "completed_at")
SELECT "id", "title", "description", "priority", "due_date", "estimate_minutes",
  CASE "status"
    WHEN 'selesai' THEN 'done'
    WHEN 'tertunda' THEN 'backlog'
    ELSE 'todo'
  END,
  "area", "created_at", "completed_at"
FROM `todos`;--> statement-breakpoint
DROP TABLE `todos`;--> statement-breakpoint
ALTER TABLE `__new_todos` RENAME TO `todos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;