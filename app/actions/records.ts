"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { collections, fields, records, recordValues } from "../../db/schema";

function inputName(fieldId: string) {
  return `field_${fieldId}`;
}

export async function createRecord(formData: FormData) {
  const rawCollectionId = formData.get("collectionId");
  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!collectionId) {
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

  const fieldRows = db
    .select()
    .from(fields)
    .where(eq(fields.collectionId, collectionId))
    .orderBy(asc(fields.position))
    .all();

  const recordId = crypto.randomUUID();

  db.insert(records)
    .values({
      id: recordId,
      collectionId,
    })
    .run();

  const valuesToInsert: typeof recordValues.$inferInsert[] = [];

  for (const field of fieldRows) {
    const rawValue = formData.get(inputName(field.id));

    if (field.type === "text") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          textValue: value,
        });
      }
    }

    if (field.type === "number") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          valuesToInsert.push({
            id: crypto.randomUUID(),
            recordId,
            fieldId: field.id,
            numberValue: parsed,
          });
        }
      }
    }

    if (field.type === "date") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          dateValue: value,
        });
      }
    }

    if (field.type === "boolean") {
      const checked = rawValue === "on";

      valuesToInsert.push({
        id: crypto.randomUUID(),
        recordId,
        fieldId: field.id,
        booleanValue: checked,
      });
    }
  }

  if (valuesToInsert.length > 0) {
    db.insert(recordValues).values(valuesToInsert).run();
  }

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/records/new`);
  redirect(`/collections/${collectionId}`);
}

export async function updateRecord(formData: FormData) {
  const rawCollectionId = formData.get("collectionId");
  const rawRecordId = formData.get("recordId");

  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";
  const recordId = typeof rawRecordId === "string" ? rawRecordId : "";

  if (!collectionId || !recordId) {
    return;
  }

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  const record = db
    .select()
    .from(records)
    .where(
      and(eq(records.id, recordId), eq(records.collectionId, collectionId))
    )
    .all()[0];

  if (!collection || !record) {
    return;
  }

  const fieldRows = db
    .select()
    .from(fields)
    .where(eq(fields.collectionId, collectionId))
    .orderBy(asc(fields.position))
    .all();

  db.delete(recordValues).where(eq(recordValues.recordId, recordId)).run();

  const valuesToInsert: typeof recordValues.$inferInsert[] = [];

  for (const field of fieldRows) {
    const rawValue = formData.get(inputName(field.id));

    if (field.type === "text") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          textValue: value,
        });
      }
    }

    if (field.type === "number") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          valuesToInsert.push({
            id: crypto.randomUUID(),
            recordId,
            fieldId: field.id,
            numberValue: parsed,
          });
        }
      }
    }

    if (field.type === "date") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        valuesToInsert.push({
          id: crypto.randomUUID(),
          recordId,
          fieldId: field.id,
          dateValue: value,
        });
      }
    }

    if (field.type === "boolean") {
      const checked = rawValue === "on";

      valuesToInsert.push({
        id: crypto.randomUUID(),
        recordId,
        fieldId: field.id,
        booleanValue: checked,
      });
    }
  }

  if (valuesToInsert.length > 0) {
    db.insert(recordValues).values(valuesToInsert).run();
  }

  db.update(records)
    .set({
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(records.id, recordId))
    .run();

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/records/${recordId}/edit`);
  redirect(`/collections/${collectionId}`);
}

export async function deleteRecord(formData: FormData) {
  const rawRecordId = formData.get("recordId");
  const rawCollectionId = formData.get("collectionId");

  const recordId = typeof rawRecordId === "string" ? rawRecordId : "";
  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!recordId || !collectionId) {
    return;
  }

  db.delete(records).where(eq(records.id, recordId)).run();

  revalidatePath(`/collections/${collectionId}`);
  redirect(`/collections/${collectionId}`);
}