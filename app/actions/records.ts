"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeRecordValues } from "../../core/record-values";
import { db } from "../../db";
import { createRecordValueRows } from "../../db/record-values";
import { collections, fields, records, recordValues } from "../../db/schema";

function inputName(fieldId: string) {
  return `field_${fieldId}`;
}

function recordErrorPath(collectionId: string, path: string) {
  return `/collections/${collectionId}/${path}?error=invalid-values`;
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

  const normalized = normalizeRecordValues(
    fieldRows,
    (field) => {
      const rawValue = formData.get(inputName(field.id));
      return typeof rawValue === "string" ? rawValue : null;
    },
    { emptyBooleanValue: false }
  );

  if (normalized.issues.length > 0) {
    redirect(recordErrorPath(collectionId, "records/new"));
  }

  const recordId = crypto.randomUUID();
  const valuesToInsert = createRecordValueRows(
    collectionId,
    recordId,
    normalized.values
  );

  db.transaction((tx) => {
    tx.insert(records)
      .values({
        id: recordId,
        collectionId,
      })
      .run();

    if (valuesToInsert.length > 0) {
      tx.insert(recordValues).values(valuesToInsert).run();
    }
  });

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

  const normalized = normalizeRecordValues(
    fieldRows,
    (field) => {
      const rawValue = formData.get(inputName(field.id));
      return typeof rawValue === "string" ? rawValue : null;
    },
    { emptyBooleanValue: false }
  );

  if (normalized.issues.length > 0) {
    redirect(
      recordErrorPath(collectionId, `records/${recordId}/edit`)
    );
  }

  const valuesToInsert = createRecordValueRows(
    collectionId,
    recordId,
    normalized.values
  );

  db.transaction((tx) => {
    tx.delete(recordValues)
      .where(
        and(
          eq(recordValues.recordId, recordId),
          eq(recordValues.collectionId, collectionId)
        )
      )
      .run();

    if (valuesToInsert.length > 0) {
      tx.insert(recordValues).values(valuesToInsert).run();
    }

    tx.update(records)
      .set({
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(eq(records.id, recordId), eq(records.collectionId, collectionId))
      )
      .run();
  });

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

  db.delete(records)
    .where(
      and(eq(records.id, recordId), eq(records.collectionId, collectionId))
    )
    .run();

  revalidatePath(`/collections/${collectionId}`);
  redirect(`/collections/${collectionId}`);
}
