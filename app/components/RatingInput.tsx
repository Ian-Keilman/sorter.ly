"use client";

import { useState } from "react";
import type { RatingMaximum, RatingStep } from "../../core/field-config";

type RatingInputProps = {
  id: string;
  name: string;
  label: string;
  maximum: RatingMaximum;
  step: RatingStep;
  initialValue?: string | number | null;
  required?: boolean;
};

export default function RatingInput({
  id,
  name,
  label,
  maximum,
  step,
  initialValue,
  required = false,
}: RatingInputProps) {
  const [value, setValue] = useState(
    initialValue === undefined || initialValue === null ? "" : String(initialValue)
  );
  const numericValue = Number(value);
  const sliderValue =
    value !== "" && Number.isFinite(numericValue)
      ? Math.min(maximum, Math.max(0, numericValue))
      : 0;

  return (
    <div className="rating-control">
      <input
        type="range"
        min={0}
        max={maximum}
        step={step}
        value={sliderValue}
        onChange={(event) => setValue(event.target.value)}
        className="rating-slider"
        aria-label={`${label} quick rating`}
      />

      <div className="rating-value-row">
        <input
          id={id}
          name={name}
          type="number"
          min={0}
          max={maximum}
          step={step}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="text-input rating-number-input"
          required={required}
        />
        <span className="rating-maximum">/ {maximum}</span>
        {!required ? (
          <button
            type="button"
            className="rating-clear-button"
            onClick={() => setValue("")}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="rating-status" aria-live="polite">
        {value === "" ? "Not rated" : `${value} out of ${maximum}`}
      </div>
    </div>
  );
}
