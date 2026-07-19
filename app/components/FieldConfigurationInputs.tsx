"use client";

import { useState } from "react";
import {
  fieldTypes,
  ratingMaximums,
  ratingSteps,
  type FieldType,
  type RatingMaximum,
  type RatingStep,
} from "../../core/field-config";

type FieldConfigurationInputsProps = {
  idPrefix: string;
  initialType: FieldType;
  showType?: boolean;
  defaultValue?: string;
  ratingMaximum?: RatingMaximum;
  ratingStep?: RatingStep;
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
  rating: "Rating",
};

const ratingStepLabels: Record<RatingStep, string> = {
  1: "Whole numbers",
  0.5: "Halves",
  0.1: "Tenths",
  0.01: "Hundredths",
};

export default function FieldConfigurationInputs({
  idPrefix,
  initialType,
  showType = false,
  defaultValue = "",
  ratingMaximum = 5,
  ratingStep = 1,
}: FieldConfigurationInputsProps) {
  const [type, setType] = useState(initialType);
  const [maximum, setMaximum] = useState<RatingMaximum>(ratingMaximum);
  const [step, setStep] = useState<RatingStep>(ratingStep);

  return (
    <>
      {showType ? (
        <div className="field-block">
          <label htmlFor={`${idPrefix}-type`} className="field-label">
            Field Type
          </label>
          <select
            id={`${idPrefix}-type`}
            name="type"
            className="text-input"
            value={type}
            onChange={(event) => setType(event.target.value as FieldType)}
          >
            {fieldTypes.map((fieldType) => (
              <option key={fieldType} value={fieldType}>
                {fieldTypeLabels[fieldType]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {type === "rating" ? (
        <div className="field-settings-grid">
          <div className="field-block">
            <label htmlFor={`${idPrefix}-rating-maximum`} className="field-label">
              Rating Maximum
            </label>
            <select
              id={`${idPrefix}-rating-maximum`}
              name="ratingMaximum"
              className="text-input"
              value={maximum}
              onChange={(event) =>
                setMaximum(Number(event.target.value) as RatingMaximum)
              }
            >
              {ratingMaximums.map((ratingMaximumOption) => (
                <option key={ratingMaximumOption} value={ratingMaximumOption}>
                  Out of {ratingMaximumOption}
                </option>
              ))}
            </select>
          </div>

          <div className="field-block">
            <label htmlFor={`${idPrefix}-rating-step`} className="field-label">
              Rating Precision
            </label>
            <select
              id={`${idPrefix}-rating-step`}
              name="ratingStep"
              className="text-input"
              value={step}
              onChange={(event) =>
                setStep(Number(event.target.value) as RatingStep)
              }
            >
              {ratingSteps.map((ratingStepOption) => (
                <option key={ratingStepOption} value={ratingStepOption}>
                  {ratingStepLabels[ratingStepOption]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="field-block" key={type}>
        <label htmlFor={`${idPrefix}-default`} className="field-label">
          Default Value
        </label>

        {type === "boolean" ? (
          <select
            id={`${idPrefix}-default`}
            name="defaultValue"
            className="text-input"
            defaultValue={defaultValue}
          >
            <option value="">No default</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            id={`${idPrefix}-default`}
            name="defaultValue"
            type={
              type === "number" || type === "rating"
                ? "number"
                : type === "date"
                  ? "date"
                  : "text"
            }
            min={type === "rating" ? 0 : undefined}
            max={type === "rating" ? maximum : undefined}
            step={
              type === "rating" ? step : type === "number" ? "any" : undefined
            }
            className="text-input"
            defaultValue={defaultValue}
            placeholder="No default"
          />
        )}

        <p className="helper-text small-helper-text">
          Used for new records and blank CSV cells.
        </p>
      </div>
    </>
  );
}
