/* if you're wondering, importing files is MUCH harder than exporting. */


"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseCsv } from "../../core/csv";
import { normalizeRecordValues } from "../../core/record-values";
import { db } from "../../db";
import { createRecordValueRows } from "../../db/record-values";
import { collections, fields, records, recordValues } from "../../db/schema";

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_CSV_DATA_ROWS = 10_000;

function importErrorPath(
  collectionId: string,
  error: string,
  row?: number
) {
  const params = new URLSearchParams({ error });

  if (row !== undefined) {
    params.set("row", String(row));
  }

  return `/collections/${collectionId}/import?${params.toString()}`;
}

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

export async function importCsv(formData: FormData) {
  const rawCollectionId = formData.get("collectionId");
  const file = formData.get("file");

  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!collectionId || !(file instanceof File)) {
    return;
  }

  if (file.size === 0) {
    redirect(importErrorPath(collectionId, "empty-file"));
  }

  if (file.size > MAX_CSV_BYTES) {
    redirect(importErrorPath(collectionId, "file-too-large"));
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
  let parsedRows: string[][];

  try {
    parsedRows = parseCsv(csvText);
  } catch {
    redirect(importErrorPath(collectionId, "invalid-csv"));
  }

  if (parsedRows.length === 0) {
    redirect(importErrorPath(collectionId, "empty-file"));
  }

  const rawHeaders = parsedRows[0];
  const dataRows = parsedRows.slice(1);

  if (rawHeaders.length === 0 || dataRows.length === 0) {
    redirect(importErrorPath(collectionId, "no-records"));
  }

  if (dataRows.length > MAX_CSV_DATA_ROWS) {
    redirect(importErrorPath(collectionId, "too-many-rows"));
  }

  const usedHeaderLabels = new Set<string>();

  const headers = rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    const label = trimmed !== "" ? trimmed : `Column ${index + 1}`;
    let uniqueLabel = label;
    let suffix = 2;

    while (usedHeaderLabels.has(normalizeLabel(uniqueLabel))) {
      uniqueLabel = `${label} ${suffix}`;
      suffix += 1;
    }

    usedHeaderLabels.add(normalizeLabel(uniqueLabel));
    return uniqueLabel;
  });

  const fieldRows = db
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

  const recordsToInsert: typeof records.$inferInsert[] = [];
  const valuesToInsert: typeof recordValues.$inferInsert[] = [];
  const validationFields = [...fieldRows, ...newFields].map((field) => ({
    id: field.id,
    name: field.name,
    type: field.type,
    required: field.required ?? false,
  }));

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const currentRow = dataRows[rowIndex];
    const hasAnyData = currentRow.some((cell) => cell.trim() !== "");

    if (!hasAnyData) {
      continue;
    }

    const recordId = crypto.randomUUID();

    recordsToInsert.push({
      id: recordId,
      collectionId,
    });

    const rawValueByFieldId = new Map<string, string>();

    for (let i = 0; i < headers.length; i += 1) {
      const field = headerFieldMap.get(i);

      if (field) {
        rawValueByFieldId.set(field.id, currentRow[i] ?? "");
      }
    }

    const normalized = normalizeRecordValues(
      validationFields,
      (field) => rawValueByFieldId.get(field.id)
    );

    if (normalized.issues.length > 0) {
      redirect(importErrorPath(collectionId, "invalid-values", rowIndex + 2));
    }

    valuesToInsert.push(
      ...createRecordValueRows(collectionId, recordId, normalized.values)
    );
  }

  db.transaction((tx) => {
    if (newFields.length > 0) {
      tx.insert(fields).values(newFields).run();
    }

    if (recordsToInsert.length > 0) {
      tx.insert(records).values(recordsToInsert).run();
    }

    if (valuesToInsert.length > 0) {
      tx.insert(recordValues).values(valuesToInsert).run();
    }
  });

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
  revalidatePath(`/collections/${collectionId}/import`);
  redirect(`/collections/${collectionId}`);
}
