"use client";

import { useState } from "react";
import { PART_ICON } from "../utils/layerIcons";
import { PART_META, type FixedId, type PartId, type SectionState } from "../utils/pageLayout";
import styles from "../styles/ListingEditor.module.css";
import { Ic, type IconName } from "./EditorIcon";

/** One story row in Layers. Listings and categories both map their blocks to this. */
export type LayerItem = { label: string; type: string; icon: IconName; half?: boolean; hidden?: boolean; /** Set when the row is a page part placed in the story. */ partId?: string };

export type Sel = { kind: "part"; id: PartId } | { kind: "block"; index: number } | null;

type Props = {
  sel: Sel;
  onSel: (s: Sel) => void;
  /** Preview id (`part:x` / `block:n`) the pointer is over, in the phone or in this list. */
  hover: string | null;
  onHover: (id: string | null) => void;
  items: LayerItem[];
  /** A listing that uses a category: its layout is shown but can only be edited in the category. */
  locked?: boolean;
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

/** Left column: the page top to bottom, as in the prototype. Drag rows to reorder; the eye hides a part on the guest page. */
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

  const partRow = (id: PartId, opts: { show?: boolean; onToggle?: () => void; locked?: boolean; drag?: number }) => {
    const m = PART_META[id];
    const hidden = opts.show === false;
    const cls = [
      styles.layer,
      isPart(id) ? styles.layerOn : "",
      hidden ? styles.layerHidden : "",
      p.hover === `part:${id}` ? styles.layerHl : "",
      over === `s${id}` && dragSec !== null ? styles.layerOver : "",
      opts.drag === undefined ? styles.noGrip : "",
    ].join(" ");
    return (
      <li
        key={id}
        className={cls}
        onMouseEnter={() => p.onHover(`part:${id}`)}
        onMouseLeave={() => p.onHover(null)}
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
        <span className={styles.grip}>
          <Ic name="grip" size={14} />
        </span>
        <button type="button" className={`${styles.layerMain} ${opts.drag !== undefined ? styles.layerDrag : ""}`} aria-pressed={isPart(id)} onClick={() => p.onSel({ kind: "part", id })}>
          <span className={styles.lic}>
            <Ic name={PART_ICON[id]} size={15} />
          </span>
          <span className={styles.ltxt}>
            <div className={styles.lname}>{m.label}</div>
            <div className={styles.ltype}>
              {m.hint}
              {opts.locked ? <span className={styles.chip}>fixed</span> : null}
              {hidden ? <span className={styles.chip}>hidden</span> : null}
            </div>
          </span>
        </button>
        {opts.locked ? (
          <span className={styles.lockIc} title="Always shown at the top">
            <Ic name="lock" size={14} />
          </span>
        ) : opts.onToggle ? (
          <span className={`${styles.lacts} ${hidden ? styles.lactsShow : ""}`}>
            <button type="button" className={styles.ibtn} aria-label={`${hidden ? "Show" : "Hide"} ${m.label}`} title={hidden ? "Show" : "Hide"} onClick={opts.onToggle}>
              <Ic name={hidden ? "eyeoff" : "eye"} size={15} />
            </button>
          </span>
        ) : null}
      </li>
    );
  };

  const blockRow = (b: LayerItem, i: number) => {
    const on = p.sel?.kind === "block" && p.sel.index === i;
    const hidden = b.hidden === true;
    const cls = [
      styles.layer,
      on ? styles.layerOn : "",
      hidden ? styles.layerHidden : "",
      p.hover === `block:${i}` ? styles.layerHl : "",
      over === `b${i}` ? styles.layerOver : "",
      p.locked ? styles.noGrip : "",
    ].join(" ");
    return (
      <li
        key={i}
        className={cls}
        onMouseEnter={() => p.onHover(`block:${i}`)}
        onMouseLeave={() => p.onHover(null)}
        draggable={!p.locked}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          setDragBlock(i);
        }}
        onDragOver={(e) => {
          if (p.locked) return;
          e.preventDefault();
          setOver(`b${i}`);
        }}
        onDrop={(e) => {
          if (p.locked) return;
          const w = e.dataTransfer.getData("text/widget");
          if (w) p.onDropWidget(Number(w), i);
          else if (dragBlock !== null) p.onMoveBlock(dragBlock, i);
          clear();
        }}
        onDragEnd={clear}
      >
        <span className={styles.grip}>
          <Ic name="grip" size={14} />
        </span>
        <button type="button" className={`${styles.layerMain} ${p.locked ? "" : styles.layerDrag}`} aria-pressed={on} onClick={() => p.onSel({ kind: "block", index: i })}>
          <span className={styles.lic}>
            <Ic name={b.icon} size={15} />
          </span>
          <span className={styles.ltxt}>
            <div className={styles.lname}>{b.label}</div>
            <div className={styles.ltype}>
              {b.type}
              {b.half ? <span className={styles.chip}>½ width</span> : null}
              {hidden ? <span className={styles.chip}>hidden</span> : null}
            </div>
          </span>
        </button>
        {p.locked ? null : (
          <span className={`${styles.lacts} ${hidden ? styles.lactsShow : ""}`}>
            <button type="button" className={styles.ibtn} aria-label={`${hidden ? "Show" : "Hide"} ${b.label}`} title={hidden ? "Show" : "Hide"} onClick={() => p.onToggleBlock(i)}>
              <Ic name={hidden ? "eyeoff" : "eye"} size={15} />
            </button>
            <button type="button" className={styles.ibtn} aria-label="Duplicate" title="Duplicate" onClick={() => p.onDuplicate(i)}>
              <Ic name="copy" size={14} />
            </button>
            <button type="button" className={styles.ibtn} aria-label="Delete" title="Delete" onClick={() => p.onDelete(i)}>
              <Ic name="trash" size={14} />
            </button>
          </span>
        )}
      </li>
    );
  };

  const rows: React.ReactNode[] = [partRow("gallery", { locked: true })];
  const inStory = new Set(p.items.flatMap((b) => (b.partId ? [b.partId] : [])));
  p.order.forEach((s, i) => {
    if (s.id !== "about" && inStory.has(s.id)) return; // shown where the story holds it
    rows.push(partRow(s.id, p.locked ? { show: s.show } : { show: s.show, onToggle: () => p.onToggleSection(s.id), drag: i }));
    if (s.id === "about") {
      if (p.items.length === 0) {
        rows.push(
          <li key="story-empty" className={styles.paneInnerTight}>
            <p className={styles.note}>
              {p.locked
                ? "This category has no story blocks yet. Add some in Categories."
                : p.venue
                  ? "Places build the story from the fields, so custom blocks aren't used."
                  : "The story is built from the fields. Start a custom story to reorder it and add blocks."}
            </p>
            {p.venue || p.locked ? null : (
              <button type="button" className={styles.addBtn} onClick={p.onStart}>
                <Ic name="plus" size={14} /> Start a custom story
              </button>
            )}
          </li>,
        );
      } else {
        p.items.forEach((b, j) => rows.push(blockRow(b, j)));
        if (!p.locked)
        rows.push(
          <li
            key="story-add"
            className={styles.paneInnerTight}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const w = e.dataTransfer.getData("text/widget");
              if (w) p.onDropWidget(Number(w), p.items.length);
              clear();
            }}
          >
            <button type="button" className={styles.addBtn} onClick={p.onAdd}>
              <Ic name="plus" size={14} /> Add a block
            </button>
          </li>,
        );
      }
    }
  });
  rows.push(partRow("more", p.locked ? { show: p.fixed.more } : { show: p.fixed.more, onToggle: () => p.onToggleFixed("more") }));

  const hiddenCount = p.order.filter((s) => !s.show).length + (p.fixed.more ? 0 : 1) + (p.fixed.booking ? 0 : 1) + p.items.filter((b) => b.hidden).length;

  return (
    <aside className={styles.colWrap} aria-label="Layers">
      <div className={styles.colHead}>
        <div>
          <h2>Layers</h2>
          <p>
            {p.order.length + 3} parts · {p.items.length} story {p.items.length === 1 ? "block" : "blocks"}
            {hiddenCount ? ` · ${hiddenCount} hidden` : ""}
          </p>
        </div>
        {p.locked ? null : (
          <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={p.onAdd}>
            <Ic name="plus" size={14} /> Add
          </button>
        )}
      </div>
      <div className={styles.scroll}>
        <ul className={styles.layers}>{rows}</ul>
        <div className={styles.sub}>Other fields</div>
        <ul className={styles.layers}>
          {partRow("faqs", {})}
          {partRow("tags", {})}
        </ul>
        <div className={styles.sub}>Pinned</div>
        <ul className={styles.layers}>{partRow("booking", p.locked ? { show: p.fixed.booking } : { show: p.fixed.booking, onToggle: () => p.onToggleFixed("booking") })}</ul>
      </div>
      <div className={styles.hintFoot}>
        {p.locked ? (
          <>This listing uses a <b>category</b> layout. Click a block to fill in its content. Change the layout in Categories.</>
        ) : (
          <>
            <b>Drag</b> rows to reorder. In the preview, <b>hold a part</b> to make it jiggle, then drag it up or down.
          </>
        )}
      </div>
    </aside>
  );
}
