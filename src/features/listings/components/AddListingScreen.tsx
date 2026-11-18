"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import {
  createExperienceAdmin,
  fetchExperienceAdmin,
  fetchHosts,
  patchExperienceAdmin,
  type CatalogExperienceAdmin,
  type CatalogHostSummary,
  type ExperienceAdminPatch,
  type ExperienceContent,
} from "@/shared/utils/catalogApi";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import type { Category } from "@/features/categories/utils/layout";
import { useCatalog } from "@/shared/utils/useCatalog";
import { useToast } from "@/shared/components/Toast";
import { LivePreview } from "./LivePreview";
import add from "../styles/AddListing.module.css";
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

  // The preview needs a real listing to draw on. A copy previews its source; otherwise the first live listing stands in.
  const sample = useMemo(() => (experiences ?? []).find((x) => x.status === "published") ?? experiences?.[0], [experiences]);
  const baseId = source?.id ?? sample?.id ?? "";
  const draft = useMemo(
    () =>
      ({
        ...(source ? {} : { categoryId: categoryId || null }),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(verdict.trim() ? { verdict: verdict.trim() } : {}),
        ...(about.trim() ? { about } : {}),
        ...(placeName.trim() ? { placeName: placeName.trim() } : {}),
        ...(placeNeighborhood.trim() ? { placeNeighborhood: placeNeighborhood.trim() } : {}),
        ...(Number(priceFromInr) > 0 ? { priceFromInr: Math.round(Number(priceFromInr)) } : {}),
      }) as ExperienceAdminPatch,
    [source, categoryId, title, verdict, about, placeName, placeNeighborhood, priceFromInr],
  );
  const noop = () => undefined;

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
    <div className={add.wrap}>
    <form className={styles.panel} onSubmit={onSave}>
      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>1. Pick a layout</h2>
        <div className={add.picker} role="radiogroup" aria-label="Page layout">
          <button
            type="button"
            role="radio"
            aria-checked={!categoryId}
            className={add.card}
            onClick={() => setCategoryId("")}
          >
            <span className={add.cardName}>Blank</span>
            <span className={add.cardHint}>Set up the page yourself after you create the listing.</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={categoryId === c.id}
              className={add.card}
              onClick={() => {
                setCategoryId(c.id);
                setSource(null);
              }}
            >
              <span className={add.cardName}>{c.name}</span>
              <span className={add.cardHint}>
                {c.layout.story?.length ?? 0} story blocks · {c.listingCount ?? 0} listing{c.listingCount === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
        <p className={`t-body-sm ${styles.hint}`}>
          {categoryId ? "The page layout comes from this category. The preview updates as you type." : "Pick a layout and watch the preview. Everything below fills it in."}
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>2. Details</h2>
        <div className={styles.grid2}>
          {categoryId ? null : (
          <div className={`${styles.selectField} ${styles.full}`}>
            <label className={styles.textareaLabel} htmlFor="new-from">
              Or copy an existing listing
            </label>
            <select id="new-from" className={styles.select} value={source?.id ?? ""} disabled={loadingSource} onChange={(e) => void chooseSource(e.target.value)}>
              <option value="">Don&apos;t copy</option>
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
                  : "Reuses another listing's layout and text. Then edit the content."}
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

    <aside className={add.preview} aria-label="Live preview">
      <div className={add.previewHead}>
        <h2 className={add.previewTitle}>Live preview</h2>
        <p className={`t-body-sm ${add.previewNote}`}>
          {baseId
            ? `Photos, host and anything you haven't filled in yet come from ${source?.title ?? sample?.title ?? "a sample listing"}.`
            : "Add a listing first to see a preview."}
        </p>
      </div>
      {baseId ? (
        <LivePreview
          id={baseId}
          draft={draft}
          mediaKey=""
          selected={null}
          hover={null}
          arranging={false}
          scrollTo={null}
          onSelect={noop}
          onHover={noop}
          onMove={noop}
          onRemove={noop}
          onArrange={noop}
          onAdd={noop}
        />
      ) : null}
    </aside>
    </div>
  );
}
