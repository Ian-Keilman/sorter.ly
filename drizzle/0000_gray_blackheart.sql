CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_idx` ON `collections` (`slug`);--> statement-breakpoint
CREATE TABLE `fields` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fields_collection_position_idx` ON `fields` (`collection_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `fields_collection_key_idx` ON `fields` (`collection_id`,`key`);--> statement-breakpoint
CREATE TABLE `record_values` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`field_id` text NOT NULL,
	`text_value` text,
	`number_value` real,
	`date_value` text,
	`boolean_value` integer,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `record_values_record_field_idx` ON `record_values` (`record_id`,`field_id`);--> statement-breakpoint
CREATE INDEX `record_values_field_text_idx` ON `record_values` (`field_id`,`text_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_number_idx` ON `record_values` (`field_id`,`number_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_date_idx` ON `record_values` (`field_id`,`date_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_boolean_idx` ON `record_values` (`field_id`,`boolean_value`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `records_collection_idx` ON `records` (`collection_id`);