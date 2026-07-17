PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_record_values` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`record_id` text NOT NULL,
	`field_id` text NOT NULL,
	`text_value` text,
	`number_value` real,
	`date_value` text,
	`boolean_value` integer,
	FOREIGN KEY (`record_id`,`collection_id`) REFERENCES `records`(`id`,`collection_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`,`collection_id`) REFERENCES `fields`(`id`,`collection_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "record_values_exactly_one_value_check" CHECK((("__new_record_values"."text_value" is not null) + ("__new_record_values"."number_value" is not null) + ("__new_record_values"."date_value" is not null) + ("__new_record_values"."boolean_value" is not null)) = 1),
	CONSTRAINT "record_values_boolean_value_check" CHECK("__new_record_values"."boolean_value" is null or "__new_record_values"."boolean_value" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_record_values`("id", "collection_id", "record_id", "field_id", "text_value", "number_value", "date_value", "boolean_value")
SELECT
	"record_values"."id",
	(
		SELECT "records"."collection_id"
		FROM "records"
		WHERE "records"."id" = "record_values"."record_id"
			AND EXISTS (
				SELECT 1
				FROM "fields"
				WHERE "fields"."id" = "record_values"."field_id"
					AND "fields"."collection_id" = "records"."collection_id"
			)
	),
	"record_values"."record_id",
	"record_values"."field_id",
	"record_values"."text_value",
	"record_values"."number_value",
	"record_values"."date_value",
	"record_values"."boolean_value"
FROM `record_values`;--> statement-breakpoint
DROP TABLE `record_values`;--> statement-breakpoint
ALTER TABLE `__new_record_values` RENAME TO `record_values`;--> statement-breakpoint
CREATE UNIQUE INDEX `record_values_record_field_idx` ON `record_values` (`record_id`,`field_id`);--> statement-breakpoint
CREATE INDEX `record_values_record_collection_idx` ON `record_values` (`record_id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `record_values_field_collection_idx` ON `record_values` (`field_id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `record_values_field_text_idx` ON `record_values` (`field_id`,`text_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_number_idx` ON `record_values` (`field_id`,`number_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_date_idx` ON `record_values` (`field_id`,`date_value`);--> statement-breakpoint
CREATE INDEX `record_values_field_boolean_idx` ON `record_values` (`field_id`,`boolean_value`);--> statement-breakpoint
CREATE TABLE `__new_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "fields_type_check" CHECK("__new_fields"."type" in ('text', 'number', 'date', 'boolean')),
	CONSTRAINT "fields_required_check" CHECK("__new_fields"."required" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_fields`("id", "collection_id", "name", "key", "type", "required", "position", "created_at") SELECT "id", "collection_id", "name", "key", "type", "required", "position", "created_at" FROM `fields`;--> statement-breakpoint
DROP TABLE `fields`;--> statement-breakpoint
ALTER TABLE `__new_fields` RENAME TO `fields`;--> statement-breakpoint
CREATE UNIQUE INDEX `fields_id_collection_idx` ON `fields` (`id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `fields_collection_position_idx` ON `fields` (`collection_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `fields_collection_key_idx` ON `fields` (`collection_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `records_id_collection_idx` ON `records` (`id`,`collection_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
