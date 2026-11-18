"use client";

import { ImageUploadField } from "@/shared/components/ImageUploadField";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { uploadContentImageAdmin } from "@/shared/utils/catalogApi";
import type { StoryBlock } from "../utils/storyBlocks";
import { Ic } from "./EditorIcon";
import styles from "../styles/ListingEditor.module.css";

type Props = { block: StoryBlock; onChange: (block: StoryBlock) => void };

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className={styles.area}>
      <span className={styles.areaLabel}>{label}</span>
      <textarea className={styles.textarea} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** One item per line. Blank lines are dropped on save. */
function Lines({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return <Area label={`${label} (one per line)`} rows={Math.max(3, items.length + 1)} value={items.join("\n")} onChange={(v) => onChange(v.split("\n"))} />;
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <label className={styles.area}>
      <span className={styles.areaLabel}>{label}</span>
      <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ children, onRemove, label }: { children: React.ReactNode; onRemove: () => void; label: string }) {
  return (
    <div className={styles.repCard}>
      <div className={styles.repHead}>
        <span>{label}</span>
        <button type="button" className={styles.ibtn} aria-label={`Remove ${label}`} onClick={onRemove}>
          <Ic name="x" size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

const without = <T,>(a: T[], i: number) => a.filter((_, j) => j !== i);
const replace = <T,>(a: T[], i: number, v: T) => a.map((x, j) => (j === i ? v : x));

export function BlockEditor({ block, onChange }: Props) {
  const toast = useToast();

  switch (block.type) {
    case "heading":
      return (
        <>
          <Input label="Heading" value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          <Choice label="Size" value={block.level} options={[["section", "Big"], ["small", "Small"]]} onChange={(level) => onChange({ ...block, level })} />
        </>
      );
    case "line":
      return <p className={styles.note}>A thin line between parts of the story. Nothing to fill in.</p>;
    case "quote":
      return (
        <>
          <Area label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} />
          <Input label="Who said it (optional)" value={block.cite ?? ""} onChange={(e) => onChange({ ...block, cite: e.target.value || undefined })} />
          <label className={styles.check}>
            <input type="checkbox" checked={block.plain !== false} onChange={(e) => onChange({ ...block, plain: e.target.checked })} />
            <span>Plain style (no big quote look)</span>
          </label>
        </>
      );
    case "text":
      return (
        <>
          {block.paragraphs.map((p, i) => (
            <Row key={i} label={`Paragraph ${i + 1}`} onRemove={() => onChange({ ...block, paragraphs: without(block.paragraphs, i) })}>
              <Area label="Text" value={p.text} onChange={(text) => onChange({ ...block, paragraphs: replace(block.paragraphs, i, { ...p, text }) })} />
              <label className={styles.check}>
                <input type="checkbox" checked={p.strong === true} onChange={(e) => onChange({ ...block, paragraphs: replace(block.paragraphs, i, { ...p, strong: e.target.checked || undefined }) })} />
                <span>Bold (a small label)</span>
              </label>
            </Row>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, paragraphs: [...block.paragraphs, { text: "" }] })}>
            <Ic name="plus" size={14} /> Add paragraph
          </button>
        </>
      );
    case "photo":
      return (
        <>
          <ImageUploadField
            label="Photo"
            previewUrl={block.src || null}
            previewAlt={block.alt}
            onUpload={async (file) => {
              const { url } = await uploadContentImageAdmin(file);
              onChange({ ...block, src: url });
              toast.success("Photo added. Save changes to publish it.");
            }}
          />
          <Input label="Alt text" hint="Describe the photo for screen readers." value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <Input label="Caption (optional)" value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value || undefined })} />
        </>
      );
    case "forNotFor":
      return (
        <>
          {block.columns.map((c, i) => (
            <Row key={i} label={`Column ${i + 1}`} onRemove={() => onChange({ ...block, columns: without(block.columns, i) })}>
              <Input label="Title" value={c.title} onChange={(e) => onChange({ ...block, columns: replace(block.columns, i, { ...c, title: e.target.value }) })} />
              <Choice label="Icon" value={c.tone} options={[["included", "Ticks"], ["bring", "Crosses"]]} onChange={(tone) => onChange({ ...block, columns: replace(block.columns, i, { ...c, tone }) })} />
              <Lines label="Items" items={c.items} onChange={(items) => onChange({ ...block, columns: replace(block.columns, i, { ...c, items }) })} />
            </Row>
          ))}
          {block.columns.length < 2 ? (
            <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, columns: [...block.columns, { title: "", tone: "bring", items: [] }] })}>
              <Ic name="plus" size={14} /> Add column
            </button>
          ) : null}
        </>
      );
    case "steps":
      return (
        <>
          {block.items.map((s, i) => (
            <Row key={i} label={`Step ${i + 1}`} onRemove={() => onChange({ ...block, items: without(block.items, i) })}>
              <Input label="Marker" hint="A number or a time, like 1 or 9:00 AM." value={s.marker} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...s, marker: e.target.value }) })} />
              <Input label="Title" value={s.title} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...s, title: e.target.value }) })} />
              <Area label="Description (optional)" rows={2} value={s.caption ?? ""} onChange={(v) => onChange({ ...block, items: replace(block.items, i, { ...s, caption: v || undefined }) })} />
            </Row>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, items: [...block.items, { marker: String(block.items.length + 1), title: "" }] })}>
            <Ic name="plus" size={14} /> Add step
          </button>
        </>
      );
    case "callout":
      return (
        <>
          <Input label="Title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Choice label="Tone" value={block.tone} options={[["heads_up", "Heads up (amber)"], ["tip", "Tip (blue)"]]} onChange={(tone) => onChange({ ...block, tone })} />
          <Lines label="Message" items={block.paragraphs} onChange={(paragraphs) => onChange({ ...block, paragraphs })} />
        </>
      );
    case "checklist":
      return (
        <>
          <Input label="Title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Lines label="Items" items={block.items} onChange={(items) => onChange({ ...block, items })} />
        </>
      );
    case "faq":
      return (
        <>
          {block.items.map((f, i) => (
            <Row key={i} label={`Question ${i + 1}`} onRemove={() => onChange({ ...block, items: without(block.items, i) })}>
              <Input label="Question" value={f.q} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...f, q: e.target.value }) })} />
              <Area label="Answer" value={f.a} onChange={(a) => onChange({ ...block, items: replace(block.items, i, { ...f, a }) })} />
            </Row>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, items: [...block.items, { q: "", a: "" }] })}>
            <Ic name="plus" size={14} /> Add question
          </button>
        </>
      );
    case "stats":
      return (
        <>
          {block.items.map((t, i) => (
            <Row key={i} label={`Tile ${i + 1}`} onRemove={() => onChange({ ...block, items: without(block.items, i) })}>
              <Input label="Label" value={t.label} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...t, label: e.target.value }) })} />
              <Input label="Value" value={t.value} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...t, value: e.target.value }) })} />
            </Row>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, items: [...block.items, { label: "", value: "" }] })}>
            <Ic name="plus" size={14} /> Add tile
          </button>
        </>
      );
    case "packages":
      return (
        <>
          <Input label="Title (optional)" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value || undefined })} />
          {block.items.map((t, i) => (
            <Row key={i} label={`Package ${i + 1}`} onRemove={() => onChange({ ...block, items: without(block.items, i) })}>
              <Input label="Name" value={t.name} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...t, name: e.target.value }) })} />
              <Input label="Detail (optional)" value={t.detail ?? ""} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...t, detail: e.target.value || undefined }) })} />
              <Input label="Price (₹)" inputMode="numeric" value={t.price} onChange={(e) => onChange({ ...block, items: replace(block.items, i, { ...t, price: e.target.value }) })} />
            </Row>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange({ ...block, items: [...block.items, { name: "", price: "" }] })}>
            <Ic name="plus" size={14} /> Add package
          </button>
        </>
      );
    default:
      return <p className={styles.note}>This block type can&apos;t be edited here. It stays as it is.</p>;
  }
}
