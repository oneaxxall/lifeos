CREATE TABLE `debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'hutang' NOT NULL,
	`party` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`payment_mode` text DEFAULT 'sekali' NOT NULL,
	`installment_count` integer DEFAULT 1 NOT NULL,
	`installments_paid` integer DEFAULT 0 NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`due_date` text DEFAULT '',
	`status` text DEFAULT 'belum' NOT NULL,
	`notes` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
