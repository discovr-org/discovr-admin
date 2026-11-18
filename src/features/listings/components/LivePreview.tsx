"use client";

import { useEffect, useRef, useState } from "react";
import type { ExperienceAdminPatch } from "@/shared/utils/catalogApi";
import { GUEST_URL } from "@/shared/utils/constants";
import { previewExperienceAdmin } from "../utils/previewApi";
import styles from "../styles/ListingEditor.module.css";

export type PreviewEvents = {
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove: (from: string, to: string) => void;
  onRemove: (id: string) => void;
  onArrange: (on: boolean) => void;
  onAdd: () => void;
};

type Props = PreviewEvents & {
  id: string;
  /** The form as it is right now, unsaved changes included. */
  draft: ExperienceAdminPatch;
  selected: string | null;
  hover: string | null;
  arranging: boolean;
  /** Bumps when the selection came from Layers, so the phone scrolls to it. */
  scrollTo: { id: string; n: number } | null;
};

const W = 414;
const H = 868;

/** The real guest page in a phone frame, drawn from the draft. Every local change shows here. */
export function LivePreview({ id, draft, selected, hover, arranging, scrollTo, ...events }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const latest = useRef<unknown>(null);
  const ready = useRef(false);
  const handlers = useRef(events);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<"loading" | "updating" | "ok" | "error">("loading");
  const origin = GUEST_URL;
  const draftKey = JSON.stringify(draft);

  useEffect(() => {
    handlers.current = events;
  });

  const post = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(message, origin);
  const postState = () => post({ type: "pv:state", selected, hover, arranging });

  // Fit the phone to the column, like the prototype.
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientHeight - 36) / H, (el.clientWidth - 32) / W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Messages from the page: select, hover, drag, remove, hold-to-arrange.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { type?: string; id?: string | null; from?: string; to?: string; on?: boolean } | null;
      const h = handlers.current;
      if (m?.type === "pv:ready") {
        ready.current = true;
        if (latest.current) post({ type: "pv:data", experience: latest.current });
        postState();
      } else if (m?.type === "pv:select" && m.id) h.onSelect(m.id);
      else if (m?.type === "pv:hover") h.onHover(m.id ?? null);
      else if (m?.type === "pv:move" && m.from && m.to) h.onMove(m.from, m.to);
      else if (m?.type === "pv:remove" && m.id) h.onRemove(m.id);
      else if (m?.type === "pv:arrange") h.onArrange(m.on === true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- post/postState only read refs and props that change below
  }, [origin]);

  // Ask the API for the page this draft makes, a moment after the last change.
  useEffect(() => {
    const ctl = new AbortController();
    const t = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? s : "updating"));
      previewExperienceAdmin(id, JSON.parse(draftKey) as ExperienceAdminPatch, ctl.signal)
        .then((experience) => {
          latest.current = experience;
          setStatus("ok");
          if (ready.current) post({ type: "pv:data", experience });
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name !== "AbortError") setStatus("error");
        });
    }, 300);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- post reads refs only
  }, [id, draftKey]);

  useEffect(postState); // selection, hover and arrange mode follow the editor
  useEffect(() => {
    if (scrollTo) post({ type: "pv:scroll", id: scrollTo.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when n changes
  }, [scrollTo?.n]);

  return (
    <div className={styles.stageBody} ref={body}>
      <div className={styles.devwrap} style={{ width: W * scale, height: H * scale }}>
        <div className={styles.device} style={{ transform: `scale(${scale})` }} aria-label="Phone preview">
          <div className={styles.screen}>
            <div className={styles.sbar}>
              <span>9:41</span>
              <span className={styles.island} />
              <span className={styles.sicons} aria-hidden="true">
                ▂▄▆█ ◠ ▭
              </span>
            </div>
            <iframe ref={frame} className={styles.frame} title="Listing preview" src={`${origin}/preview/experience`} />
            <span className={styles.homeInd} />
          </div>
        </div>
      </div>
      {arranging ? (
        <button type="button" className={styles.arrangeAdd} aria-label="Add a widget" onClick={() => handlers.current.onAdd()}>
          +
        </button>
      ) : null}
      <p className={styles.previewStatus} role="status">
        {status === "error" ? "Preview couldn't update. Check the guest app is running." : status === "updating" ? "Updating…" : ""}
      </p>
    </div>
  );
}
