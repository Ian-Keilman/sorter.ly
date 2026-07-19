import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("collections_slug_idx").on(table.slug),
  })
);

export const fields = sqliteTable(
  "fields",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(),
    type: text("type", {
      enum: ["text", "number", "date", "boolean", "rating"],
    }).notNull(),
    configuration: text("configuration")
      .notNull()
      .default('{"version":1}'),
    required: integer("required", { mode: "boolean" })
      .notNull()
      .default(false),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    idCollectionIdx: uniqueIndex("fields_id_collection_idx").on(
      table.id,
      table.collectionId
    ),
    collectionPositionIdx: index("fields_collection_position_idx").on(
      table.collectionId,
      table.position
    ),
    collectionKeyIdx: uniqueIndex("fields_collection_key_idx").on(
      table.collectionId,
      table.key
    ),
    typeCheck: check(
      "fields_type_check",
      sql`${table.type} in ('text', 'number', 'date', 'boolean', 'rating')`
    ),
    configurationCheck: check(
      "fields_configuration_check",
      sql`case when json_valid(${table.configuration}) then (
        json_type(${table.configuration}) = 'object'
        and coalesce(json_extract(${table.configuration}, '$.version') = 1, 0)
        and (json_type(${table.configuration}, '$.defaultValue') is null
          or json_type(${table.configuration}, '$.defaultValue') = 'text')
        and coalesce((
          (${table.type} = 'rating'
            and json_type(${table.configuration}, '$.rating') = 'object'
            and json_extract(${table.configuration}, '$.rating.maximum') in (5, 10, 100)
            and json_extract(${table.configuration}, '$.rating.step') in (1, 0.5, 0.1, 0.01))
          or (${table.type} != 'rating'
            and json_type(${table.configuration}, '$.rating') is null)
        ), 0)
      ) else 0 end`
    ),
    requiredCheck: check(
      "fields_required_check",
      sql`${table.required} in (0, 1)`
    ),
  })
);

export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    collectionIdx: index("records_collection_idx").on(table.collectionId),
    idCollectionIdx: uniqueIndex("records_id_collection_idx").on(
      table.id,
      table.collectionId
    ),
  })
);

export const recordValues = sqliteTable(
  "record_values",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull(),
    recordId: text("record_id").notNull(),
    fieldId: text("field_id").notNull(),
    textValue: text("text_value"),
    numberValue: real("number_value"),
    dateValue: text("date_value"),
    booleanValue: integer("boolean_value", { mode: "boolean" }),
  },
  (table) => ({
    recordCollectionFk: foreignKey({
      columns: [table.recordId, table.collectionId],
      foreignColumns: [records.id, records.collectionId],
      name: "record_values_record_collection_fk",
    }).onDelete("cascade"),
    fieldCollectionFk: foreignKey({
      columns: [table.fieldId, table.collectionId],
      foreignColumns: [fields.id, fields.collectionId],
      name: "record_values_field_collection_fk",
    }).onDelete("cascade"),
    recordFieldIdx: uniqueIndex("record_values_record_field_idx").on(
      table.recordId,
      table.fieldId
    ),
    recordCollectionIdx: index("record_values_record_collection_idx").on(
      table.recordId,
      table.collectionId
    ),
    fieldCollectionIdx: index("record_values_field_collection_idx").on(
      table.fieldId,
      table.collectionId
    ),
    fieldTextIdx: index("record_values_field_text_idx").on(
      table.fieldId,
      table.textValue
    ),
    fieldNumberIdx: index("record_values_field_number_idx").on(
      table.fieldId,
      table.numberValue
    ),
    fieldDateIdx: index("record_values_field_date_idx").on(
      table.fieldId,
      table.dateValue
    ),
    fieldBooleanIdx: index("record_values_field_boolean_idx").on(
      table.fieldId,
      table.booleanValue
    ),
    exactlyOneValueCheck: check(
      "record_values_exactly_one_value_check",
      sql`((${table.textValue} is not null) + (${table.numberValue} is not null) + (${table.dateValue} is not null) + (${table.booleanValue} is not null)) = 1`
    ),
    booleanValueCheck: check(
      "record_values_boolean_value_check",
      sql`${table.booleanValue} is null or ${table.booleanValue} in (0, 1)`
    ),
  })
);
