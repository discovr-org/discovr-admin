import { formatInr } from "@/shared/utils/formatInr";
import type { StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";

export function PreviewBlock({ block }: { block: StoryBlock }) {
  switch (block.type) {
    case "heading":
      return block.level === "section" ? <h4 className={styles.pvH1}>{block.text}</h4> : <h5 className={styles.pvH2}>{block.text}</h5>;
    case "line":
      return <hr className={styles.pvLine} />;
    case "quote":
      return <p className={styles.pvQuote}>{block.text}</p>;
    case "text":
      return (
        <div>
          {block.paragraphs.map((t, i) => (
            <p key={i} className={styles.pvP}>
              {t.strong ? <strong>{t.text}</strong> : t.text}
            </p>
          ))}
        </div>
      );
    case "photo":
      // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
      return block.src ? <img className={styles.pvImg} src={block.src} alt={block.alt} width={320} height={240} /> : <div className={styles.pvNoImg}>Add a photo</div>;
    case "forNotFor":
      return (
        <div className={styles.pvCols}>
          {block.columns.map((c, i) => (
            <div key={i}>
              <h5 className={styles.pvH2}>{c.title}</h5>
              <ul className={styles.pvList}>
                {c.items.map((it, j) => (
                  <li key={j}>
                    {c.tone === "included" ? "✓" : "✕"} {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <ol className={styles.pvList}>
          {block.items.map((s, i) => (
            <li key={i}>
              <strong>{s.marker}</strong> {s.title}
              {s.caption ? <span className={styles.pvMuted}> — {s.caption}</span> : null}
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div className={`${styles.pvCallout} ${block.tone === "tip" ? styles.pvTip : ""}`}>
          <strong>{block.title}</strong>
          {block.paragraphs.map((t, i) => (
            <p key={i} className={styles.pvP}>
              {t}
            </p>
          ))}
        </div>
      );
    case "checklist":
      return (
        <div>
          <h5 className={styles.pvH2}>{block.title}</h5>
          <ul className={styles.pvList}>
            {block.items.map((it, i) => (
              <li key={i}>✓ {it}</li>
            ))}
          </ul>
        </div>
      );
    case "faq":
      return (
        <ul className={styles.pvList}>
          {block.items.map((f, i) => (
            <li key={i}>{f.q}</li>
          ))}
        </ul>
      );
    case "stats":
      return (
        <div className={styles.pvPair}>
          {block.items.map((t, i) => (
            <div key={i} className={styles.pvTile}>
              <span className={styles.pvTileLabel}>{t.label}</span>
              <strong>{t.value}</strong>
            </div>
          ))}
        </div>
      );
    case "packages":
      return (
        <div>
          {block.title ? <h5 className={styles.pvH2}>{block.title}</h5> : null}
          <ul className={styles.pvList}>
            {block.items.map((t, i) => (
              <li key={i} className={styles.pvPkg}>
                <span>{t.name}</span>
                <strong>{Number(t.price) > 0 ? formatInr(Number(t.price)) : t.price}</strong>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return <p className={styles.pvMuted}>Unknown block</p>;
  }
}

/** Small preview of a widget, scaled the way the prototype draws its cards. */
export function WidgetPreview({ block }: { block: StoryBlock }) {
  return (
    <div className={styles.wprev} aria-hidden="true">
      <div className={`${styles.wsz} ${block.size === "half" ? styles.wszHalf : ""}`}>
        <div>
          <PreviewBlock block={block} />
        </div>
      </div>
    </div>
  );
}
