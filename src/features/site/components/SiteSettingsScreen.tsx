"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { SettingsIcon } from "@/shared/components/icons";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { fetchSite, saveSite, type SiteSettings } from "../utils/siteApi";
import { move } from "@/features/home/utils/homeApi";
import styles from "../styles/SiteSettingsScreen.module.css";

/** Words and links the guest app shows everywhere. Empty field = the built-in text. */
export function SiteSettingsScreen() {
  const toast = useToast();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSite()
      .then(setS)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load the settings."));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(patch: Partial<SiteSettings>) {
    setS((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  }

  async function onSave() {
    if (!s) return;
    setSaving(true);
    try {
      setS(await saveSite(s));
      setDirty(false);
      toast.success("Saved. The guest app updates within a minute.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return <EmptyState icon={<SettingsIcon />} title="Can't load the settings" text={`${error} If the site settings migration (023) hasn't been run yet, run it first.`} role="alert" />;
  }
  if (!s) return <p className={`t-body-sm ${styles.hint}`}>Loading…</p>;

  const links = s.footerLinks ?? [];
  const setLink = (i: number, patch: Partial<{ label: string; href: string }>) => change({ footerLinks: links.map((l, k) => (k === i ? { ...l, ...patch } : l)) });

  return (
    <div className={styles.screen}>
      <section className={styles.card}>
        <h2 className="t-title-sm">Home page</h2>
        <Input label="Tagline under the wordmark" value={s.tagline ?? ""} onChange={(e) => change({ tagline: e.target.value })} />
        <Input label="Search box hint" value={s.searchPlaceholder ?? ""} onChange={(e) => change({ searchPlaceholder: e.target.value })} />
      </section>

      <section className={styles.card}>
        <h2 className="t-title-sm">Footer</h2>
        <Input label="Line above the links" value={s.footerPromise ?? ""} onChange={(e) => change({ footerPromise: e.target.value })} />
        <ul className={styles.list}>
          {links.map((l, i) => (
            <li key={i} className={styles.item}>
              <div className={styles.grow}>
                <Input label="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
              </div>
              <div className={styles.grow}>
                <Input label="Link (/page or https://…)" value={l.href} onChange={(e) => setLink(i, { href: e.target.value })} />
              </div>
              <div className={styles.btns}>
                <button type="button" className={styles.ibtn} aria-label={`Move ${l.label} up`} disabled={i === 0} onClick={() => change({ footerLinks: move(links, i, -1) })}>
                  ↑
                </button>
                <button type="button" className={styles.ibtn} aria-label={`Move ${l.label} down`} disabled={i === links.length - 1} onClick={() => change({ footerLinks: move(links, i, 1) })}>
                  ↓
                </button>
                <button type="button" className={styles.ibtn} aria-label={`Remove ${l.label}`} onClick={() => change({ footerLinks: links.filter((_, k) => k !== i) })}>
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="secondary" onClick={() => change({ footerLinks: [...links, { label: "", href: "/" }] })}>
            Add link
          </Button>
        </div>
      </section>

      <div className={styles.bar}>
        <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
