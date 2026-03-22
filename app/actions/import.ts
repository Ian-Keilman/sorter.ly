/* if you're wondering, importing files is MUCH harder than exporting. */


"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { collections, fields, records, recordValues } from "../../db/schema";

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function keyify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return base || "field";
}

function getUniqueKey(base: string, usedKeys: Set<string>) {
  if (!usedKeys.has(base)) {
    usedKeys.add(base);
    return base;
  }

  let count = 2;
  let candidate = `${base}_${count}`;

  while (usedKeys.has(candidate)) {
    count += 1;
    candidate = `${base}_${count}`;
  }

  usedKeys.add(candidate);
  return candidate;
}

function parseBooleanCell(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "y", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseCsv(text: string) {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      if (input[i + 1] === "\n") {
        i += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((currentRow) =>
    currentRow.some((currentCell) => currentCell.trim() !== "")
  );
}

export async function importCsv(formData: FormData) {
  const rawCollectionId = formData.get("collectionId");
  const file = formData.get("file");

  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!collectionId || !(file instanceof File) || file.size === 0) {
    return;
  }

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  if (!collection) {
    return;
  }

  const csvText = await file.text();
  const parsedRows = parseCsv(csvText);

  if (parsedRows.length === 0) {
    return;
  }

  const rawHeaders = parsedRows[0];
  const dataRows = parsedRows.slice(1);

  if (rawHeaders.length === 0 || dataRows.length === 0) {
    return;
  }

  const headers = rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    return trimmed !== "" ? trimmed : `Column ${index + 1}`;
  });

  let fieldRows = db
    .select()
    .from(fields)
    .where(eq(fields.collectionId, collectionId))
    .orderBy(asc(fields.position))
    .all();

  const fieldByName = new Map(
    fieldRows.map((field) => [normalizeLabel(field.name), field])
  );

  const fieldByKey = new Map(fieldRows.map((field) => [field.key, field]));

  const usedKeys = new Set(fieldRows.map((field) => field.key));
  let nextPosition = fieldRows.length;

  const headerFieldMap = new Map<number, (typeof fields.$inferSelect)>();

  const newFields: typeof fields.$inferInsert[] = [];

  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i];
    const normalizedHeader = normalizeLabel(header);
    const headerKey = keyify(header);

    const matchedField =
      fieldByName.get(normalizedHeader) ?? fieldByKey.get(headerKey);

    if (matchedField) {
      headerFieldMap.set(i, matchedField);
      continue;
    }

    const newField = {
      id: crypto.randomUUID(),
      collectionId,
      name: header,
      key: getUniqueKey(headerKey, usedKeys),
      type: "text" as const,
      required: false,
      position: nextPosition,
    };

    nextPosition += 1;
    newFields.push(newField);
    headerFieldMap.set(i, newField as typeof fields.$inferSelect);
  }

  if (newFields.length > 0) {
    db.insert(fields).values(newFields).run();

    fieldRows = db
      .select()
      .from(fields)
      .where(eq(fields.collectionId, collectionId))
      .orderBy(asc(fields.position))
      .all();
  }

  const recordsToInsert: typeof records.$inferInsert[] = [];
  const valuesToInsert: typeof recordValues.$inferInsert[] = [];

  for (const currentRow of dataRows) {
    const hasAnyData = currentRow.some((cell) => cell.trim() !== "");

    if (!hasAnyData) {
      continue;
    }

    const recordId = crypto.randomUUID();

    recordsToInsert.push({
      id: recordId,
      collectionId,
    });

    for (let i = 0; i < headers.length; i += 1) {
      const field = headerFieldMap.get(i);

      if (!field) {
        continue;
      }

      const rawCell = currentRow[i] ?? "";
      const cell = rawCell.trim();

      if (cell === "") {
        continue;
      }

      if (field.type === "text") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          textValue: cell,
        });
      }

      if (field.type === "number") {
        const parsedNumber = Number(cell);

        if (Number.isFinite(parsedNumber)) {
          valuesToInsert.push({
            id: crypto.randomUUID(),
            recordId,
            fieldId: field.id,
            numberValue: parsedNumber,
          });
        }
      }

      if (field.type === "date") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          dateValue: cell,
        });
      }

      if (field.type === "boolean") {
        const parsedBoolean = parseBooleanCell(cell);

        if (parsedBoolean !== null) {
          valuesToInsert.push({
            id: crypto.randomUUID(),
            recordId,
            fieldId: field.id,
            booleanValue: parsedBoolean,
          });
        }
      }
    }
  }

  if (recordsToInsert.length > 0) {
    db.insert(records).values(recordsToInsert).run();
  }

  if (valuesToInsert.length > 0) {
    db.insert(recordValues).values(valuesToInsert).run();
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
  revalidatePath(`/collections/${collectionId}/import`);
  redirect(`/collections/${collectionId}`);
}