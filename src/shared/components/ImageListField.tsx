"use client";

import { useId, useRef, useState } from "react";
import styles from "./ImageListField.module.css";

export type ImageListItem = {
  id: string;
  src: string;
  alt: string;
  label?: string;
  isCover?: boolean;
};

type Props = {
  label: string;
  hint?: string;
  items: ImageListItem[];
  /** Show "Cover" badge and "Set as cover". */
  coverable?: boolean;
  /** Show a label input per image (menu pages). */
  labelled?: boolean;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  /** Full list in the new order, plus the cover id when `coverable`. */
  onSave: (items: ImageListItem[], coverId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ImageListField({
  label,
  hint = "JPG, PNG, WebP, or GIF. Under 10MB each.",
  items,
  coverable,
  labelled,
  disabled,
  onUpload,
  onSave,
  onDelete,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(items);
  const [syncedItems, setSyncedItems] = useState(items);
  const [progress, setProgress] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items !== syncedItems) {
    setSyncedItems(items);
    setDraft(items);
  }

  const coverId = draft.find((i) => i.isCover)?.id ?? null;
  const locked = disabled || progress !== null || busyId !== null;

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "That didn't work.");
      setDraft(items);
    } finally {
      setBusyId(null);
    }
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError(null);
    try {
      for (const [index, file] of files.entries()) {
        setProgress(
          files.length > 1 ? `Uploading ${index + 1} of ${files.length}…` : "Uploading…",
        );
        await onUpload(file);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, by: -1 | 1) {
    const next = draft.slice();
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    setDraft(next);
    void run(item.id, () => onSave(next, coverId));
  }

  function setCover(id: string) {
    const next = draft.map((i) => ({ ...i, isCover: i.id === id }));
    setDraft(next);
    void run(id, () => onSave(next, id));
  }

  function edit(id: string, key: "alt" | "label", value: string) {
    setDraft((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)));
  }

  function commit(id: string) {
    const before = items.find((i) => i.id === id);
    const after = draft.find((i) => i.id === id);
    if (!before || !after) return;
    if (before.alt === after.alt && before.label === after.label) return;
    void run(id, () => onSave(draft, coverId));
  }

  function remove(item: ImageListItem) {
    if (!window.confirm("Remove this image?")) return;
    void run(item.id, () => onDelete(item.id));
  }

  return (
    <div className={styles.field}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <label className={styles.pick} htmlFor={inputId}>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            className={styles.input}
            disabled={locked}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {progress ?? "Add images"}
        </label>
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {draft.length === 0 ? (
        <p className={styles.empty}>No images yet.</p>
      ) : (
        <ol className={styles.list}>
          {draft.map((item, index) => (
            <li
              key={item.id}
              className={styles.item}
              aria-busy={busyId === item.id}
            >
              <div className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  width={96}
                  height={96}
                  className={styles.img}
                />
                {coverable && item.isCover ? (
                  <span className={styles.badge}>Cover</span>
                ) : null}
              </div>
              <div className={styles.fields}>
                {labelled ? (
                  <input
                    className={styles.text}
                    value={item.label ?? ""}
                    placeholder="Label, e.g. Food"
                    aria-label={`Label for image ${index + 1}`}
                    disabled={locked}
                    onChange={(e) => edit(item.id, "label", e.target.value)}
                    onBlur={() => commit(item.id)}
                  />
                ) : null}
                <input
                  className={styles.text}
                  value={item.alt}
                  placeholder="Describe the image"
                  aria-label={`Alt text for image ${index + 1}`}
                  disabled={locked}
                  onChange={(e) => edit(item.id, "alt", e.target.value)}
                  onBlur={() => commit(item.id)}
                />
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.action}
                    aria-label={`Move image ${index + 1} up`}
                    disabled={locked || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.action}
                    aria-label={`Move image ${index + 1} down`}
                    disabled={locked || index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  {coverable && !item.isCover ? (
                    <button
                      type="button"
                      className={styles.action}
                      disabled={locked}
                      onClick={() => setCover(item.id)}
                    >
                      Set as cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.action} ${styles.danger}`}
                    disabled={locked}
                    onClick={() => remove(item)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
