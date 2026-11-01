"use client";

import { useId, useRef, useState } from "react";
import styles from "./ImageUploadField.module.css";

type Props = {
  label: string;
  hint?: string;
  previewUrl?: string | null;
  previewAlt?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ImageUploadField({
  label,
  hint = "JPG, PNG, WebP, or GIF. Under 10MB.",
  previewUrl,
  previewAlt = "",
  disabled,
  onUpload,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        <div className={styles.preview} aria-hidden={!previewUrl}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={previewAlt || ""} className={styles.img} />
          ) : (
            <span className={styles.placeholder}>No image</span>
          )}
        </div>
        <div className={styles.controls}>
          <label className={styles.pick} htmlFor={inputId}>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              className={styles.input}
              disabled={disabled || busy}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            {busy ? "Uploading…" : previewUrl ? "Replace image" : "Choose image"}
          </label>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
