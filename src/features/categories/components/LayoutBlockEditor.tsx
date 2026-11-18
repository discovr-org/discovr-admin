"use client";

import { Input } from "@/shared/components/Input";
import styles from "@/features/listings/styles/ListingEditor.module.css";
import { SOURCES, sourcesOf, type LayoutBlock, type SourceKind } from "../utils/layout";

type Props = { block: LayoutBlock; onChange: (block: LayoutBlock) => void };

const FIXED = "";

/** Pick the listing field a block shows. `fixed` also lets the category type text that is the same on every listing. */
function SourceSelect({ label, kind, value, onChange, fixed }: { label: string; kind: SourceKind; value: string | undefined; onChange: (v: string | undefined) => void; fixed?: boolean }) {
  return (
    <label className={styles.area}>
      <span className={styles.areaLabel}>{label}</span>
      <select className={styles.select} value={value ?? FIXED} onChange={(e) => onChange(e.target.value || undefined)}>
        {fixed ? <option value={FIXED}>Fixed text (same on every listing)</option> : null}
        {sourcesOf(kind).map((s) => (
          <option key={s.key} value={s.key}>
            From the listing: {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className={styles.area}>
      <span className={styles.areaLabel}>{label}</span>
      <textarea className={styles.textarea} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

const swap = <T,>(a: T[], i: number, v: T) => a.map((x, k) => (k === i ? v : x));

/** Edits one layout block: what it fills from, its fixed titles, and when it shows. */
export function LayoutBlockEditor({ block, onChange }: Props) {
  const body = (() => {
    switch (block.type) {
      case "heading":
        return (
          <>
            <SourceSelect label="Heading shows" kind="text" value={block.source} fixed onChange={(source) => onChange({ ...block, source })} />
            {block.source ? null : <Input label="Heading text" value={block.text ?? ""} onChange={(e) => onChange({ ...block, text: e.target.value })} />}
            <label className={styles.area}>
              <span className={styles.areaLabel}>Size</span>
              <select className={styles.select} value={block.level} onChange={(e) => onChange({ ...block, level: e.target.value as "section" | "small" })}>
                <option value="section">Big</option>
                <option value="small">Small</option>
              </select>
            </label>
          </>
        );
      case "line":
        return <p className={styles.note}>A thin line between parts of the story.</p>;
      case "text":
        return (
          <>
            <Input label="Small label above (optional)" value={block.label ?? ""} onChange={(e) => onChange({ ...block, label: e.target.value || undefined })} />
            <SourceSelect label="Text shows" kind="text" value={block.source} fixed onChange={(source) => onChange({ ...block, source })} />
            {block.source ? null : <Area label="Fixed text" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} />}
          </>
        );
      case "quote":
        return (
          <>
            <SourceSelect label="Quote shows" kind="text" value={block.source} fixed onChange={(source) => onChange({ ...block, source })} />
            {block.source ? null : <Area label="Fixed text" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} />}
          </>
        );
      case "checklist":
        return (
          <>
            <Input label="Title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <SourceSelect label="Items" kind="lines" value={block.source} onChange={(source) => source && onChange({ ...block, source })} />
          </>
        );
      case "forNotFor":
        return (
          <>
            {block.columns.map((c, i) => (
              <div key={i} className={styles.repCard}>
                <div className={styles.repHead}>
                  <span>Column {i + 1}</span>
                </div>
                <Input label="Title" value={c.title} onChange={(e) => onChange({ ...block, columns: swap(block.columns, i, { ...c, title: e.target.value }) })} />
                <label className={styles.area}>
                  <span className={styles.areaLabel}>Icon</span>
                  <select className={styles.select} value={c.tone} onChange={(e) => onChange({ ...block, columns: swap(block.columns, i, { ...c, tone: e.target.value as "included" | "bring" }) })}>
                    <option value="included">Ticks</option>
                    <option value="bring">Crosses</option>
                  </select>
                </label>
                <SourceSelect label="Items" kind="lines" value={c.source} onChange={(source) => source && onChange({ ...block, columns: swap(block.columns, i, { ...c, source }) })} />
              </div>
            ))}
          </>
        );
      case "callout":
        return (
          <>
            <Input label="Title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <label className={styles.area}>
              <span className={styles.areaLabel}>Tone</span>
              <select className={styles.select} value={block.tone} onChange={(e) => onChange({ ...block, tone: e.target.value as "heads_up" | "tip" })}>
                <option value="heads_up">Heads up (amber)</option>
                <option value="tip">Tip (blue)</option>
              </select>
            </label>
            <SourceSelect label="Message shows" kind="text" value={block.source} fixed onChange={(source) => onChange({ ...block, source })} />
            {block.source ? null : <Area label="Fixed message" value={block.text ?? ""} onChange={(text) => onChange({ ...block, text })} />}
          </>
        );
      case "faq":
        return <p className={styles.note}>Shows the listing&apos;s FAQs. Hidden when it has none.</p>;
      case "steps":
        return <p className={styles.note}>Shows the listing&apos;s process steps. Hidden when it has none.</p>;
      case "packages":
        return <Input label="Title (optional)" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value || undefined })} />;
      case "stats":
        return (
          <>
            {block.tiles.map((t, i) => (
              <div key={i} className={styles.repCard}>
                <div className={styles.repHead}>
                  <span>Tile {i + 1}</span>
                  <button type="button" className={styles.ibtn} aria-label={`Remove tile ${i + 1}`} onClick={() => onChange({ ...block, tiles: block.tiles.filter((_, k) => k !== i) })}>
                    ×
                  </button>
                </div>
                <Input label="Label" value={t.label} onChange={(e) => onChange({ ...block, tiles: swap(block.tiles, i, { ...t, label: e.target.value }) })} />
                <SourceSelect label="Value" kind="text" value={t.source} onChange={(source) => source && onChange({ ...block, tiles: swap(block.tiles, i, { ...t, source }) })} />
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, tiles: [...block.tiles, { label: "", source: "ageGroup" }] })}>
              + Add tile
            </button>
          </>
        );
      case "photo":
        return <SourceSelect label="Photo" kind="photo" value={block.source} onChange={(source) => source && onChange({ ...block, source })} />;
    }
  })();

  return (
    <>
      {body}
      <label className={styles.area}>
        <span className={styles.areaLabel}>Space above</span>
        <select className={styles.select} value={block.space ?? ""} onChange={(e) => onChange({ ...block, space: (e.target.value || undefined) as LayoutBlock["space"] })}>
          <option value="">Normal</option>
          <option value="none">None (stick to the block above)</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label className={styles.area}>
        <span className={styles.areaLabel}>Hide on</span>
        <select className={styles.select} value={block.hide ?? ""} onChange={(e) => onChange({ ...block, hide: (e.target.value || undefined) as LayoutBlock["hide"] })}>
          <option value="">Nowhere (show everywhere)</option>
          <option value="mobile">Phones</option>
          <option value="desktop">Desktop</option>
        </select>
      </label>
      {block.type === "line" ? null : (
        <label className={styles.area}>
          <span className={styles.areaLabel}>Show this block</span>
          <select className={styles.select} value={block.when ?? ""} onChange={(e) => onChange({ ...block, when: e.target.value || undefined })}>
            <option value="">Whenever it has content</option>
            {SOURCES.filter((s) => s.kind !== "photo").map((s) => (
              <option key={s.key} value={s.key}>
                Only if the listing has: {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {block.type === "line" ? (
        <label className={styles.area}>
          <span className={styles.areaLabel}>Show this divider</span>
          <select className={styles.select} value={block.when ?? ""} onChange={(e) => onChange({ ...block, when: e.target.value || undefined })}>
            <option value="">Always</option>
            {SOURCES.filter((s) => s.kind !== "photo").map((s) => (
              <option key={s.key} value={s.key}>
                Only if the listing has: {s.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}
