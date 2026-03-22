import { sql } from "drizzle-orm";
import {
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
      enum: ["text", "number", "date", "boolean"],
    }).notNull(),
    required: integer("required", { mode: "boolean" })
      .notNull()
      .default(false),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    collectionPositionIdx: index("fields_collection_position_idx").on(
      table.collectionId,
      table.position
    ),
    collectionKeyIdx: uniqueIndex("fields_collection_key_idx").on(
      table.collectionId,
      table.key
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
  })
);

export const recordValues = sqliteTable(
  "record_values",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => fields.id, { onDelete: "cascade" }),
    textValue: text("text_value"),
    numberValue: real("number_value"),
    dateValue: text("date_value"),
    booleanValue: integer("boolean_value", { mode: "boolean" }),
  },
  (table) => ({
    recordFieldIdx: uniqueIndex("record_values_record_field_idx").on(
      table.recordId,
      table.fieldId
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
  })
);