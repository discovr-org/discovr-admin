"use client";

import { useState } from "react";
import { PART_META, type SectionState } from "../utils/pageLayout";
import { WIDGETS, type StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";
import { WidgetPreview } from "./ListingPhone";

type Props = {
  blocks: StoryBlock[];
  order: SectionState[];
  /** The listing has no custom story yet, so blocks can't be added. */
  noStory: boolean;
  onAdd: (widget: number) => void;
  onShowSection: (id: SectionState["id"]) => void;
};

/** Widgets tab: click to add after the selected block, or drag onto Layers or the phone. */
export function WidgetLibrary({ blocks, order, noStory, onAdd, onShowSection }: Props) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const used = new Set(blocks.map((b) => b.type));
  const shown = WIDGETS.map((w, i) => ({ w, i })).filter(({ w }) => !query || w.name.toLowerCase().includes(query));
  const hidden = order.filter((s) => !s.show && s.id !== "about");

  return (
    <div className={styles.paneInner}>
      <div className={styles.sectionHead}>
        <h3 className={styles.paneTitle}>Widgets</h3>
      </div>
      <input className={styles.search} type="search" placeholder="Search widgets" aria-label="Search widgets" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className={styles.note}>
        {noStory ? "Start a custom story in Layers first, then add blocks here." : "Click one to add it after the selected block, or drag it onto Layers or the phone."}
      </p>
      {noStory ? null : (
        <>
          <p className={styles.group}>Story blocks</p>
          <div className={styles.widgetGrid}>
            {shown.map(({ w, i }) => (
              <button
                key={w.name}
                type="button"
                className={styles.widgetCard}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/widget", String(i));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onAdd(i)}
              >
                <WidgetPreview block={w.block} />
                <span className={styles.widgetName}>{w.name}</span>
                <span className={styles.widgetHint}>
                  {w.block.size === "half" ? "Half width · " : ""}
                  {used.has(w.block.type) ? <span className={styles.widgetOn}>On page</span> : "Add to story"}
                </span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? <p className={styles.note}>No widgets match.</p> : null}
        </>
      )}
      {hidden.length > 0 ? (
        <>
          <p className={styles.group}>Hidden page sections</p>
          <div className={styles.widgetGrid}>
            {hidden.map((s) => (
              <button key={s.id} type="button" className={styles.widgetCard} onClick={() => onShowSection(s.id)}>
                <span className={styles.widgetName}>{PART_META[s.id].label}</span>
                <span className={styles.widgetHint}>Show on page</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
