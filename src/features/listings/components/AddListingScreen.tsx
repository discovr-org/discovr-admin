"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import {
  createExperienceAdmin,
  fetchHosts,
  type CatalogHostSummary,
} from "@/shared/utils/catalogApi";
import styles from "../styles/EditListingScreen.module.css";

function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function AddListingScreen() {
  const router = useRouter();
  const [hosts, setHosts] = useState<CatalogHostSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError("Add a title.");
      return;
    }
    if (!hostId) {
      setSaveError("Pick a host.");
      return;
    }
    if (!placeName.trim() || !placeNeighborhood.trim()) {
      setSaveError("Place name and neighborhood are required.");
      return;
    }
    if (status === "published" && !verdict.trim()) {
      setSaveError("Active listings need a one-line verdict.");
      return;
    }

    setSaving(true);
    setSaveError(null);
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
      });
      router.push(`/listings/${created.id}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Couldn't create.");
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
      {saveError ? (
        <p className={`t-body-sm ${styles.error}`} role="alert">
          {saveError}
        </p>
      ) : null}
    </form>
  );
}
