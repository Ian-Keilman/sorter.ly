import type { NormalizedRecordValue } from "../core/record-values";
import { recordValues } from "./schema";

export function createRecordValueRows(
  collectionId: string,
  recordId: string,
  values: NormalizedRecordValue[]
) {
  return values.map((value): typeof recordValues.$inferInsert => {
    const base = {
      id: crypto.randomUUID(),
      collectionId,
      recordId,
      fieldId: value.fieldId,
    };

    if (value.type === "text") {
      return { ...base, textValue: value.value };
    }

    if (value.type === "number" || value.type === "rating") {
      return { ...base, numberValue: value.value };
    }

    if (value.type === "date") {
      return { ...base, dateValue: value.value };
    }

    return { ...base, booleanValue: value.value };
  });
}
