"use client";

import { useEffect, useRef, useState } from "react";
import type { ExperienceAdminPatch } from "@/shared/utils/catalogApi";
import { Ic } from "./EditorIcon";
import { GUEST_URL } from "@/shared/utils/constants";
import { previewExperienceAdmin } from "../utils/previewApi";
import styles from "../styles/ListingEditor.module.css";

export type PreviewEvents = {
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove: (from: string, to: string, after: boolean) => void;
  onRemove: (id: string) => void;
  onArrange: (on: boolean) => void;
  onAdd: () => void;
};

type Props = PreviewEvents & {
  id: string;
  /** The form as it is right now, unsaved changes included. */
  draft: ExperienceAdminPatch;
  /** Changes when photos or menu pages change. They save on their own, so the draft alone would not notice. */
  mediaKey: string;
  selected: string | null;
  hover: string | null;
  arranging: boolean;
  /** Bumps when the selection came from Layers, so the phone scrolls to it. */
  scrollTo: { id: string; n: number } | null;
};

const W = 414;
const H = 868;

/** The real guest page in a phone frame, drawn from the draft. Every local change shows here. */
export function LivePreview({ id, draft, mediaKey, selected, hover, arranging, scrollTo, ...events }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const latest = useRef<unknown>(null);
  const ready = useRef(false);
  const handlers = useRef(events);
  const draftRef = useRef(draft);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<"loading" | "updating" | "ok" | "error">("loading");
  const origin = GUEST_URL;
  const draftKey = JSON.stringify(draft) + mediaKey;

  useEffect(() => {
    handlers.current = events;
    draftRef.current = draft;
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
      const m = e.data as { type?: string; id?: string | null; from?: string; to?: string; after?: boolean; on?: boolean } | null;
      const h = handlers.current;
      if (m?.type === "pv:ready") {
        ready.current = true;
        if (latest.current) post({ type: "pv:data", experience: latest.current });
        postState();
      } else if (m?.type === "pv:select" && m.id) h.onSelect(m.id);
      else if (m?.type === "pv:hover") h.onHover(m.id ?? null);
      else if (m?.type === "pv:move" && m.from && m.to) h.onMove(m.from, m.to, m.after === true);
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
      previewExperienceAdmin(id, draftRef.current, ctl.signal)
        .then((experience) => {
          latest.current = experience;
          setStatus("ok");
          if (ready.current) post({ type: "pv:data", experience });
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name !== "AbortError") setStatus("error");
        });
    }, 150);
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
                <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 1 10.2 10.2 0 0 0 .9 3.7L2 4.9a8.6 8.6 0 0 1 6-2.4zm0 3.3c1.4 0 2.7.5 3.7 1.4l1.1-1.2A7 7 0 0 0 8 4.3 7 7 0 0 0 3.2 6l1.1 1.2c1-.9 2.3-1.4 3.7-1.4zM8 9a2 2 0 0 0-1.4.6L8 11.2l1.4-1.6A2 2 0 0 0 8 9z" /></svg>
                <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" /><rect x="24.5" y="4.5" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4" /></svg>
              </span>
            </div>
            {arranging ? (
              <div className={styles.jbar}>
                <button type="button" className={styles.jAdd} aria-label="Add a widget" title="Add widget" onClick={() => handlers.current.onAdd()}>
                  <Ic name="plus" size={18} sw={2.5} />
                </button>
                <button type="button" onClick={() => handlers.current.onArrange(false)}>
                  Done
                </button>
              </div>
            ) : null}
            <iframe ref={frame} className={styles.frame} title="Listing preview" src={`${origin}/preview/experience`} />
            <span className={styles.homeInd} />
          </div>
        </div>
      </div>
      <p className={styles.previewStatus} role="status">
        {status === "error" ? "Preview couldn't update. Check the guest app is running." : status === "updating" ? "Updating…" : ""}
      </p>
    </div>
  );
}
