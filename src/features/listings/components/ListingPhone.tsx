import { formatInr } from "@/shared/utils/formatInr";
import type { StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";
import type { Sel, SectionKey } from "./ListingLayers";

type Props = {
  title: string;
  verdict: string;
  hostLabel: string;
  coverUrl?: string;
  priceFromInr: number;
  priceUnit: string;
  place: string;
  hours: string;
  hasInstagram: boolean;
  bookLabel: string;
  blocks: StoryBlock[];
  sel: Sel;
  onSel: (s: Sel) => void;
};

/** A rough phone view of the guest page. Click any part to edit it. */
export function ListingPhone(p: Props) {
  const on = (k: SectionKey) => p.sel?.kind === "section" && p.sel.key === k;
  const hit = (k: SectionKey) => ({
    type: "button" as const,
    className: `${styles.pvHit} ${on(k) ? styles.pvOn : ""}`,
    onClick: () => p.onSel({ kind: "section", key: k }),
  });
  const price = p.priceFromInr > 0 ? formatInr(p.priceFromInr) : "Ask for the price";

  return (
    <div className={styles.device} aria-label="Phone preview">
      <div className={styles.screen}>
        <div className={styles.scroller}>
          <div className={styles.pvBar}>
            <span>discovr</span>
          </div>
          <button {...hit("photos")} aria-label="Edit photos">
            {p.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
              <img className={styles.pvCover} src={p.coverUrl} alt="" width={370} height={314} />
            ) : (
              <div className={styles.pvNoCover}>Add photos</div>
            )}
          </button>
          <div className={styles.pvPad}>
            <button {...hit("basics")} aria-label="Edit title and verdict">
              <h3 className={styles.pvTitle}>{p.title || "Untitled listing"}</h3>
              {p.hostLabel ? <p className={styles.pvRow}>by {p.hostLabel}</p> : null}
              {p.verdict ? <p className={styles.pvVerdict}>{p.verdict}</p> : null}
            </button>
            <button {...hit("price")} aria-label="Edit price">
              <p className={styles.pvPrice}>
                From {price} {p.priceFromInr > 0 && p.priceUnit ? <span>{p.priceUnit}</span> : null}
              </p>
            </button>
            <button {...hit("place")} aria-label="Edit place">
              <p className={styles.pvRow}>{p.place || "Add a place"}</p>
            </button>
            <button {...hit("when")} aria-label="Edit hours">
              <p className={styles.pvRow}>{p.hours || "Add the hours"}</p>
            </button>
            <button {...hit("links")} aria-label="Edit links">
              <div className={styles.pvActions}>
                {["Call", "Directions", ...(p.hasInstagram ? ["Instagram"] : []), "Share"].map((l) => (
                  <div key={l}>
                    <span className={styles.pvCircle}>{l[0]}</span>
                    {l}
                  </div>
                ))}
              </div>
            </button>
            <div className={styles.pvStory}>
              {p.blocks.map((b, i) => {
                const isOn = p.sel?.kind === "block" && p.sel.index === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.pvHit} ${isOn ? styles.pvOn : ""}`}
                    onClick={() => p.onSel({ kind: "block", index: i })}
                    aria-label={`Edit story block ${i + 1}`}
                  >
                    <PreviewBlock block={b} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.pvBook} ${on("booking") ? styles.pvBookOn : ""}`}
          onClick={() => p.onSel({ kind: "section", key: "booking" })}
          aria-label="Edit booking bar"
        >
          <span>
            <span className={styles.pvBookFrom}>From</span>
            <span className={styles.pvBookPrice}>{price}</span>
          </span>
          <span className={styles.pvCta}>{p.bookLabel}</span>
        </button>
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
    default:
      return <p className={styles.pvMuted}>Unknown block</p>;
  }
}
