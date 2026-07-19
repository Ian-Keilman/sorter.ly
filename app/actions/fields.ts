"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createFieldConfiguration,
  isFieldType,
  type FieldType,
} from "../../core/field-config";
import {
  normalizeRecordValues,
  prepareFieldDefinitions,
  validateFieldDefault,
} from "../../core/record-values";
import { db } from "../../db";
import { collections, fields, recordValues } from "../../db/schema";

function keyify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return base || "field";
}

function settingsPath(collectionId: string, error?: string) {
  const base = `/collections/${collectionId}/settings`;
  return error ? `${base}?error=${error}` : base;
}

function getConfiguration(
  formData: FormData,
  field: {
    id: string;
    name: string;
    type: FieldType;
    required: boolean;
  }
) {
  const rawDefaultValue = formData.get("defaultValue");
  const rawRatingMaximum = formData.get("ratingMaximum");
  const rawRatingStep = formData.get("ratingStep");
  const result = createFieldConfiguration(field.type, {
    defaultValue:
      typeof rawDefaultValue === "string" ? rawDefaultValue : null,
    ratingMaximum:
      typeof rawRatingMaximum === "string" ? rawRatingMaximum : null,
    ratingStep: typeof rawRatingStep === "string" ? rawRatingStep : null,
  });

  if (!result.configuration) {
    return null;
  }

  const defaultIssues = validateFieldDefault({
    ...field,
    configuration: result.configuration,
  });

  return defaultIssues.length === 0 ? result.configuration : null;
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

  if (!isFieldType(type)) {
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

  const configuration = getConfiguration(formData, {
    id: "new-field",
    name,
    type,
    required,
  });

  if (!configuration) {
    redirect(settingsPath(collectionId, "invalid-field-settings"));
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
        type,
        configuration,
        required,
        position: existingFields.length,
      })
      .run();
  });

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
  redirect(settingsPath(collectionId));
}

export async function updateFieldSettings(formData: FormData) {
  const rawFieldId = formData.get("fieldId");
  const rawCollectionId = formData.get("collectionId");
  const fieldId = typeof rawFieldId === "string" ? rawFieldId : "";
  const collectionId =
    typeof rawCollectionId === "string" ? rawCollectionId : "";

  if (!fieldId || !collectionId) {
    return;
  }

  const field = db
    .select()
    .from(fields)
    .where(
      and(eq(fields.id, fieldId), eq(fields.collectionId, collectionId))
    )
    .all()[0];

  if (!field) {
    return;
  }

  const configuration = getConfiguration(formData, field);

  if (!configuration) {
    redirect(settingsPath(collectionId, "invalid-field-settings"));
  }

  if (field.type === "rating") {
    const candidateField = { ...field, configuration };
    const preparedCandidateField = prepareFieldDefinitions([candidateField])[0];
    const existingValues = db
      .select({ numberValue: recordValues.numberValue })
      .from(recordValues)
      .where(
        and(
          eq(recordValues.fieldId, field.id),
          eq(recordValues.collectionId, collectionId)
        )
      )
      .all();

    const hasIncompatibleValue = existingValues.some((value) => {
      const normalized = normalizeRecordValues(
        [preparedCandidateField],
        () =>
          value.numberValue === null ? null : String(value.numberValue),
        { applyDefaults: false }
      );

      return normalized.issues.length > 0;
    });

    if (hasIncompatibleValue) {
      redirect(settingsPath(collectionId, "incompatible-rating-settings"));
    }
  }

  db.update(fields)
    .set({ configuration })
    .where(
      and(eq(fields.id, fieldId), eq(fields.collectionId, collectionId))
    )
    .run();

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/settings`);
  redirect(settingsPath(collectionId));
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
