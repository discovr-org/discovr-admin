"use client";

import { useState } from "react";
import { PART_META, type SectionState } from "../utils/pageLayout";
import { WIDGETS, type StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";
import { WidgetPreview } from "./WidgetPreview";

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
    <div className={styles.lib}>
      <div className={styles.libTop}>
        <h3 className={styles.paneTitle}>Widgets</h3>
        <input className={styles.search} type="search" placeholder="Search widgets" aria-label="Search widgets" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className={styles.note}>
        {noStory
          ? "Start a custom story in Layers first, then add blocks here."
          : "Optional blocks a listing can use. Click one to add it below the selected block, or drag it straight onto the phone."}
      </p>
      {noStory ? null : (
        <>
          <div className={styles.group}>Widgets</div>
          <div className={styles.widgetGrid}>
            {shown.map(({ w, i }) => (
              <button
                key={w.name}
                type="button"
                className={styles.wcard}
                title="Click to add · drag onto the phone or into Layers"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/widget", String(i));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onAdd(i)}
              >
                <WidgetPreview block={w.block} />
                <div className={styles.wmeta}>
                  <span className={styles.wname}>{w.name}</span>
                  {used.has(w.block.type) ? <span className={`${styles.chip} ${styles.chipOn}`}>On page</span> : null}
                  <span className={styles.chip}>{w.block.size === "half" ? "Half" : "Full"}</span>
                </div>
              </button>
            ))}
          </div>
          {shown.length === 0 ? <p className={styles.note}>No widgets match.</p> : null}
        </>
      )}
      {hidden.length > 0 ? (
        <>
          <div className={styles.group}>Hidden page sections</div>
          <div className={styles.widgetGrid}>
            {hidden.map((s) => (
              <button key={s.id} type="button" className={styles.wcard} onClick={() => onShowSection(s.id)}>
                <div className={styles.wmeta}>
                  <span className={styles.wname}>{PART_META[s.id].label}</span>
                  <span className={styles.chip}>Show</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
