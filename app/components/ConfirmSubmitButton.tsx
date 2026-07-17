"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  confirmMessage: string;
  className: string;
  ariaLabel?: string;
  title?: string;
};

export default function ConfirmSubmitButton({
  label,
  confirmMessage,
  className,
  ariaLabel,
  title,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      title={title}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
