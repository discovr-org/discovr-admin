"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/shared/components/Input";
import { LayersIcon } from "@/shared/components/icons";
import { useToast } from "@/shared/components/Toast";
import { createCategory, deleteCategory, fetchCategories } from "../utils/categoryApi";
import { TEMPLATES, type Category } from "../utils/layout";
import styles from "../styles/CategoriesScreen.module.css";

/** Categories: each one fixes a page layout. Listings in it only fill in their content. */
export function CategoriesScreen() {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("trip");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load categories."));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return void toast.error("Give the category a name.");
    setBusy(true);
    try {
      const layout = TEMPLATES.find((t) => t.id === template)?.layout ?? { story: [] };
      const created = await createCategory({ name: name.trim(), layout });
      router.push(`/categories/${created.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't create.");
      setBusy(false);
    }
  }

  async function onDelete(c: Category) {
    if (!window.confirm(`Delete the ${c.name} category?`)) return;
    try {
      await deleteCategory(c.id);
      setRows((r) => (r ?? []).filter((x) => x.id !== c.id));
      toast.success("Deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete.");
    }
  }

  if (error) {
    return <EmptyState icon={<LayersIcon />} title="Can't load categories" text={`${error} If the categories migration hasn't been run yet, run it first.`} role="alert" />;
  }

  return (
    <div className={styles.screen}>
      <form className={styles.create} onSubmit={onCreate}>
        <h2 className={`t-title-sm ${styles.title}`}>New category</h2>
        <p className={`t-body-sm ${styles.hint}`}>A category fixes the page layout. Every listing in it fills in the same blocks.</p>
        <div className={styles.row}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Water sports" />
          <label className={styles.field}>
            <span className={styles.label}>Start from</span>
            <select className={styles.select} value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creating…" : "Create category"}
          </Button>
        </div>
        <p className={`t-body-sm ${styles.hint}`}>{TEMPLATES.find((t) => t.id === template)?.hint}</p>
      </form>

      {rows === null ? (
        <p className={`t-body-sm ${styles.hint}`}>Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={<LayersIcon />} title="No categories yet" text="Make one above, then pick it when you add a listing." />
      ) : (
        <ul className={styles.list}>
          {rows.map((c) => (
            <li key={c.id} className={styles.item}>
              <div>
                <Link href={`/categories/${c.id}`} className={styles.name}>
                  {c.name}
                </Link>
                <p className={`t-body-sm ${styles.hint}`}>
                  {c.listingCount ?? 0} listing{c.listingCount === 1 ? "" : "s"} · {c.layout.story?.length ?? 0} story blocks
                </p>
              </div>
              <div className={styles.actions}>
                <Button href={`/categories/${c.id}`} variant="secondary">
                  Edit layout
                </Button>
                <button type="button" className={styles.danger} disabled={(c.listingCount ?? 0) > 0} title={c.listingCount ? "Move its listings first" : "Delete"} onClick={() => onDelete(c)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
