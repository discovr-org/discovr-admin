"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/shared/components/Input";
import { LayersIcon } from "@/shared/components/icons";
import { useToast } from "@/shared/components/Toast";
import { downloadCsv } from "@/features/listings/utils/csv";
import { hintRow, sheetHeader } from "@/features/listings/utils/listingSheet";
import { fetchHomeFeed, type HomeSection } from "@/features/home/utils/homeApi";
import { createCategory, deleteCategory, fetchCategories, saveCategoryWeights } from "../utils/categoryApi";
import { MAX_WEIGHT, MIN_WEIGHT, orderCategories, parseWeight, weightsAfterMove } from "../utils/weights";
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
  const [home, setHome] = useState<HomeSection[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load categories."));
  }, []);

  // Only used to settle ties the way the home page does; the list still works without it.
  useEffect(() => {
    fetchHomeFeed().then(setHome).catch(() => setHome([]));
  }, []);

  // The order the home page shows: heaviest first.
  const ordered = useMemo(() => orderCategories(rows ?? [], home), [rows, home]);

  /** Show the new weights at once, then save them. If saving fails, put the old ones back and say why. */
  async function applyWeights(changes: Array<{ id: string; weight: number }>) {
    if (changes.length === 0) return;
    const before = rows;
    setRows((cur) => (cur ?? []).map((c) => ({ ...c, weight: changes.find((x) => x.id === c.id)?.weight ?? c.weight })));
    try {
      setRows(await saveCategoryWeights(changes));
    } catch (err: unknown) {
      setRows(before);
      toast.error(err instanceof Error ? err.message : "Couldn't save the order.");
    }
  }

  const move = (from: number, to: number) => void applyWeights(weightsAfterMove(ordered, from, to));

  function commitWeight(c: Category) {
    const text = typed[c.id];
    setTyped((t) => {
      const rest = { ...t };
      delete rest[c.id];
      return rest;
    });
    if (text === undefined) return;
    const weight = parseWeight(text);
    if (weight === null) return void toast.error(`A weight is a whole number from ${MIN_WEIGHT} to ${MAX_WEIGHT}.`);
    if (weight !== c.weight) void applyWeights([{ id: c.id, weight }]);
  }

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
        <>
        <p className={`t-body-sm ${styles.hint}`}>
          The order of the rows on the home page. A higher weight ({MIN_WEIGHT} to {MAX_WEIGHT}) shows higher. Drag a row, or use the arrows, and the weights update for you. Equal weights keep the Home feed&apos;s order.
        </p>
        <ul className={styles.list}>
          {ordered.map((c, i) => (
            <li
              key={c.id}
              className={`${styles.item} ${dragId === c.id ? styles.dragging : ""} ${overId === c.id && dragId !== c.id ? styles.over : ""}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", c.id); // some browsers will not start a drag without data
                setDragId(c.id);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(c.id);
              }}
              onDrop={() => {
                const from = ordered.findIndex((x) => x.id === dragId);
                if (from >= 0) move(from, i);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <span className={styles.grip} aria-hidden="true" title="Drag to reorder">
                ⠿
              </span>
              <div className={styles.grow}>
                <Link href={`/categories/${c.id}`} className={styles.name}>
                  {c.name}
                </Link>
                <p className={`t-body-sm ${styles.hint}`}>
                  {c.listingCount ?? 0} listing{c.listingCount === 1 ? "" : "s"} · {c.layout.story?.length ?? 0} story blocks
                </p>
              </div>
              <div className={styles.order}>
                <button type="button" className={styles.arrow} aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ↑
                </button>
                <button type="button" className={styles.arrow} aria-label={`Move ${c.name} down`} disabled={i === ordered.length - 1} onClick={() => move(i, i + 1)}>
                  ↓
                </button>
                <label className={styles.weight}>
                  <span className="vh">Weight of {c.name}</span>
                  <input
                    className={styles.weightInput}
                    type="number"
                    inputMode="numeric"
                    min={MIN_WEIGHT}
                    max={MAX_WEIGHT}
                    step={1}
                    value={typed[c.id] ?? String(c.weight)}
                    onChange={(e) => setTyped((t) => ({ ...t, [c.id]: e.target.value }))}
                    onBlur={() => commitWeight(c)}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </label>
              </div>
              <div className={styles.actions}>
                <Button href={`/categories/${c.id}`} variant="secondary">
                  Edit layout
                </Button>
                <Button variant="secondary" onClick={() => downloadCsv(`${c.slug}-sheet.csv`, [sheetHeader(c.layout), hintRow(c.layout)])}>
                  Export sheet
                </Button>
                <Button href={`/listings/import?category=${c.id}`} variant="secondary">
                  Import listings
                </Button>
                <button type="button" className={styles.danger} disabled={(c.listingCount ?? 0) > 0} title={c.listingCount ? "Move its listings first" : "Delete"} onClick={() => onDelete(c)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
