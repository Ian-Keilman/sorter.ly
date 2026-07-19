import assert from "node:assert/strict";
import test from "node:test";
import {
  type FieldDefinition,
  normalizeRecordValues,
  validateFieldDefault,
} from "../core/record-values";

const fields: FieldDefinition[] = [
  { id: "title", name: "Title", type: "text", required: true },
  { id: "price", name: "Price", type: "number", required: false },
  { id: "date", name: "Date", type: "date", required: false },
  { id: "tried", name: "Tried", type: "boolean", required: true },
];

test("normalizes all supported record value types", () => {
  const rawValues = new Map<string, string | undefined>([
    ["title", "  Gumdrops  "],
    ["price", "2.50"],
    ["date", "2026-03-22"],
    ["tried", "yes"],
  ]);

  const result = normalizeRecordValues(fields, (field) =>
    rawValues.get(field.id)
  );

  assert.deepEqual(result, {
    values: [
      { fieldId: "title", type: "text", value: "Gumdrops" },
      { fieldId: "price", type: "number", value: 2.5 },
      { fieldId: "date", type: "date", value: "2026-03-22" },
      { fieldId: "tried", type: "boolean", value: true },
    ],
    issues: [],
  });
});
test("reports required and invalid values instead of silently dropping them", () => {
  const rawValues = new Map<string, string>([
    ["title", " "],
    ["price", "not a number"],
    ["date", "2026-02-31"],
    ["tried", "perhaps"],
  ]);

  const result = normalizeRecordValues(fields, (field) =>
    rawValues.get(field.id)
  );

  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["required", "invalid_number", "invalid_date", "invalid_boolean"]
  );
  assert.deepEqual(result.values, []);
});

test("omits blank optional values", () => {
  const optionalFields = fields.map((field) => ({ ...field, required: false }));
  const result = normalizeRecordValues(optionalFields, () => "");

  assert.deepEqual(result, { values: [], issues: [] });
});

test("can preserve checkbox behavior by treating a missing boolean as false", () => {
  const result = normalizeRecordValues(
    [fields[3]],
    () => undefined,
    { emptyBooleanValue: false }
  );

  assert.deepEqual(result, {
    values: [{ fieldId: "tried", type: "boolean", value: false }],
    issues: [],
  });
});

test("applies typed defaults to new and imported records", () => {
  const defaultFields: FieldDefinition[] = [
    {
      id: "title",
      name: "Title",
      type: "text",
      required: false,
      configuration: '{"version":1,"defaultValue":"Untitled"}',
    },
    {
      id: "tried",
      name: "Tried",
      type: "boolean",
      required: false,
      configuration: '{"version":1,"defaultValue":"false"}',
    },
    {
      id: "rating",
      name: "Rating",
      type: "rating",
      required: false,
      configuration:
        '{"version":1,"defaultValue":"3.5","rating":{"maximum":5,"step":0.5}}',
    },
  ];

  const result = normalizeRecordValues(defaultFields, () => "", {
    applyDefaults: true,
  });

  assert.deepEqual(result, {
    values: [
      { fieldId: "title", type: "text", value: "Untitled" },
      { fieldId: "tried", type: "boolean", value: false },
      { fieldId: "rating", type: "rating", value: 3.5 },
    ],
    issues: [],
  });

  assert.deepEqual(
    normalizeRecordValues(defaultFields, () => "", {
      applyDefaults: false,
    }),
    { values: [], issues: [] }
  );
});

test("validates rating ranges and decimal precision", () => {
  const ratingField: FieldDefinition = {
    id: "rating",
    name: "Rating",
    type: "rating",
    required: false,
    configuration:
      '{"version":1,"rating":{"maximum":10,"step":0.1}}',
  };

  assert.deepEqual(normalizeRecordValues([ratingField], () => "8.7"), {
    values: [{ fieldId: "rating", type: "rating", value: 8.7 }],
    issues: [],
  });
  assert.deepEqual(
    normalizeRecordValues([ratingField], () => "10.1").issues.map(
      (issue) => issue.code
    ),
    ["rating_out_of_range"]
  );
  assert.deepEqual(
    normalizeRecordValues([ratingField], () => "8.75").issues.map(
      (issue) => issue.code
    ),
    ["invalid_rating_step"]
  );
});

test("rejects a default that does not fit its field settings", () => {
  const issues = validateFieldDefault({
    id: "rating",
    name: "Rating",
    type: "rating",
    required: false,
    configuration:
      '{"version":1,"defaultValue":"5.5","rating":{"maximum":5,"step":0.5}}',
  });

  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["rating_out_of_range"]
  );
});
