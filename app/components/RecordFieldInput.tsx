import {
  parseFieldConfiguration,
  type FieldType,
} from "../../core/field-config";
import RatingInput from "./RatingInput";

type RecordFieldInputProps = {
  field: {
    id: string;
    name: string;
    type: FieldType;
    required: boolean;
    configuration: string;
  };
  initialValue?: string | number | boolean | null;
};

export default function RecordFieldInput({
  field,
  initialValue,
}: RecordFieldInputProps) {
  const inputName = `field_${field.id}`;

  if (field.type === "boolean") {
    const checked = initialValue === true || initialValue === "true";

    return (
      <div className="field-block">
        <input type="hidden" name={inputName} value="false" />
        <label className="checkbox-row">
          <input
            type="checkbox"
            name={inputName}
            value="true"
            defaultChecked={checked}
          />
          <span>{field.name}</span>
        </label>
      </div>
    );
  }

  const configuration = parseFieldConfiguration(
    field.type,
    field.configuration
  );

  return (
    <div className="field-block">
      <label htmlFor={field.id} className="field-label">
        {field.name}
      </label>

      {field.type === "text" ? (
        <input
          id={field.id}
          name={inputName}
          type="text"
          className="text-input"
          defaultValue={typeof initialValue === "string" ? initialValue : ""}
          required={field.required}
        />
      ) : null}

      {field.type === "number" ? (
        <input
          id={field.id}
          name={inputName}
          type="number"
          step="any"
          className="text-input"
          defaultValue={
            typeof initialValue === "number" || typeof initialValue === "string"
              ? initialValue
              : ""
          }
          required={field.required}
        />
      ) : null}

      {field.type === "date" ? (
        <input
          id={field.id}
          name={inputName}
          type="date"
          className="text-input"
          defaultValue={typeof initialValue === "string" ? initialValue : ""}
          required={field.required}
        />
      ) : null}

      {field.type === "rating" && configuration.rating ? (
        <RatingInput
          id={field.id}
          name={inputName}
          label={field.name}
          maximum={configuration.rating.maximum}
          step={configuration.rating.step}
          initialValue={
            typeof initialValue === "number" || typeof initialValue === "string"
              ? initialValue
              : null
          }
          required={field.required}
        />
      ) : null}
    </div>
  );
}
