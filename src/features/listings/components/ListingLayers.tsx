"use client";

import { useState } from "react";
import { PART_META, type FixedId, type PartId, type SectionState } from "../utils/pageLayout";
import { BLOCK_LABEL, blockLabel, type StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";

export type Sel = { kind: "part"; id: PartId } | { kind: "block"; index: number } | null;

type Props = {
  sel: Sel;
  onSel: (s: Sel) => void;
  /** Preview id (`part:x` / `block:n`) the pointer is over, in the phone or in this list. */
  hover: string | null;
  onHover: (id: string | null) => void;
  blocks: StoryBlock[];
  order: SectionState[];
  fixed: Record<"more" | "booking", boolean>;
  venue: boolean;
  onMoveSection: (from: number, to: number) => void;
  onToggleSection: (id: SectionState["id"]) => void;
  onToggleFixed: (id: Exclude<FixedId, "gallery">) => void;
  onMoveBlock: (from: number, to: number) => void;
  onToggleBlock: (i: number) => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onAdd: () => void;
  onStart: () => void;
  /** A widget card was dropped here; `at` is the block index to insert before. */
  onDropWidget: (widget: number, at: number) => void;
};

const EyeBtn = ({ on, onClick, what }: { on: boolean; onClick: () => void; what: string }) => (
  <button type="button" className={styles.iconBtn} aria-label={`${on ? "Hide" : "Show"} ${what}`} aria-pressed={!on} onClick={onClick}>
    {on ? "◉" : "○"}
  </button>
);

/** Left column: the page top to bottom. Sections and story blocks drag to reorder; the eye hides one on the guest page. */
export function ListingLayers(p: Props) {
  const [dragSec, setDragSec] = useState<number | null>(null);
  const [dragBlock, setDragBlock] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const isPart = (id: PartId) => p.sel?.kind === "part" && p.sel.id === id;
  const clear = () => {
    setDragSec(null);
    setDragBlock(null);
    setOver(null);
  };

  const partRow = (id: PartId, opts: { show?: boolean; onToggle?: () => void; locked?: boolean; drag?: number; note?: string }) => {
    const m = PART_META[id];
    const hidden = opts.show === false;
    return (
      <li
        key={id}
        onMouseEnter={() => p.onHover(`part:${id}`)}
        onMouseLeave={() => p.onHover(null)}
        className={`${styles.layer} ${isPart(id) ? styles.layerOn : ""} ${p.hover === `part:${id}` ? styles.layerHl : ""} ${hidden ? styles.layerHidden : ""} ${over === `s${id}` && dragSec !== null ? styles.layerOver : ""}`}
        draggable={opts.drag !== undefined}
        onDragStart={(e) => {
          if (opts.drag === undefined) return;
          e.dataTransfer.effectAllowed = "move";
          setDragSec(opts.drag);
        }}
        onDragOver={(e) => {
          if (dragSec === null || opts.drag === undefined) return;
          e.preventDefault();
          setOver(`s${id}`);
        }}
        onDrop={() => {
          if (dragSec !== null && opts.drag !== undefined) p.onMoveSection(dragSec, opts.drag);
          clear();
        }}
        onDragEnd={clear}
      >
        <button type="button" className={`${styles.layerMain} ${opts.drag !== undefined ? styles.layerDrag : ""}`} aria-pressed={isPart(id)} onClick={() => p.onSel({ kind: "part", id })}>
          <span className={styles.layerIc} aria-hidden="true">
            {m.glyph}
          </span>
          <span className={styles.layerText}>
            <span className={styles.layerName}>{m.label}</span>
            <span className={styles.layerType}>
              {m.hint}
              {opts.locked ? <span className={styles.chip}>fixed</span> : null}
              {hidden ? <span className={styles.chip}>hidden</span> : null}
            </span>
          </span>
        </button>
        {opts.onToggle ? (
          <span className={`${styles.layerActs} ${hidden ? styles.layerActsShow : ""}`}>
            <EyeBtn on={!hidden} onClick={opts.onToggle} what={m.label} />
          </span>
        ) : null}
      </li>
    );
  };

  const story = (
    <li key="story" className={styles.storyNest}>
      {p.blocks.length === 0 ? (
        <div className={styles.paneInner}>
          <p className={styles.note}>
            {p.venue
              ? "Places build the story from the fields, so custom blocks aren't used."
              : "The story is built from the fields. Start a custom story to reorder it and add blocks."}
          </p>
          {p.venue ? null : (
            <button type="button" className={styles.addBtn} onClick={p.onStart}>
              Start a custom story
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className={styles.layers}>
            {p.blocks.map((b, i) => {
              const on = p.sel?.kind === "block" && p.sel.index === i;
              const hidden = b.show === false;
              return (
                <li
                  key={i}
                  onMouseEnter={() => p.onHover(`block:${i}`)}
                  onMouseLeave={() => p.onHover(null)}
                  className={`${styles.layer} ${on ? styles.layerOn : ""} ${p.hover === `block:${i}` ? styles.layerHl : ""} ${hidden ? styles.layerHidden : ""} ${over === `b${i}` ? styles.layerOver : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragBlock(i);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(`b${i}`);
                  }}
                  onDrop={(e) => {
                    const w = e.dataTransfer.getData("text/widget");
                    if (w) p.onDropWidget(Number(w), i);
                    else if (dragBlock !== null) p.onMoveBlock(dragBlock, i);
                    clear();
                  }}
                  onDragEnd={clear}
                >
                  <button type="button" className={`${styles.layerMain} ${styles.layerDrag}`} aria-pressed={on} onClick={() => p.onSel({ kind: "block", index: i })}>
                    <span className={styles.layerIc} aria-hidden="true">
                      ⋮⋮
                    </span>
                    <span className={styles.layerText}>
                      <span className={styles.layerName}>{blockLabel(b)}</span>
                      <span className={styles.layerType}>
                        {BLOCK_LABEL[b.type] ?? b.type}
                        {b.size === "half" ? <span className={styles.chip}>½ width</span> : null}
                        {hidden ? <span className={styles.chip}>hidden</span> : null}
                      </span>
                    </span>
                  </button>
                  <span className={`${styles.layerActs} ${hidden ? styles.layerActsShow : ""}`}>
                    <EyeBtn on={!hidden} onClick={() => p.onToggleBlock(i)} what={blockLabel(b)} />
                    <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={i === 0} onClick={() => p.onMoveBlock(i, i - 1)}>
                      ↑
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={i === p.blocks.length - 1} onClick={() => p.onMoveBlock(i, i + 1)}>
                      ↓
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Duplicate" onClick={() => p.onDuplicate(i)}>
                      ⧉
                    </button>
                    <button type="button" className={styles.iconBtn} aria-label="Delete" onClick={() => p.onDelete(i)}>
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div
            className={styles.dropEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const w = e.dataTransfer.getData("text/widget");
              if (w) p.onDropWidget(Number(w), p.blocks.length);
              clear();
            }}
          >
            <button type="button" className={styles.addBtn} onClick={p.onAdd}>
              + Add a block
            </button>
          </div>
        </>
      )}
    </li>
  );

  const hiddenCount = p.order.filter((s) => !s.show).length + (p.fixed.more ? 0 : 1) + (p.fixed.booking ? 0 : 1) + p.blocks.filter((b) => b.show === false).length;

  return (
    <aside className={styles.colWrap} aria-label="Layers">
      <div className={styles.colHead}>
        <h2>Layers</h2>
        <p>
          {p.order.length + 3} parts · {p.blocks.length} story {p.blocks.length === 1 ? "block" : "blocks"}
          {hiddenCount ? ` · ${hiddenCount} hidden` : ""}
        </p>
      </div>
      <div className={styles.scroll}>
        <ul className={styles.layers}>
          {partRow("gallery", { locked: true })}
          {p.order.flatMap((s, i) => {
            const row = partRow(s.id, { show: s.show, onToggle: () => p.onToggleSection(s.id), drag: i });
            return s.id === "about" ? [row, story] : [row];
          })}
          {partRow("more", { show: p.fixed.more, onToggle: () => p.onToggleFixed("more") })}
        </ul>
        <div className={styles.sub}>Other fields</div>
        <ul className={styles.layers}>
          {partRow("faqs", {})}
          {partRow("tags", {})}
        </ul>
        <div className={styles.sub}>Pinned</div>
        <ul className={styles.layers}>{partRow("booking", { show: p.fixed.booking, onToggle: () => p.onToggleFixed("booking") })}</ul>
      </div>
      <div className={styles.hintFoot}>
        <b>Drag</b> rows to reorder. The circle hides a part on the guest page. Click anything in the phone to edit it.
      </div>
    </aside>
  );
}
