"use client";

import type { ActionButtonId } from "@/shared/utils/catalogApi";
import styles from "../styles/EditListingScreen.module.css";

export const ACTION_BUTTONS: Array<{ id: ActionButtonId; label: string; hint: string }> = [
  { id: "call", label: "Call", hint: "Dials the host, else the first number under Phones." },
  { id: "directions", label: "Directions", hint: "Opens the map link." },
  { id: "instagram", label: "Instagram", hint: "The host's Instagram, else the Instagram link." },
  { id: "whatsapp", label: "WhatsApp", hint: "Opens the WhatsApp link under Links." },
  { id: "website", label: "Website", hint: "Opens the Website link under Links." },
  { id: "share", label: "Share", hint: "Shares the page." },
];

/** What the row shows when nothing was chosen. */
export const DEFAULT_ACTION_BUTTONS: ActionButtonId[] = ["call", "directions", "instagram", "share"];

type Props = { value: ActionButtonId[] | undefined; onChange: (next: ActionButtonId[] | undefined) => void; disabled?: boolean };

/** Pick which buttons the Action buttons row shows. A button with nothing to open (no phone, no link) is left out on the page. */
export function ActionButtonsField({ value, onChange, disabled }: Props) {
  const on = value ?? DEFAULT_ACTION_BUTTONS;
  function toggle(id: ActionButtonId) {
    const next = ACTION_BUTTONS.map((b) => b.id).filter((b) => (b === id ? !on.includes(b) : on.includes(b)));
    if (next.length === 0) return; // keep at least one
    onChange(next.join() === DEFAULT_ACTION_BUTTONS.join() ? undefined : next);
  }
  return (
    <fieldset className={styles.choice} disabled={disabled}>
      <legend className={styles.textareaLabel}>Buttons in the row</legend>
      {ACTION_BUTTONS.map((b) => (
        <label key={b.id} className={styles.checkRow}>
          <input type="checkbox" checked={on.includes(b.id)} onChange={() => toggle(b.id)} />
          <span>
            {b.label} <span className={`t-body-sm ${styles.hint}`}>{b.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
