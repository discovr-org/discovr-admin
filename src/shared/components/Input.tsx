"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertIcon } from "./icons";
import styles from "./Input.module.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  /** Hide the label visually; keep it for assistive tech. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
};

/**
 * 48px sunken text field. Value is always 16px so iOS does not zoom on focus.
 * Errors: what happened → whether money moved → what to do next.
 */
export function Input({
  label,
  hideLabel,
  hint,
  error,
  leadingIcon,
  id,
  className,
  disabled,
  ...rest
}: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={fieldId} className={hideLabel ? "vh" : styles.label}>
        {label}
      </label>
      <div
        className={[
          styles.box,
          error ? styles.errorBox : "",
          disabled ? styles.disabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {leadingIcon && <span className={styles.icon}>{leadingIcon}</span>}
        <input
          id={fieldId}
          className={styles.input}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          <AlertIcon />
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
