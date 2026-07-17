"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { collections, fields } from "../../db/schema";

function keyify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return base || "field";
}

export async function createField(formData: FormData) {
  const rawCollectionId = formData.get("collectionId");
  const rawName = formData.get("name");
  const rawType = formData.get("type");
  const rawRequired = formData.get("required");

  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const type = typeof rawType === "string" ? rawType : "";
  const required = rawRequired === "on";

  if (!collectionId || !name) {
    return;
  }

  if (!["text", "number", "date", "boolean"].includes(type)) {
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

  db.transaction((tx) => {
    const existingFields = tx
      .select()
      .from(fields)
      .where(eq(fields.collectionId, collectionId))
      .orderBy(asc(fields.position))
      .all();

    const baseKey = keyify(name);
    const keyAlreadyExists = existingFields.some(
      (field) => field.key === baseKey
    );
    const key = keyAlreadyExists
      ? `${baseKey}_${crypto.randomUUID().slice(0, 6)}`
      : baseKey;

    tx.insert(fields)
      .values({
        id: crypto.randomUUID(),
        collectionId,
        name,
        key,
        type: type as "text" | "number" | "date" | "boolean",
        required,
        position: existingFields.length,
      })
      .run();
  });

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
}

export async function deleteField(formData: FormData) {
  const rawFieldId = formData.get("fieldId");
  const rawCollectionId = formData.get("collectionId");

  const fieldId = typeof rawFieldId === "string" ? rawFieldId : "";
  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!fieldId || !collectionId) {
    return;
  }

  db.transaction((tx) => {
    tx.delete(fields)
      .where(
        and(eq(fields.id, fieldId), eq(fields.collectionId, collectionId))
      )
      .run();

    const remainingFields = tx
      .select()
      .from(fields)
      .where(eq(fields.collectionId, collectionId))
      .orderBy(asc(fields.position))
      .all();

    for (let i = 0; i < remainingFields.length; i += 1) {
      tx.update(fields)
        .set({ position: i })
        .where(
          and(
            eq(fields.id, remainingFields[i].id),
            eq(fields.collectionId, collectionId)
          )
        )
        .run();
    }
  });

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
}
