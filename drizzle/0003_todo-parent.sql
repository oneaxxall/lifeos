ALTER TABLE `todos` ADD `parent_id` integer;--> statement-breakpoint
-- Index untuk lookup sub-tugas (cascade dihapus manual di kode — SQLite
-- tidak mendukung ADD CONSTRAINT pada ALTER TABLE)
CREATE INDEX `todos_parent_id_idx` ON `todos` (`parent_id`);
