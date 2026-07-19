export const fieldTypes = [
  "text",
  "number",
  "date",
  "boolean",
  "rating",
] as const;

export type FieldType = (typeof fieldTypes)[number];

export const ratingMaximums = [5, 10, 100] as const;
export const ratingSteps = [1, 0.5, 0.1, 0.01] as const;

export type RatingMaximum = (typeof ratingMaximums)[number];
export type RatingStep = (typeof ratingSteps)[number];

export type FieldConfiguration = {
  version: 1;
  defaultValue?: string;
  rating?: {
    maximum: RatingMaximum;
    step: RatingStep;
  };
};

export type FieldConfigurationIssue =
  | "invalid_rating_maximum"
  | "invalid_rating_step";

export type FieldConfigurationInput = {
  defaultValue?: string | null;
  ratingMaximum?: string | number | null;
  ratingStep?: string | number | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRatingMaximum(value: unknown): value is RatingMaximum {
  return (
    typeof value === "number" &&
    ratingMaximums.some((maximum) => maximum === value)
  );
}

function isRatingStep(value: unknown): value is RatingStep {
  return typeof value === "number" && ratingSteps.some((step) => step === value);
}

function emptyConfiguration(type: FieldType): FieldConfiguration {
  if (type === "rating") {
    return {
      version: 1,
      rating: {
        maximum: 5,
        step: 1,
      },
    };
  }

  return { version: 1 };
}

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && fieldTypes.some((type) => type === value);
}

export function getFieldStorageType(type: FieldType) {
  return type === "rating" ? "number" : type;
}

export function parseFieldConfiguration(
  type: FieldType,
  source?: string | null
): FieldConfiguration {
  if (source === undefined || source === null || source.trim() === "") {
    if (type === "rating") {
      throw new Error("Rating fields require rating settings.");
    }

    return emptyConfiguration(type);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Field configuration is not valid JSON.");
  }

  if (!isObject(parsed) || parsed.version !== 1) {
    throw new Error("Field configuration has an unsupported shape or version.");
  }

  const allowedKeys = new Set(["version", "defaultValue", "rating"]);

  if (Object.keys(parsed).some((key) => !allowedKeys.has(key))) {
    throw new Error("Field configuration contains an unsupported setting.");
  }

  const configuration: FieldConfiguration = { version: 1 };

  if ("defaultValue" in parsed) {
    if (
      typeof parsed.defaultValue !== "string" ||
      parsed.defaultValue.trim() === ""
    ) {
      throw new Error("Field default values must be non-empty strings.");
    }

    configuration.defaultValue = parsed.defaultValue;
  }

  if (type === "rating") {
    if (!isObject(parsed.rating)) {
      throw new Error("Rating fields require rating settings.");
    }

    const ratingKeys = new Set(["maximum", "step"]);

    if (Object.keys(parsed.rating).some((key) => !ratingKeys.has(key))) {
      throw new Error("Rating configuration contains an unsupported setting.");
    }

    if (!isRatingMaximum(parsed.rating.maximum)) {
      throw new Error("Rating maximum must be 5, 10, or 100.");
    }

    if (!isRatingStep(parsed.rating.step)) {
      throw new Error("Rating step is not supported.");
    }

    configuration.rating = {
      maximum: parsed.rating.maximum,
      step: parsed.rating.step,
    };
  } else if (parsed.rating !== undefined) {
    throw new Error("Only rating fields can have rating settings.");
  }

  return configuration;
}

export function serializeFieldConfiguration(
  configuration: FieldConfiguration
) {
  const serialized: FieldConfiguration = { version: 1 };

  if (configuration.defaultValue !== undefined) {
    serialized.defaultValue = configuration.defaultValue;
  }

  if (configuration.rating !== undefined) {
    serialized.rating = configuration.rating;
  }

  return JSON.stringify(serialized);
}

export function createFieldConfiguration(
  type: FieldType,
  input: FieldConfigurationInput
) {
  const issues: FieldConfigurationIssue[] = [];
  const configuration = emptyConfiguration(type);
  const defaultValue = input.defaultValue?.trim() ?? "";

  if (defaultValue !== "") {
    configuration.defaultValue = defaultValue;
  }

  if (type === "rating") {
    const maximum = Number(input.ratingMaximum);
    const step = Number(input.ratingStep);
    const validMaximum = isRatingMaximum(maximum) ? maximum : null;
    const validStep = isRatingStep(step) ? step : null;

    if (validMaximum === null) {
      issues.push("invalid_rating_maximum");
    }

    if (validStep === null) {
      issues.push("invalid_rating_step");
    }

    if (validMaximum !== null && validStep !== null) {
      configuration.rating = { maximum: validMaximum, step: validStep };
    }
  }

  return {
    configuration:
      issues.length === 0 ? serializeFieldConfiguration(configuration) : null,
    issues,
  };
}
