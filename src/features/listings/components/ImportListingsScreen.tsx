"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import type { Category } from "@/features/categories/utils/layout";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { createExperienceAdmin, fetchHosts, patchExperienceAdmin, type CatalogHostSummary } from "@/shared/utils/catalogApi";
import { useCatalog } from "@/shared/utils/useCatalog";
import { buildPatch, type FormState } from "./EditListingScreen";
import { downloadCsv, parseCsv } from "../utils/csv";
import { formFromRecord, readSheet, SHEET_GUIDE, SHEET_HEADER } from "../utils/listingSheet";
import styles from "../styles/ImportListings.module.css";

type Row = { n: number; form: FormState; issues: string[] };
type Result = { n: number; title: string; id?: string; error?: string };

/** Make many listings from a sheet: pick the layout, download the template, fill it in, upload it, check it, create. */
export function ImportListingsScreen() {
  const toast = useToast();
  const { reload } = useCatalog();
  const [hosts, setHosts] = useState<CatalogHostSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    fetchHosts().then((r) => setHosts(r.hosts)).catch(() => setHosts([]));
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const ctx = { hosts, categories };
  const ok = (rows ?? []).filter((r) => r.issues.length === 0);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResults(null);
    if (!file) return;
    setFileName(file.name);
    const { records, unknown: extra } = readSheet(parseCsv(await file.text()));
    setUnknown(extra);
    setRows(records.map((rec, i) => ({ n: i + 2, ...formFromRecord(rec, ctx, categoryId) })));
    if (!records.length) toast.error("No rows found. The first row must be the header.");
  }

  async function onCreate() {
    setBusy(true);
    const out: Result[] = [];
    for (const { n, form } of ok) {
      try {
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
        out.push({ n, title: form.title, id: created.id });
      } catch (err: unknown) {
        out.push({ n, title: form.title, error: err instanceof Error ? err.message : "Couldn't create." });
      }
      setResults([...out]);
    }
    setBusy(false);
    void reload();
    const made = out.filter((r) => r.id).length;
    toast[made === out.length ? "success" : "error"](`${made} of ${out.length} listings created.`);
  }

  return (
    <div className={styles.screen}>
      <section className={styles.card}>
        <h2 className={`t-title-sm ${styles.title}`}>1. Get the sheet</h2>
        <p className={`t-body-sm ${styles.hint}`}>Download the template, fill in one row per listing, and save it as CSV. Photos aren&apos;t in the sheet; add them in each listing afterwards.</p>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Layout for every row (a row can override it)</span>
            <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None (own layout)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={() => downloadCsv("discovr-listings-template.csv", [SHEET_HEADER])}>
            Download template (CSV)
          </Button>
        </div>
        <details>
          <summary className="t-body-sm">What goes in each column</summary>
          <dl className={styles.guide}>
            {SHEET_GUIDE.map((g) => (
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
        <input className={styles.file} type="file" accept=".csv,text/csv" onChange={(e) => void onFile(e)} aria-label="CSV file" />
        <p className={`t-body-sm ${styles.hint}`}>Nothing is created until you tap Create.</p>
        {unknown.length ? <p className={`t-body-sm ${styles.hint}`} role="status">Ignored columns: {unknown.join(", ")}.</p> : null}
      </section>

      {rows ? (
        <section className={styles.card}>
          <h2 className={`t-title-sm ${styles.title}`}>3. Check {fileName}</h2>
          <p className={`t-body-sm ${styles.hint}`}>
            {ok.length} ready{rows.length - ok.length ? `, ${rows.length - ok.length} with problems (skipped)` : ""}.
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
                  <th>Problems</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n}>
                    <td>{r.n}</td>
                    <td className={r.issues.length ? styles.bad : undefined}>{r.form.title || "(no title)"}</td>
                    <td>{hosts.find((h) => h.id === r.form.hostId)?.businessName ?? "No host"}</td>
                    <td>{categories.find((c) => c.id === r.form.categoryId)?.name ?? "Own layout"}</td>
                    <td>{r.form.status}</td>
                    <td className={styles.issue}>{r.issues.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button variant="primary" onClick={() => void onCreate()} disabled={busy || ok.length === 0 || results !== null}>
              {busy ? "Creating…" : `Create ${ok.length} listing${ok.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </section>
      ) : null}

      {results ? (
        <section className={styles.card}>
          <h2 className={`t-title-sm ${styles.title}`}>Result</h2>
          <ul className={styles.links}>
            {results.map((r) => (
              <li key={r.n} className="t-body-sm">
                Row {r.n}: {r.id ? <Link href={`/listings/${r.id}`}>{r.title}</Link> : <span className={styles.bad}>{r.title}: {r.error}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
