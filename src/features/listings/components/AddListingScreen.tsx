"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import {
  createExperienceAdmin,
  fetchExperienceAdmin,
  fetchHosts,
  patchExperienceAdmin,
  type CatalogExperienceAdmin,
  type CatalogHostSummary,
  type ExperienceContent,
} from "@/shared/utils/catalogApi";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import type { Category } from "@/features/categories/utils/layout";
import { useCatalog } from "@/shared/utils/useCatalog";
import { useToast } from "@/shared/components/Toast";
import styles from "../styles/EditListingScreen.module.css";

function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** What a copy keeps of the source's content: layout, text and settings. Links, phones and meeting points belong to the source. */
const NOT_COPIED = ["links", "phones", "aka", "meetingPoint", "droppingPoint", "locationLabel"];

function copyContent(content: ExperienceContent | undefined): ExperienceContent {
  const copy = structuredClone(content ?? {});
  for (const key of NOT_COPIED) delete copy[key];
  return copy;
}

export function AddListingScreen() {
  const toast = useToast();
  const router = useRouter();
  const [hosts, setHosts] = useState<CatalogHostSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [hostId, setHostId] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    "draft",
  );
  const [verdict, setVerdict] = useState("");
  const [about, setAbout] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeNeighborhood, setPlaceNeighborhood] = useState("");
  const [placeLat, setPlaceLat] = useState("15.49");
  const [placeLng, setPlaceLng] = useState("73.82");
  const [priceFromInr, setPriceFromInr] = useState("0");
  const { experiences } = useCatalog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState<CatalogExperienceAdmin | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  /** Pick a listing to start from, or none for a blank one. The page layout and text come along. */
  async function chooseSource(id: string) {
    if (!id) {
      setSource(null);
      return;
    }
    setLoadingSource(true);
    try {
      const row = await fetchExperienceAdmin(id);
      setSource(row);
      setVerdict(row.verdict ?? "");
      setAbout(row.about ?? "");
      setPlaceName(row.placeName);
      setPlaceNeighborhood(row.placeNeighborhood);
      setPlaceLat(String(row.placeLat));
      setPlaceLng(String(row.placeLng));
      setPriceFromInr(String(row.priceFromInr));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't load that listing.");
    } finally {
      setLoadingSource(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchHosts()
      .then((body) => {
        if (cancelled) return;
        setHosts(body.hosts);
        if (body.hosts[0]) setHostId(body.hosts[0].id);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load hosts.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Before the categories migration the list can't load; the page then works as it always has.
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    if (!hostId) {
      toast.error("Pick a host.");
      return;
    }
    if (!placeName.trim() || !placeNeighborhood.trim()) {
      toast.error("Place name and neighborhood are required.");
      return;
    }
    if (status === "published" && !verdict.trim()) {
      toast.error("Active listings need a one-line verdict.");
      return;
    }

    setSaving(true);
    try {
      const created = await createExperienceAdmin({
        title: title.trim(),
        slug: slug.trim() || slugFromTitle(title),
        hostId,
        status,
        verdict: verdict.trim() || null,
        about,
        placeName: placeName.trim(),
        placeNeighborhood: placeNeighborhood.trim(),
        placeLat: Number(placeLat) || 0,
        placeLng: Number(placeLng) || 0,
        priceFromInr: Math.max(0, Math.round(Number(priceFromInr) || 0)),
        ...(categoryId ? { categoryId } : {}),
      } as Parameters<typeof createExperienceAdmin>[0]);
      if (source && !categoryId) {
        // Create takes only the basics, so the layout, hours, policy and tags go in right after.
        try {
          await patchExperienceAdmin(created.id, {
            durationMinutes: source.durationMinutes,
            groupSizeMax: source.groupSizeMax,
            groupSizeLabel: source.groupSizeLabel,
            tags: source.tags,
            schedule: source.schedule,
            ...(source.policy ? { policy: source.policy } : {}),
            content: copyContent(source.content),
          });
          toast.success(`Listing created from ${source.title}.`);
        } catch {
          toast.error("Listing created, but the layout didn't copy. Open it and set it up there.");
        }
      } else toast.success("Listing created.");
      router.push(`/listings/${created.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't create.");
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <p className={`t-body-sm ${styles.error}`} role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <form className={styles.panel} onSubmit={onSave}>
      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>New listing</h2>
        <div className={styles.grid2}>
          {categories.length > 0 ? (
            <div className={`${styles.selectField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="new-category">
                Category
              </label>
              <select
                id="new-category"
                className={styles.select}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (e.target.value) setSource(null);
                }}
              >
                <option value="">None (set up the page layout yourself)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className={`t-body-sm ${styles.hint}`}>
                {categoryId ? "The page layout comes from the category. After you create the listing, fill in its content." : "Pick a category to use its fixed page layout."}
              </p>
            </div>
          ) : null}
          {categoryId ? null : (
          <div className={`${styles.selectField} ${styles.full}`}>
            <label className={styles.textareaLabel} htmlFor="new-from">
              Start from
            </label>
            <select id="new-from" className={styles.select} value={source?.id ?? ""} disabled={loadingSource} onChange={(e) => void chooseSource(e.target.value)}>
              <option value="">Blank listing</option>
              {[...(experiences ?? [])]
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    Copy of {x.title}
                  </option>
                ))}
            </select>
            <p className={`t-body-sm ${styles.hint}`}>
              {loadingSource
                ? "Loading…"
                : source
                  ? "Copies the page layout, text, hours, policy and tags. Photos, menu pages, links and phone numbers are not copied. Photos inside the story stay until you replace them."
                  : "Pick a listing to reuse its layout, then edit the content."}
            </p>
          </div>
          )}
          <Input
            label="Title"
            value={title}
            onChange={(e) => {
              const next = e.target.value;
              setTitle(next);
              if (!slugTouched) setSlug(slugFromTitle(next));
            }}
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
          <div className={styles.selectField}>
            <label className={styles.textareaLabel} htmlFor="new-host">
              Host
            </label>
            <select
              id="new-host"
              className={styles.select}
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              required
            >
              {hosts.length === 0 ? (
                <option value="">No hosts yet</option>
              ) : (
                hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.businessName}
                    {h.active ? "" : " (inactive)"}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className={styles.selectField}>
            <label className={styles.textareaLabel} htmlFor="new-status">
              Status
            </label>
            <select
              id="new-status"
              className={styles.select}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "published" | "archived")
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Active</option>
              <option value="archived">Inactive</option>
            </select>
          </div>
          <div className={`${styles.textareaField} ${styles.full}`}>
            <label className={styles.textareaLabel} htmlFor="new-verdict">
              Verdict
            </label>
            <textarea
              id="new-verdict"
              className={styles.textarea}
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              rows={2}
            />
          </div>
          <div className={`${styles.textareaField} ${styles.full}`}>
            <label className={styles.textareaLabel} htmlFor="new-about">
              About
            </label>
            <textarea
              id="new-about"
              className={styles.textarea}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
            />
          </div>
          <Input
            label="Place name"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            required
          />
          <Input
            label="Neighborhood"
            value={placeNeighborhood}
            onChange={(e) => setPlaceNeighborhood(e.target.value)}
            required
          />
          <Input
            label="Lat"
            inputMode="decimal"
            value={placeLat}
            onChange={(e) => setPlaceLat(e.target.value)}
          />
          <Input
            label="Lng"
            inputMode="decimal"
            value={placeLng}
            onChange={(e) => setPlaceLng(e.target.value)}
          />
          <Input
            label="Price from (INR)"
            inputMode="numeric"
            value={priceFromInr}
            onChange={(e) => setPriceFromInr(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={saving || !hostId}>
          {saving ? "Creating…" : "Create listing"}
        </Button>
        <Button href="/listings" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
