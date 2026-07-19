import {
  type FieldConfiguration,
  type FieldType,
  parseFieldConfiguration,
} from "./field-config";

export { fieldTypes, type FieldType } from "./field-config";

export type FieldDefinition = {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  configuration?: string | null;
  parsedConfiguration?: FieldConfiguration;
};

export type RawFieldValue = string | boolean | null | undefined;

export type NormalizedRecordValue =
  | { fieldId: string; type: "text"; value: string }
  | { fieldId: string; type: "number"; value: number }
  | { fieldId: string; type: "date"; value: string }
  | { fieldId: string; type: "boolean"; value: boolean }
  | { fieldId: string; type: "rating"; value: number };

export type RecordValueIssue = {
  fieldId: string;
  fieldName: string;
  code:
    | "required"
    | "invalid_number"
    | "invalid_date"
    | "invalid_boolean"
    | "rating_out_of_range"
    | "invalid_rating_step"
    | "invalid_configuration";
};

type NormalizeRecordValuesOptions = {
  applyDefaults?: boolean;
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

function isRatingStepAligned(value: number, step: number) {
  const steps = value / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function prepareFieldDefinitions(fields: FieldDefinition[]) {
  return fields.map((field) => ({
    ...field,
    parsedConfiguration:
      field.parsedConfiguration ??
      parseFieldConfiguration(field.type, field.configuration),
  }));
}

export function normalizeRecordValues(
  fields: FieldDefinition[],
  getRawValue: (field: FieldDefinition) => RawFieldValue,
  options: NormalizeRecordValuesOptions = {}
) {
  const values: NormalizedRecordValue[] = [];
  const issues: RecordValueIssue[] = [];

  for (const field of fields) {
    let configuration;

    try {
      configuration =
        field.parsedConfiguration ??
        parseFieldConfiguration(field.type, field.configuration);
    } catch {
      issues.push({
        fieldId: field.id,
        fieldName: field.name,
        code: "invalid_configuration",
      });
      continue;
    }

    let rawValue = getRawValue(field);

    if (
      options.applyDefaults !== false &&
      isBlank(rawValue) &&
      configuration.defaultValue !== undefined
    ) {
      rawValue = configuration.defaultValue;
    }

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

    if (field.type === "rating") {
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

      const rating = configuration.rating;

      if (!rating) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "invalid_configuration",
        });
        continue;
      }

      if (parsed < 0 || parsed > rating.maximum) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "rating_out_of_range",
        });
        continue;
      }

      if (!isRatingStepAligned(parsed, rating.step)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.name,
          code: "invalid_rating_step",
        });
        continue;
      }

      values.push({ fieldId: field.id, type: "rating", value: parsed });
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

export function validateFieldDefault(field: FieldDefinition) {
  let configuration;

  try {
    configuration = parseFieldConfiguration(field.type, field.configuration);
  } catch {
    return [
      {
        fieldId: field.id,
        fieldName: field.name,
        code: "invalid_configuration" as const,
      },
    ];
  }

  if (configuration.defaultValue === undefined) {
    return [];
  }

  return normalizeRecordValues(
    [{ ...field, required: false, parsedConfiguration: configuration }],
    () => configuration.defaultValue,
    { applyDefaults: false }
  ).issues;
}
