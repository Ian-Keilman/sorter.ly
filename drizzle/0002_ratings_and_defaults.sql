PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`configuration` text DEFAULT '{"version":1}' NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "fields_type_check" CHECK("__new_fields"."type" in ('text', 'number', 'date', 'boolean', 'rating')),
	CONSTRAINT "fields_configuration_check" CHECK(case when json_valid("__new_fields"."configuration") then (
        json_type("__new_fields"."configuration") = 'object'
        and coalesce(json_extract("__new_fields"."configuration", '$.version') = 1, 0)
        and (json_type("__new_fields"."configuration", '$.defaultValue') is null
          or json_type("__new_fields"."configuration", '$.defaultValue') = 'text')
        and coalesce((
          ("__new_fields"."type" = 'rating'
            and json_type("__new_fields"."configuration", '$.rating') = 'object'
            and json_extract("__new_fields"."configuration", '$.rating.maximum') in (5, 10, 100)
            and json_extract("__new_fields"."configuration", '$.rating.step') in (1, 0.5, 0.1, 0.01))
          or ("__new_fields"."type" != 'rating'
            and json_type("__new_fields"."configuration", '$.rating') is null)
        ), 0)
      ) else 0 end),
	CONSTRAINT "fields_required_check" CHECK("__new_fields"."required" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_fields`("id", "collection_id", "name", "key", "type", "configuration", "required", "position", "created_at") SELECT "id", "collection_id", "name", "key", "type", '{"version":1}', "required", "position", "created_at" FROM `fields`;--> statement-breakpoint
DROP TABLE `fields`;--> statement-breakpoint
ALTER TABLE `__new_fields` RENAME TO `fields`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `fields_id_collection_idx` ON `fields` (`id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `fields_collection_position_idx` ON `fields` (`collection_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `fields_collection_key_idx` ON `fields` (`collection_id`,`key`);
