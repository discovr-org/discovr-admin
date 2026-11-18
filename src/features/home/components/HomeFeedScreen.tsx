"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListIcon } from "@/shared/components/icons";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { useCatalog } from "@/shared/utils/useCatalog";
import { fetchHomeFeed, move, saveHomeFeed, type HomeSection } from "../utils/homeApi";
import styles from "../styles/HomeFeedScreen.module.css";

/** The guest home page: its sections, how each one draws, and which listings show in it, in order. */
export function HomeFeedScreen() {
  const toast = useToast();
  const { experiences } = useCatalog();
  const [sections, setSections] = useState<HomeSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHomeFeed()
      .then(setSections)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load the home feed."));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const titleOf = (slug: string) => experiences?.find((x) => x.slug === slug)?.title ?? slug;
  const live = (experiences ?? []).filter((x) => x.status === "published");

  function change(next: HomeSection[]) {
    setSections(next);
    setDirty(true);
  }
  const edit = (i: number, patch: Partial<HomeSection>) => change((sections ?? []).map((s, k) => (k === i ? { ...s, ...patch } : s)));

  async function onSave() {
    if (!sections) return;
    setSaving(true);
    try {
      setSections(await saveHomeFeed(sections));
      setDirty(false);
      toast.success("Saved. The home page updates within a minute.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return <EmptyState icon={<ListIcon />} title="Can't load the home feed" text={`${error} If the home feed migration (022) hasn't been run yet, run it first.`} role="alert" />;
  }
  if (!sections) return <p className={`t-body-sm ${styles.hint}`}>Loading…</p>;

  return (
    <div className={styles.screen}>
      <p className={`t-body-sm ${styles.hint}`}>Sections show top to bottom. A listing shows once: the first section that has it keeps it. A section with one listing shows it full width.</p>

      {sections.map((s, i) => (
        <section key={s.id} className={styles.card}>
          <div className={styles.head}>
            <div className={styles.grow}>
              <Input label="Section title" value={s.title} onChange={(e) => edit(i, { title: e.target.value })} />
            </div>
            <select className={styles.select} aria-label="Layout" value={s.layout} onChange={(e) => edit(i, { layout: e.target.value as HomeSection["layout"] })}>
              <option value="rail">Swipe row</option>
              <option value="stack">Big cards</option>
            </select>
            <div className={styles.btns}>
              <button type="button" className={styles.ibtn} aria-label="Move section up" disabled={i === 0} onClick={() => change(move(sections, i, -1))}>
                ↑
              </button>
              <button type="button" className={styles.ibtn} aria-label="Move section down" disabled={i === sections.length - 1} onClick={() => change(move(sections, i, 1))}>
                ↓
              </button>
              <button
                type="button"
                className={styles.ibtn}
                aria-label="Delete section"
                onClick={() => window.confirm(`Delete "${s.title}"?`) && change(sections.filter((_, k) => k !== i))}
              >
                ×
              </button>
            </div>
          </div>

          <ul className={styles.list}>
            {s.slugs.map((slug, n) => (
              <li key={slug} className={styles.item}>
                <span className="t-body">{titleOf(slug)}</span>
                <div className={styles.btns}>
                  <button type="button" className={styles.ibtn} aria-label={`Move ${titleOf(slug)} up`} disabled={n === 0} onClick={() => edit(i, { slugs: move(s.slugs, n, -1) })}>
                    ↑
                  </button>
                  <button type="button" className={styles.ibtn} aria-label={`Move ${titleOf(slug)} down`} disabled={n === s.slugs.length - 1} onClick={() => edit(i, { slugs: move(s.slugs, n, 1) })}>
                    ↓
                  </button>
                  <button type="button" className={styles.ibtn} aria-label={`Remove ${titleOf(slug)}`} onClick={() => edit(i, { slugs: s.slugs.filter((x) => x !== slug) })}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <select
            className={styles.select}
            aria-label={`Add a listing to ${s.title}`}
            value=""
            onChange={(e) => e.target.value && edit(i, { slugs: [...s.slugs, e.target.value] })}
          >
            <option value="">+ Add a listing</option>
            {live
              .filter((x) => !s.slugs.includes(x.slug))
              .map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.title}
                </option>
              ))}
          </select>
        </section>
      ))}

      <div className={styles.bar}>
        <Button variant="secondary" onClick={() => change([...sections, { id: `section-${sections.length + 1}`, title: "New section", layout: "rail", slugs: [] }])}>
          Add section
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
