"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import type { Category } from "@/features/categories/utils/layout";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import {
  createExperienceAdmin,
  fetchHosts,
  patchExperienceAdmin,
  uploadContentImageAdmin,
  uploadExperiencePhotoAdmin,
  uploadMenuPageAdmin,
  type CatalogHostSummary,
} from "@/shared/utils/catalogApi";
import { useCatalog } from "@/shared/utils/useCatalog";
import { buildPatch, type FormState } from "./EditListingScreen";
import { downloadCsv, parseCsv } from "../utils/csv";
import { formFromRecord, hintRow, readSheet, sheetGuide, sheetHeader, type SheetFiles } from "../utils/listingSheet";
import styles from "../styles/ImportListings.module.css";

const MAX_ROWS = 200;

type Row = { n: number; rec: Record<string, string>; form: FormState; issues: string[]; files: SheetFiles };
type Result = { n: number; title: string; id?: string; error?: string; warning?: string };

/**
 * Make many listings from a sheet. With `categoryId` the sheet is that category's layout and every row joins it;
 * without, the sheet has every column and a `category` column.
 */
export function ImportListingsScreen({ categoryId: fixedCategoryId }: { categoryId?: string }) {
  const toast = useToast();
  const { experiences, reload } = useCatalog();
  const [hosts, setHosts] = useState<CatalogHostSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickedCategoryId, setPickedCategoryId] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    fetchHosts().then((r) => setHosts(r.hosts)).catch(() => setHosts([]));
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const categoryId = fixedCategoryId ?? pickedCategoryId;
  const category = categories.find((c) => c.id === categoryId);
  const layout = category?.layout;
  const ctx = { hosts, categories };

  const photoByName = useMemo(() => new Map(photos.map((f) => [f.name.toLowerCase(), f])), [photos]);
  const taken = useMemo(() => new Set((experiences ?? []).map((x) => x.slug)), [experiences]);

  // What is wrong with each row now: what the sheet said, plus slug clashes. Photos that weren't added are only a note: the listing is still made without them.
  const checked = useMemo(() => {
    const seen = new Map<string, number>();
    (rows ?? []).forEach((r) => seen.set(r.form.slug, (seen.get(r.form.slug) ?? 0) + 1));
    return (rows ?? []).map((r) => {
      const extra: string[] = [];
      if (r.form.slug && taken.has(r.form.slug)) extra.push(`slug "${r.form.slug}" is already used`);
      else if (r.form.slug && (seen.get(r.form.slug) ?? 0) > 1) extra.push(`slug "${r.form.slug}" appears twice in the sheet`);
      const missing = [...r.files.gallery, ...r.files.menu, ...r.files.story].filter((name) => !photoByName.has(name.toLowerCase()));
      return { ...r, issues: [...r.issues, ...extra], missing };
    });
  }, [rows, taken, photoByName]);
  const ok = checked.filter((r) => r.issues.length === 0);
  const problems = checked.filter((r) => r.issues.length > 0);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResults(null);
    if (!file) return;
    setFileName(file.name);
    const { records, unknown: extra } = readSheet(parseCsv(await file.text()));
    setUnknown(extra);
    if (!records.length) {
      setRows(null);
      return void toast.error("No rows found. The first row must be the header.");
    }
    if (records.length > MAX_ROWS) {
      setRows(null);
      return void toast.error(`That sheet has ${records.length} rows. Upload ${MAX_ROWS} or fewer at a time.`);
    }
    setRows(records.map((rec, i) => ({ n: i + 2, rec, ...formFromRecord(rec, ctx, categoryId) })));
  }

  async function onCreate() {
    setBusy(true);
    const out: Result[] = [];
    for (const { n, form: base, files: wanted, missing } of ok) {
      const title = base.title;
      const have = (names: string[]) => names.filter((name) => photoByName.has(name.toLowerCase()));
      const files = { gallery: have(wanted.gallery), menu: have(wanted.menu), story: have(wanted.story) };
      const skipped = missing.length ? `photo${missing.length === 1 ? "" : "s"} skipped (file not added): ${missing.join(", ")}` : undefined;
      try {
        // Story photos go up first; they live inside the listing's content.
        const story = [];
        for (const name of files.story) story.push({ src: (await uploadContentImageAdmin(photoByName.get(name.toLowerCase())!)).url, alt: title });
        const form: FormState = story.length ? { ...base, baseContent: { ...base.baseContent, storyPhotos: story } } : base;

        const created = await createExperienceAdmin({
          title: form.title,
          slug: form.slug,
          hostId: form.hostId || null,
          status: "draft",
          about: "",
          placeName: form.placeName || "To be added",
          placeNeighborhood: form.placeNeighborhood || "Goa",
          placeLat: Number(form.placeLat) || 15.49,
          placeLng: Number(form.placeLng) || 73.82,
        });
        await patchExperienceAdmin(created.id, buildPatch(form));

        let warning: string | undefined;
        try {
          for (const [i, name] of files.gallery.entries()) await uploadExperiencePhotoAdmin(created.id, photoByName.get(name.toLowerCase())!, { alt: title, cover: i === 0 });
          for (const [i, name] of files.menu.entries()) await uploadMenuPageAdmin(created.id, photoByName.get(name.toLowerCase())!, { label: `Page ${i + 1}`, alt: title });
        } catch (err: unknown) {
          warning = `a photo didn't upload: ${err instanceof Error ? err.message : "upload failed"}`;
        }
        out.push({ n, title, id: created.id, warning: [warning, skipped].filter(Boolean).join("; ") || undefined });
      } catch (err: unknown) {
        out.push({ n, title, error: err instanceof Error ? err.message : "Couldn't create." });
      }
      setResults([...out]);
    }
    setBusy(false);
    void reload();
    const made = out.filter((r) => r.id).length;
    toast[made === out.length ? "success" : "error"](`${made} of ${out.length} listings created.`);
  }

  /** The rows that didn't make it, with what went wrong, in the same columns, ready to fix and upload again. */
  function downloadProblems() {
    const header = sheetHeader(layout);
    const failedCreate = new Map((results ?? []).filter((r) => r.error).map((r) => [r.n, r.error!]));
    const bad = [...problems.map((r) => [r, r.issues.join("; ")] as const), ...checked.filter((r) => failedCreate.has(r.n)).map((r) => [r, failedCreate.get(r.n)!] as const)];
    downloadCsv("rows-to-fix.csv", [[...header, "error"], ...bad.map(([r, why]) => [...header.map((k) => r.rec[k] ?? ""), why])]);
  }

  const failedCount = problems.length + (results ?? []).filter((r) => r.error).length;

  return (
    <div className={styles.screen}>
      <section className={styles.card}>
        <h2 className={`t-title-sm ${styles.title}`}>1. Get the sheet</h2>
        <p className={`t-body-sm ${styles.hint}`}>
          {category ? `This sheet has the columns the ${category.name} layout needs.` : "Download the template, fill in one row per listing, and save it as CSV."} Photos go in as file names; you add the files in step 2.
        </p>
        <div className={styles.row}>
          {fixedCategoryId ? (
            <p className="t-body-sm">Every listing joins <strong>{category?.name ?? "this category"}</strong>.</p>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>Layout for every row (a row can override it)</span>
              <select className={styles.select} value={pickedCategoryId} onChange={(e) => setPickedCategoryId(e.target.value)}>
                <option value="">None (own layout)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button variant="secondary" onClick={() => downloadCsv(category ? `${category.slug}-sheet.csv` : "discovr-listings-template.csv", [sheetHeader(layout), hintRow(layout)])} disabled={Boolean(fixedCategoryId) && !category}>
            Download sheet (CSV)
          </Button>
        </div>
        <details>
          <summary className="t-body-sm">What goes in each column</summary>
          <dl className={styles.guide}>
            {sheetGuide(layout).map((g) => (
              <div key={g.key}>
                <dt className="t-body-sm">{g.key}</dt>
                <dd className="t-body-sm">{g.hint}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      <section className={styles.card}>
        <h2 className={`t-title-sm ${styles.title}`}>2. Upload it</h2>
        <label className={styles.field}>
          <span className={styles.label}>The filled-in sheet (CSV)</span>
          <input className={styles.file} type="file" accept=".csv,text/csv" onChange={(e) => void onFile(e)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Photo files named in the sheet (optional, a missing one is skipped)</span>
          <input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} />
        </label>
        <p className={`t-body-sm ${styles.hint}`}>
          {photos.length ? `${photos.length} photo file${photos.length === 1 ? "" : "s"} added. ` : ""}Nothing is created until you tap Create. Up to {MAX_ROWS} rows at a time.
        </p>
        {unknown.length ? <p className={`t-body-sm ${styles.hint}`} role="status">Ignored columns: {unknown.join(", ")}.</p> : null}
      </section>

      {rows ? (
        <section className={styles.card}>
          <h2 className={`t-title-sm ${styles.title}`}>3. Check {fileName}</h2>
          <p className={`t-body-sm ${styles.hint}`}>
            {ok.length} ready{problems.length ? `, ${problems.length} with problems (skipped)` : ""}. Photos that aren&apos;t added are left out; the listing is still created.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Title</th>
                  <th>Host</th>
                  <th>Layout</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {checked.map((r) => (
                  <tr key={r.n}>
                    <td>{r.n}</td>
                    <td className={r.issues.length ? styles.bad : undefined}>{r.form.title || "(no title)"}</td>
                    <td>{hosts.find((h) => h.id === r.form.hostId)?.businessName ?? "No host"}</td>
                    <td>{categories.find((c) => c.id === r.form.categoryId)?.name ?? "Own layout"}</td>
                    <td>{r.form.status}</td>
                    <td className={styles.issue}>
                      {r.issues.join("; ")}
                      {r.missing.length ? `${r.issues.length ? " · " : ""}photo${r.missing.length === 1 ? "" : "s"} not added, will be skipped: ${r.missing.join(", ")}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.row}>
            <Button variant="primary" onClick={() => void onCreate()} disabled={busy || ok.length === 0 || results !== null}>
              {busy ? "Creating…" : `Create ${ok.length} listing${ok.length === 1 ? "" : "s"}`}
            </Button>
            {failedCount ? (
              <Button variant="secondary" onClick={downloadProblems}>
                Download rows to fix ({failedCount})
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {results ? (
        <section className={styles.card}>
          <h2 className={`t-title-sm ${styles.title}`}>Result</h2>
          <ul className={styles.links}>
            {results.map((r) => (
              <li key={r.n} className="t-body-sm">
                Row {r.n}:{" "}
                {r.id ? (
                  <>
                    <Link href={`/listings/${r.id}`}>{r.title}</Link>
                    {r.warning ? <span className={styles.issue}> — {r.warning}</span> : null}
                  </>
                ) : (
                  <span className={styles.bad}>{r.title}: {r.error}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
