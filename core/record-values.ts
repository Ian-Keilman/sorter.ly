export const fieldTypes = ["text", "number", "date", "boolean"] as const;

export type FieldType = (typeof fieldTypes)[number];

export type FieldDefinition = {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
};

export type RawFieldValue = string | boolean | null | undefined;

export type NormalizedRecordValue =
  | { fieldId: string; type: "text"; value: string }
  | { fieldId: string; type: "number"; value: number }
  | { fieldId: string; type: "date"; value: string }
  | { fieldId: string; type: "boolean"; value: boolean };

export type RecordValueIssue = {
  fieldId: string;
  fieldName: string;
  code: "required" | "invalid_number" | "invalid_date" | "invalid_boolean";
};

type NormalizeRecordValuesOptions = {
  emptyBooleanValue?: boolean;
};

function isBlank(value: RawFieldValue) {
  return value === null || value === undefined || value === "";
}
function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function parseBoolean(value: RawFieldValue) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "y", "1", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function normalizeRecordValues(
  fields: FieldDefinition[],
  getRawValue: (field: FieldDefinition) => RawFieldValue,
  options: NormalizeRecordValuesOptions = {}
) {
  const values: NormalizedRecordValue[] = [];
  const issues: RecordValueIssue[] = [];

  for (const field of fields) {
    const rawValue = getRawValue(field);

    if (field.type === "text") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value !== "") {
        values.push({ fieldId: field.id, type: "text", value });
      } else if (field.required) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "required",
        });
      }

      continue;
    }

    if (field.type === "number") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value === "") {
        if (field.required) {
          issues.push({
            fieldId: field.id,
            fieldName: field.name,
            code: "required",
          });
        }

        continue;
      }

      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "invalid_number",
        });
        continue;
      }

      values.push({ fieldId: field.id, type: "number", value: parsed });
      continue;
    }

    if (field.type === "date") {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (value === "") {
        if (field.required) {
          issues.push({
            fieldId: field.id,
            fieldName: field.name,
            code: "required",
          });
        }

        continue;
      }

      if (!isIsoDate(value)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "invalid_date",
        });
        continue;
      }

      values.push({ fieldId: field.id, type: "date", value });
      continue;
    }

    const value = isBlank(rawValue)
      ? options.emptyBooleanValue ?? null
      : parseBoolean(rawValue);

    if (value === null) {
      if (field.required && isBlank(rawValue)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "required",
        });
      } else if (!isBlank(rawValue)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "invalid_boolean",
        });
      }

      continue;
    }

    values.push({ fieldId: field.id, type: "boolean", value });
  }

  return { values, issues };
}
