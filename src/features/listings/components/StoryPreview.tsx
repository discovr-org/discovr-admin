import type { StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/StoryBuilder.module.css";

type Props = {
  title: string;
  verdict: string;
  blocks: StoryBlock[];
  selected: number | null;
  onSelect: (index: number) => void;
};

/** A rough phone view of the About story. Click a block to edit it. */
export function StoryPreview({ title, verdict, blocks, selected, onSelect }: Props) {
  return (
    <div className={styles.phone} aria-label="Phone preview">
      <div className={styles.phoneScreen}>
        <h3 className={styles.pvTitle}>{title || "Untitled listing"}</h3>
        {verdict ? <p className={styles.pvVerdict}>{verdict}</p> : null}
        <div className={styles.pvStory}>
          {blocks.map((b, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.pvBlock} ${selected === i ? styles.pvBlockOn : ""}`}
              onClick={() => onSelect(i)}
              aria-label={`Edit block ${i + 1}`}
            >
              <PreviewBlock block={b} />
            </button>
          ))}
          {blocks.length === 0 ? <p className={styles.pvEmpty}>No blocks yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block }: { block: StoryBlock }) {
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
          {block.paragraphs.map((p, i) => (
            <p key={i} className={styles.pvP}>
              {p.strong ? <strong>{p.text}</strong> : p.text}
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
          {block.paragraphs.map((p, i) => (
            <p key={i} className={styles.pvP}>
              {p}
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
    default:
      return <p className={styles.pvMuted}>Unknown block</p>;
  }
}
