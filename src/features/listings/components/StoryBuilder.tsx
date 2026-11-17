"use client";

import { useState } from "react";
import { BLOCK_LABEL, WIDGETS, blockLabel, moveBlock, parseBlocks, seedBlocks, type StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/StoryBuilder.module.css";
import { BlockEditor } from "./BlockEditor";
import { StoryPreview } from "./StoryPreview";

type Seed = Parameters<typeof seedBlocks>[0];

type Props = {
  blocks: unknown;
  onChange: (blocks: StoryBlock[]) => void;
  seed: Seed;
  verdict: string;
  /** Places build their story from the fields, so a custom order doesn't show on the guest page. */
  venue: boolean;
  hidePhotos: boolean;
  onHidePhotosChange: (hidden: boolean) => void;
};

/** Layers, add-a-block, edit, and a phone view for the About story. Saves with "Save changes". */
export function StoryBuilder({ blocks: raw, onChange, seed, verdict, venue, hidePhotos, onHidePhotosChange }: Props) {
  const blocks = parseBlocks(raw);
  const [sel, setSel] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const current = sel !== null ? blocks[sel] : undefined;

  function update(next: StoryBlock[], select?: number | null) {
    onChange(next);
    if (select !== undefined) setSel(select);
  }
  function move(from: number, to: number) {
    update(moveBlock(blocks, from, to), to);
  }
  function add(block: StoryBlock) {
    // After the selected block, else at the end.
    const at = sel !== null ? sel + 1 : blocks.length;
    update([...blocks.slice(0, at), structuredClone(block), ...blocks.slice(at)], at);
  }
  function remove(i: number) {
    update(blocks.filter((_, j) => j !== i), null);
  }
  function duplicate(i: number) {
    update([...blocks.slice(0, i + 1), structuredClone(blocks[i]), ...blocks.slice(i + 1)], i + 1);
  }

  if (blocks.length === 0) {
    return (
      <div className={styles.builder}>
        <h2 className={`t-title-sm ${styles.title}`}>Story</h2>
        <p className={styles.note}>
          {venue
            ? "Places build the story from the fields in this form. A custom story isn't used for places."
            : "This listing builds its story from the fields below. Start a custom story to reorder it, add blocks, or change them. Once you do, the guest page shows your story and stops reading those fields for it."}
        </p>
        {venue ? null : (
          <button type="button" className={styles.addBtn} onClick={() => update(seedBlocks(seed), null)}>
            Start a custom story
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.builder}>
      <div className={styles.head}>
        <h2 className={`t-title-sm ${styles.title}`}>Story</h2>
        <label className={styles.check}>
          <input type="checkbox" checked={!hidePhotos} onChange={(e) => onHidePhotosChange(!e.target.checked)} />
          <span>Show photos in the story</span>
        </label>
      </div>
      {venue ? <p className={styles.note}>Places build the story from the fields, so changes here won&apos;t show on the guest page.</p> : null}
      <div className={styles.grid}>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Layers · {blocks.length}</h3>
          <ul className={styles.layers} onDragLeave={() => setOver(null)}>
            {blocks.map((b, i) => (
              <li
                key={i}
                className={`${styles.layer} ${sel === i ? styles.layerOn : ""} ${over === i && dragFrom !== i ? styles.layerOver : ""}`}
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDrop={() => {
                  if (dragFrom !== null) move(dragFrom, i);
                  setDragFrom(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setOver(null);
                }}
              >
                <button type="button" className={styles.layerMain} onClick={() => setSel(i)} aria-pressed={sel === i}>
                  <span className={styles.grip} aria-hidden="true">
                    ⋮⋮
                  </span>
                  <span className={styles.layerText}>
                    <span className={styles.layerName}>{blockLabel(b)}</span>
                    <span className={styles.layerType}>{BLOCK_LABEL[b.type] ?? b.type}</span>
                  </span>
                </button>
                <span className={styles.layerActs}>
                  <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    ↑
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)}>
                    ↓
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label="Duplicate" onClick={() => duplicate(i)}>
                    ⧉
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label="Delete" onClick={() => remove(i)}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <h3 className={styles.colTitle}>Add a block</h3>
          <div className={styles.widgets}>
            {WIDGETS.map((w) => (
              <button key={w.name} type="button" className={styles.addBtn} onClick={() => add(w.block)}>
                + {w.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>{current ? `Edit · ${BLOCK_LABEL[current.type] ?? current.type}` : "Edit"}</h3>
          {current && sel !== null ? (
            <div className={styles.editor}>
              <BlockEditor block={current} onChange={(b) => update(blocks.map((x, j) => (j === sel ? b : x)))} />
            </div>
          ) : (
            <p className={styles.note}>Pick a block in Layers or in the phone to fill it in.</p>
          )}
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Phone preview</h3>
          <StoryPreview title={seed.title} verdict={verdict} blocks={blocks} selected={sel} onSelect={setSel} />
        </div>
      </div>
    </div>
  );
}
