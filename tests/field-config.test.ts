import assert from "node:assert/strict";
import test from "node:test";
import {
  createFieldConfiguration,
  getFieldStorageType,
  parseFieldConfiguration,
} from "../core/field-config";

test("builds versioned field configuration with canonical string defaults", () => {
  const result = createFieldConfiguration("boolean", {
    defaultValue: "false",
  });

  assert.deepEqual(result, {
    configuration: '{"version":1,"defaultValue":"false"}',
    issues: [],
  });
  assert.deepEqual(parseFieldConfiguration("boolean", result.configuration), {
    version: 1,
    defaultValue: "false",
  });
});

test("ratings are field kinds backed by numeric storage", () => {
  const result = createFieldConfiguration("rating", {
    defaultValue: "3.5",
    ratingMaximum: "5",
    ratingStep: "0.5",
  });

  assert.equal(getFieldStorageType("rating"), "number");
  assert.deepEqual(parseFieldConfiguration("rating", result.configuration), {
    version: 1,
    defaultValue: "3.5",
    rating: {
      maximum: 5,
      step: 0.5,
    },
  });
});

test("rejects unsupported rating settings and malformed configuration", () => {
  assert.deepEqual(
    createFieldConfiguration("rating", {
      ratingMaximum: "7",
      ratingStep: "0.25",
    }).issues,
    ["invalid_rating_maximum", "invalid_rating_step"]
  );

  assert.throws(
    () => parseFieldConfiguration("text", "not json"),
    /not valid JSON/
  );
  assert.throws(
    () =>
      parseFieldConfiguration(
        "number",
        '{"version":1,"rating":{"maximum":5,"step":1}}'
      ),
    /Only rating fields/
  );
  assert.throws(
    () => parseFieldConfiguration("rating", '{"version":1}'),
    /require rating settings/
  );
});
