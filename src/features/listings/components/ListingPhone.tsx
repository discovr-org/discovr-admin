"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { formatInr } from "@/shared/utils/formatInr";
import type { SectionState } from "../utils/pageLayout";
import type { StoryBlock } from "../utils/storyBlocks";
import styles from "../styles/ListingEditor.module.css";
import type { Sel } from "./ListingLayers";

export type PhoneData = {
  title: string;
  verdict: string;
  hostLabel: string;
  coverUrl?: string;
  priceFromInr: number;
  priceUnit: string;
  place: string;
  hours: string;
  bestTime: string;
  about: string;
  menuPages: number;
  hasPolicy: boolean;
  hasInstagram: boolean;
  bookLabel: string;
};

type Props = {
  data: PhoneData;
  order: SectionState[];
  blocks: StoryBlock[];
  showMore: boolean;
  showBooking: boolean;
  sel: Sel;
  onSel: (s: Sel) => void;
  arranging: boolean;
  onArrange: (on: boolean) => void;
  onMoveSection: (from: number, to: number) => void;
  onMoveBlock: (from: number, to: number) => void;
  onDropWidget: (widget: number, at: number) => void;
};

/** A rough phone view of the guest page. Click a part to edit it; hold one (or press Arrange) to drag it. */
export function ListingPhone(p: Props) {
  const { data: d } = p;
  const [dragSec, setDragSec] = useState<number | null>(null);
  const [dragBlock, setDragBlock] = useState<number | null>(null);
  const hold = useRef<number>(0);
  const partOn = (id: string) => p.sel?.kind === "part" && p.sel.id === id;
  const price = d.priceFromInr > 0 ? formatInr(d.priceFromInr) : "Ask for the price";
  const end = () => {
    setDragSec(null);
    setDragBlock(null);
  };

  const part = (id: string, label: string, children: ReactNode, drag?: number) => (
    <button
      key={id}
      type="button"
      aria-label={`Edit ${label}`}
      className={`${styles.pvHit} ${partOn(id) ? styles.pvOn : ""} ${p.arranging && drag !== undefined ? styles.pvJig : ""}`}
      draggable={p.arranging && drag !== undefined}
      onClick={() => p.onSel({ kind: "part", id: id as never })}
      onDragStart={() => drag !== undefined && setDragSec(drag)}
      onDragOver={(e) => {
        if (dragSec !== null && drag !== undefined) e.preventDefault();
      }}
      onDrop={() => {
        if (dragSec !== null && drag !== undefined) p.onMoveSection(dragSec, drag);
        end();
      }}
      onDragEnd={end}
    >
      {children}
    </button>
  );

  const story = () => {
    const rows: Array<Array<[StoryBlock, number]>> = [];
    for (let i = 0; i < p.blocks.length; i++) {
      const b = p.blocks[i];
      if (b.show === false) continue;
      let next = i + 1;
      while (next < p.blocks.length && p.blocks[next].show === false) next++;
      if (b.size === "half" && p.blocks[next]?.size === "half") {
        rows.push([[b, i], [p.blocks[next], next]]);
        i = next;
      } else rows.push([[b, i]]);
    }
    const drop = (e: DragEvent, at: number) => {
      const w = e.dataTransfer.getData("text/widget");
      if (w) p.onDropWidget(Number(w), at);
      else if (dragBlock !== null) p.onMoveBlock(dragBlock, at);
      end();
    };
    return (
      <div
        className={styles.pvStory}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => drop(e, p.blocks.length)}
      >
        {p.blocks.length === 0 && d.about.trim() ? <p className={styles.pvP}>{d.about}</p> : null}
        {rows.map((row) => (
          <div key={row[0][1]} className={row.length === 2 ? styles.pvPair : undefined}>
            {row.map(([b, i]) => (
              <button
                key={i}
                type="button"
                aria-label={`Edit story block ${i + 1}`}
                className={`${styles.pvHit} ${p.sel?.kind === "block" && p.sel.index === i ? styles.pvOn : ""} ${p.arranging ? styles.pvJig : ""}`}
                draggable={p.arranging}
                onClick={() => p.onSel({ kind: "block", index: i })}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragBlock(i);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  drop(e, i);
                }}
                onDragEnd={end}
              >
                <PreviewBlock block={b} />
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const body: Record<SectionState["id"], () => ReactNode> = {
    title: () => (
      <>
        <h3 className={styles.pvTitle}>{d.title || "Untitled listing"}</h3>
        {d.hostLabel ? <p className={styles.pvRow}>by {d.hostLabel}</p> : null}
      </>
    ),
    info: () => (
      <>
        <p className={styles.pvPrice}>
          From {price} {d.priceFromInr > 0 && d.priceUnit ? <span>{d.priceUnit}</span> : null}
        </p>
        <p className={styles.pvRow}>{d.place || "Add a place"}</p>
        <p className={styles.pvRow}>{d.hours || "Add the hours"}</p>
        {d.bestTime ? <p className={styles.pvRow}>Best time: {d.bestTime}</p> : null}
      </>
    ),
    verdict: () => <p className={styles.pvVerdictBox}>{d.verdict || "Add the one-line verdict"}</p>,
    actions: () => (
      <div className={styles.pvActions}>
        {["Call", "Directions", ...(d.hasInstagram ? ["Instagram"] : []), "Share"].map((l) => (
          <div key={l}>
            <span className={styles.pvCircle}>{l[0]}</span>
            {l}
          </div>
        ))}
      </div>
    ),
    about: () => null,
    menu: () => (d.menuPages > 0 ? <p className={styles.pvH2}>Menu · {d.menuPages} {d.menuPages === 1 ? "page" : "pages"}</p> : null),
    policy: () => (d.hasPolicy ? <p className={styles.pvH2}>Booking and cancellation policy</p> : null),
    host: () => <p className={styles.pvH2}>Hosted by {d.hostLabel || "—"}</p>,
    reviews: () => null,
  };

  return (
    <div className={styles.device} aria-label="Phone preview">
      <div className={styles.screen}>
        <div
          className={styles.scroller}
          onPointerDown={(e) => {
            if (p.arranging || e.button !== 0) return;
            hold.current = window.setTimeout(() => p.onArrange(true), 420);
          }}
          onPointerUp={() => clearTimeout(hold.current)}
          onPointerLeave={() => clearTimeout(hold.current)}
          onPointerMove={() => clearTimeout(hold.current)}
        >
          <div className={styles.pvBar}>
            <span>discovr</span>
            {p.arranging ? (
              <button type="button" className={styles.pvDone} onClick={() => p.onArrange(false)}>
                Done
              </button>
            ) : null}
          </div>
          {part(
            "gallery",
            "photos",
            d.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
              <img className={styles.pvCover} src={d.coverUrl} alt="" width={370} height={314} />
            ) : (
              <div className={styles.pvNoCover}>Add photos</div>
            ),
          )}
          <div className={styles.pvPad}>
            {p.order.map((s, i) => {
              if (!s.show) return null;
              if (s.id === "about")
                return (
                  <div key="about" className={`${styles.pvAbout} ${partOn("about") ? styles.pvOn : ""}`}>
                    {part("about", "About", <h4 className={styles.pvH1}>About</h4>, i)}
                    {story()}
                  </div>
                );
              const content = body[s.id]();
              if (!content) return null;
              return part(s.id, s.id, content, i);
            })}
            {p.showMore ? part("more", "More in Goa", <h4 className={styles.pvH1}>More in Goa</h4>) : null}
          </div>
        </div>
        {p.showBooking ? (
          <button
            type="button"
            className={`${styles.pvBook} ${partOn("booking") ? styles.pvBookOn : ""}`}
            onClick={() => p.onSel({ kind: "part", id: "booking" })}
            aria-label="Edit booking bar"
          >
            <span>
              <span className={styles.pvBookFrom}>From</span>
              <span className={styles.pvBookPrice}>{price}</span>
            </span>
            <span className={styles.pvCta}>{d.bookLabel}</span>
          </button>
        ) : null}
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

/** Small live preview of a widget, for the Widgets tab. */
export function WidgetPreview({ block }: { block: StoryBlock }) {
  return (
    <div className={styles.wPrev} aria-hidden="true">
      <div className={styles.wPrevInner}>
        <PreviewBlock block={block} />
      </div>
    </div>
  );
}
