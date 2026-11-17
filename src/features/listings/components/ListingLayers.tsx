"use client";

import { useState } from "react";
import { BLOCK_LABEL, blockLabel, type StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";

export type SectionKey = "photos" | "basics" | "place" | "price" | "when" | "links" | "faqs" | "policy" | "tags" | "booking";
export type Sel = { kind: "section"; key: SectionKey } | { kind: "block"; index: number } | null;

const GROUPS: Array<{ title: string; items: Array<[SectionKey, string, string, string]> }> = [
  {
    title: "Page",
    items: [
      ["photos", "Photos", "Carousel and menu pages", "▣"],
      ["basics", "Title & verdict", "Name, status, about", "T"],
      ["place", "Place", "Address and map", "⌖"],
      ["price", "Price", "From price and note", "₹"],
      ["when", "Hours & group", "When, duration, who", "◷"],
      ["links", "Links", "Maps, Instagram, menu", "↗"],
    ],
  },
];
const MORE: Array<[SectionKey, string, string, string]> = [
  ["faqs", "FAQs", "Questions and answers", "?"],
  ["policy", "Booking & cancellation", "Policy and notes", "≡"],
  ["tags", "Tags", "Search and card tags", "#"],
];
const PINNED: [SectionKey, string, string, string] = ["booking", "Booking bar", "Call or link button", "▭"];

type Props = {
  sel: Sel;
  onSel: (s: Sel) => void;
  blocks: StoryBlock[];
  venue: boolean;
  onMove: (from: number, to: number) => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onAdd: () => void;
  onStart: () => void;
};

/** Left column. Page sections are fixed; story blocks can be dragged, copied, deleted. */
export function ListingLayers({ sel, onSel, blocks, venue, onMove, onDuplicate, onDelete, onAdd, onStart }: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const isSec = (k: SectionKey) => sel?.kind === "section" && sel.key === k;

  const section = ([key, name, hint, glyph]: [SectionKey, string, string, string]) => (
    <li key={key} className={`${styles.layer} ${isSec(key) ? styles.layerOn : ""}`}>
      <button type="button" className={styles.layerMain} aria-pressed={isSec(key)} onClick={() => onSel({ kind: "section", key })}>
        <span className={styles.layerIc} aria-hidden="true">
          {glyph}
        </span>
        <span className={styles.layerText}>
          <span className={styles.layerName}>{name}</span>
          <span className={styles.layerType}>{hint}</span>
        </span>
      </button>
    </li>
  );

  return (
    <aside className={styles.colWrap} aria-label="Layers">
      <div className={styles.colHead}>
        <h2>Layers</h2>
        <p>{blocks.length} story {blocks.length === 1 ? "block" : "blocks"}</p>
      </div>
      <div className={styles.scroll}>
        {GROUPS.map((g) => (
          <ul key={g.title} className={styles.layers}>
            {g.items.map(section)}
          </ul>
        ))}

        <div className={styles.sub}>Story</div>
        {blocks.length === 0 ? (
          <div className={styles.paneInner}>
            <p className={styles.note}>
              {venue
                ? "Places build the story from the fields, so a custom story isn't used."
                : "The story is built from the fields. Start a custom story to reorder and edit it."}
            </p>
            {venue ? null : (
              <button type="button" className={styles.addBtn} onClick={onStart}>
                Start a custom story
              </button>
            )}
          </div>
        ) : (
          <ul className={styles.layers} onDragLeave={() => setOver(null)}>
            {blocks.map((b, i) => {
              const on = sel?.kind === "block" && sel.index === i;
              return (
                <li
                  key={i}
                  className={`${styles.layer} ${on ? styles.layerOn : ""} ${over === i && dragFrom !== i ? styles.layerOver : ""}`}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(i);
                  }}
                  onDrop={() => {
                    if (dragFrom !== null) onMove(dragFrom, i);
                    setDragFrom(null);
                    setOver(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setOver(null);
                  }}
                >
                  <button type="button" className={`${styles.layerMain} ${styles.layerDrag}`} aria-pressed={on} onClick={() => onSel({ kind: "block", index: i })}>
                    <span className={styles.layerIc} aria-hidden="true">
                      ⋮⋮
                    </span>
                    <span className={styles.layerText}>
                      <span className={styles.layerName}>{blockLabel(b)}</span>
                      <span className={styles.layerType}>{BLOCK_LABEL[b.type] ?? b.type}</span>
                    </span>
                  </button>
                  <span className={styles.layerActs}>
                    <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, i - 1)}>
                      ↑
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => onMove(i, i + 1)}>
                      ↓
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Duplicate" onClick={() => onDuplicate(i)}>
                      ⧉
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Delete" onClick={() => onDelete(i)}>
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {blocks.length > 0 ? (
          <button type="button" className={styles.addBtn} onClick={onAdd} style={{ marginTop: "var(--space-2)" }}>
            + Add a block
          </button>
        ) : null}

        <div className={styles.sub}>More</div>
        <ul className={styles.layers}>{MORE.map(section)}</ul>
        <div className={styles.sub}>Pinned</div>
        <ul className={styles.layers}>{section(PINNED)}</ul>
      </div>
      <div className={styles.hintFoot}>
        <b>Drag</b> story rows to reorder, or use the arrows. Click anything in the phone to edit it.
      </div>
    </aside>
  );
}
