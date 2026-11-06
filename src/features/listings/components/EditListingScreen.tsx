"use client";

import Link from "next/link";
import { patchExperienceLocal } from "@/shared/utils/useCatalog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/shared/components/Input";
import { PlaceMap } from "@/shared/components/PlaceMap";
import { ListIcon } from "@/shared/components/icons";
import {
  deleteExperienceAdmin,
  fetchExperienceAdmin,
  patchExperienceAdmin,
  type CatalogExperienceAdmin,
  type ContentLink,
  type ExperienceContent,
  type Weekday,
  WEEKDAYS,
} from "@/shared/utils/catalogApi";
import { useToast } from "@/shared/components/Toast";
import styles from "../styles/EditListingScreen.module.css";
import { ListingPhotos } from "./ListingPhotos";
import { StoryPhotos } from "./StoryPhotos";

type Props = { id: string };

type LinkKey = keyof NonNullable<ExperienceContent["links"]>;
type BookVia = NonNullable<ExperienceContent["bookVia"]>;
type FaqRow = { q: string; a: string };

type FormState = {
  title: string;
  slug: string;
  status: CatalogExperienceAdmin["status"];
  verdict: string;
  about: string;
  placeName: string;
  placeNeighborhood: string;
  placeLat: string;
  placeLng: string;
  priceFromInr: string;
  durationMinutes: string;
  groupSizeMax: string;
  groupSizeLabel: string;
  tags: string[];
  days: string;
  timeSlot: string;
  altDays: Weekday[];
  altTimeSlot: string;
  closedDays: Weekday[];
  bestTime: string;
  ageGroup: string;
  minPeople: string;
  durationLabel: string;
  aka: string;
  priceNarrative: string;
  priceUnit: string;
  taxes: "extra" | "inclusive";
  format: "trip" | "venue";
  walkIn: boolean;
  meetingPoint: string;
  phones: string;
  additionalInfo: string;
  termsDetail: string;
  pitch: string;
  fitnessLevel: string;
  instructorRatio: string;
  healthAdvisory: string;
  carry: string[];
  knowBeforeYouGo: string[];
  /** Keys the form doesn't edit; kept on save so they aren't lost. */
  baseContent: ExperienceContent;
  included: string[];
  notIncluded: string[];
  policySummary: string;
  bookingNotes: string[];
  cancellationNotes: string[];
  showFinalTermsNote: boolean;
  faqs: FaqRow[];
  mapsUrl: string;
  menuUrl: string;
  bookVia: BookVia;
  bookUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
};

function optionalLink(url: string): ContentLink | undefined {
  const trimmed = url.trim();
  return trimmed ? { url: trimmed } : undefined;
}

type LineKey =
  | "bookingNotes"
  | "cancellationNotes"
  | "included"
  | "notIncluded"
  | "carry"
  | "knowBeforeYouGo";

function toForm(row: CatalogExperienceAdmin): FormState {
  const c = row.content ?? {};
  const s = row.schedule ?? {};
  const p = row.policy;
  return {
    title: row.title,
    slug: row.slug,
    status: row.status,
    verdict: row.verdict,
    about: row.about,
    placeName: row.placeName,
    placeNeighborhood: row.placeNeighborhood,
    placeLat: String(row.placeLat),
    placeLng: String(row.placeLng),
    priceFromInr: String(row.priceFromInr),
    durationMinutes: String(row.durationMinutes),
    groupSizeMax: String(row.groupSizeMax),
    groupSizeLabel: row.groupSizeLabel,
    tags: [...(row.tags ?? [])],
    days: s.days ?? "",
    timeSlot: s.timeSlot ?? "",
    altDays: [...(s.altDays ?? [])],
    altTimeSlot: s.altTimeSlot ?? "",
    closedDays: [...(s.closedDays ?? [])],
    bestTime: s.bestTime ?? "",
    ageGroup: s.ageGroup ?? "",
    minPeople: s.minPeople ?? "",
    durationLabel: s.durationLabel ?? c.durationLabel ?? "",
    aka: c.aka ?? "",
    priceNarrative: c.priceNarrative ?? "",
    priceUnit: c.priceUnit ?? "",
    taxes: c.taxes === "extra" ? "extra" : "inclusive",
    format: c.format === "venue" ? "venue" : "trip",
    walkIn: c.walkIn === true,
    meetingPoint: c.meetingPoint ?? "",
    phones: (c.phones ?? []).join(", "),
    additionalInfo: c.additionalInfo ?? "",
    termsDetail: c.termsDetail ?? "",
    pitch: c.pitch ?? "",
    fitnessLevel: c.fitnessLevel ?? c.difficulty ?? "",
    instructorRatio: c.instructorRatio ?? "",
    healthAdvisory: c.healthAdvisory ?? "",
    carry: c.carry?.length
      ? [...c.carry]
      : (c.whatToCarry ?? "")
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean),
    knowBeforeYouGo: [...(c.knowBeforeYouGo ?? [])],
    baseContent: c,
    included: [...(c.included ?? [])],
    notIncluded: [...(c.notIncluded ?? [])],
    policySummary: p?.summary ?? "",
    bookingNotes: [...(p?.booking ?? [])],
    cancellationNotes: [...(p?.cancellation ?? [])],
    showFinalTermsNote: p?.showFinalTermsNote !== false,
    faqs: (c.faqs ?? []).map((f) => ({ q: f.q, a: f.a })),
    mapsUrl: c.links?.maps?.url ?? "",
    menuUrl: c.links?.menu?.url ?? "",
    bookVia: c.bookVia === "link" ? "link" : "call",
    bookUrl: c.links?.book?.url ?? "",
    whatsappUrl: c.links?.whatsapp?.url ?? "",
    instagramUrl: c.links?.instagram?.url ?? "",
  };
}

function buildContent(form: FormState): ExperienceContent {
  const links: NonNullable<ExperienceContent["links"]> = {};
  const setLink = (key: LinkKey, url: string) => {
    const link = optionalLink(url);
    if (link) links[key] = link;
  };
  setLink("maps", form.mapsUrl);
  setLink("menu", form.menuUrl);
  setLink("book", form.bookUrl);
  setLink("whatsapp", form.whatsappUrl);
  setLink("instagram", form.instagramUrl);

  const tags = form.tags.map((t) => t.trim()).filter(Boolean);

  return {
    ...form.baseContent,
    aka: form.aka.trim() || undefined,
    priceNarrative: form.priceNarrative.trim() || undefined,
    priceUnit: form.priceUnit.trim() || undefined,
    taxes: form.taxes,
    format: form.format,
    walkIn: form.format === "venue" && form.walkIn ? true : undefined,
    meetingPoint: form.meetingPoint.trim() || undefined,
    durationLabel: form.durationLabel.trim() || undefined,
    additionalInfo: form.additionalInfo.trim() || undefined,
    termsDetail: form.termsDetail.trim() || undefined,
    whatToCarry: undefined,
    pitch: form.pitch.trim() || undefined,
    fitnessLevel: form.fitnessLevel.trim() || undefined,
    instructorRatio: form.instructorRatio.trim() || undefined,
    healthAdvisory: form.healthAdvisory.trim() || undefined,
    carry: form.carry.map((s) => s.trim()).filter(Boolean),
    knowBeforeYouGo: form.knowBeforeYouGo.map((s) => s.trim()).filter(Boolean),
    included: form.included.map((s) => s.trim()).filter(Boolean),
    notIncluded: form.notIncluded.map((s) => s.trim()).filter(Boolean),
    phones: form.phones
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    tagsOnDisplay: tags,
    faqs: form.faqs
      .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
      .filter((f) => f.q || f.a),
    links: Object.keys(links).length ? links : undefined,
    bookVia: form.bookVia,
  };
}

/** Older API builds omit these lists. */
function listingMedia(row: CatalogExperienceAdmin) {
  return { photos: row.photos ?? [], menuPages: row.menuPages ?? [] };
}

export function EditListingScreen({ id }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [hostLabel, setHostLabel] = useState("");
  const [media, setMedia] = useState<Pick<CatalogExperienceAdmin, "photos" | "menuPages">>({
    photos: [],
    menuPages: [],
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  // Jump bar: pinned under the top bar, and the section you are in is highlighted.
  const screenRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>(JUMPS[0][0]);
  const loaded = form !== null;

  useEffect(() => {
    const screen = screenRef.current;
    if (!loaded || !screen) return;
    const header = document.querySelector("header");

    // Pin offsets come from the real heights, so they stay right if the top bar wraps.
    const measure = () => {
      const top = header?.getBoundingClientRect().height ?? 0;
      screen.style.setProperty("--jump-top", `${top}px`);
      screen.style.setProperty("--jump-offset", `${top + (navRef.current?.offsetHeight ?? 0) + 8}px`);
    };
    measure();
    window.addEventListener("resize", measure);

    // A section counts as "current" while it is in the upper part of the screen.
    const visible = new Set<string>();
    const topPx = header?.getBoundingClientRect().height ?? 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = e.target.id.replace("sec-", "");
          if (e.isIntersecting) visible.add(key);
          else visible.delete(key);
        }
        const first = JUMPS.find(([a]) => visible.has(a));
        if (first) setActive(first[0]);
      },
      { rootMargin: `-${topPx + 56}px 0px -55% 0px` },
    );
    for (const [a] of JUMPS) {
      const el = document.getElementById(`sec-${a}`);
      if (el) io.observe(el);
    }
    // Short last sections never reach the upper band, so the page bottom means "last tab".
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        setActive(JUMPS[JUMPS.length - 1][0]);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, [loaded]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;
    fetchExperienceAdmin(id)
      .then((row) => {
        if (cancelled) return;
        setForm(toForm(row));
        setHostLabel(row.hostBusinessName);
        setMedia(listingMedia(row));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load this listing.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function touch() {
    setDirty(true);
  }

  function patchField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    touch();
  }

  function addFaq() {
    setForm((prev) =>
      prev ? { ...prev, faqs: [...prev.faqs, { q: "", a: "" }] } : prev,
    );
    touch();
  }

  function updateFaq(index: number, key: keyof FaqRow, value: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const faqs = prev.faqs.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      );
      return { ...prev, faqs };
    });
    touch();
  }

  function removeFaq(index: number) {
    setForm((prev) =>
      prev ? { ...prev, faqs: prev.faqs.filter((_, i) => i !== index) } : prev,
    );
    touch();
  }

  function addLine(
    key: LineKey,
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: [...prev[key], ""] } : prev));
    touch();
  }

  function updateLine(
    key: LineKey,
    index: number,
    value: string,
  ) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev[key].map((line, i) => (i === index ? value : line));
      return { ...prev, [key]: next };
    });
    touch();
  }

  function removeLine(
    key: LineKey,
    index: number,
  ) {
    setForm((prev) =>
      prev
        ? { ...prev, [key]: prev[key].filter((_, i) => i !== index) }
        : prev,
    );
    touch();
  }

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, value] };
    });
    setTagDraft("");
    touch();
  }

  function removeTag(index: number) {
    setForm((prev) =>
      prev ? { ...prev, tags: prev.tags.filter((_, i) => i !== index) } : prev,
    );
    touch();
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.title.trim()) {
      toast.error("Add a title.");
      return;
    }
    if (form.status === "published" && !form.verdict.trim()) {
      toast.error("Published listings need a one-line verdict.");
      return;
    }
    if (form.bookVia === "link" && !form.bookUrl.trim()) {
      toast.error("Add the booking page URL, or switch to Call the host.");
      return;
    }

    const tags = form.tags.map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    try {
      const saved = await patchExperienceAdmin(id, {
        title: form.title.trim(),
        slug: form.slug.trim(),
        status: form.status,
        verdict: form.verdict.trim() || null,
        about: form.about,
        placeName: form.placeName.trim(),
        placeNeighborhood: form.placeNeighborhood.trim(),
        placeLat: Number(form.placeLat) || 0,
        placeLng: Number(form.placeLng) || 0,
        priceFromInr: Math.max(0, Math.round(Number(form.priceFromInr) || 0)),
        durationMinutes: Math.max(
          1,
          Math.round(Number(form.durationMinutes) || 1),
        ),
        groupSizeMax: Math.max(1, Math.round(Number(form.groupSizeMax) || 1)),
        groupSizeLabel: form.groupSizeLabel.trim(),
        tags,
        schedule: {
          days: form.days.trim() || undefined,
          timeSlot: form.timeSlot.trim() || undefined,
          altDays: form.altTimeSlot.trim() ? form.altDays : [],
          altTimeSlot: form.altTimeSlot.trim() || undefined,
          closedDays: form.closedDays,
          bestTime: form.bestTime.trim() || undefined,
          ageGroup: form.ageGroup.trim() || undefined,
          minPeople: form.minPeople.trim() || undefined,
          durationLabel: form.durationLabel.trim() || undefined,
        },
        policy: {
          summary: form.policySummary.trim(),
          booking: form.bookingNotes.map((s) => s.trim()).filter(Boolean),
          cancellation: form.cancellationNotes
            .map((s) => s.trim())
            .filter(Boolean),
          showFinalTermsNote: form.showFinalTermsNote,
        },
        content: buildContent(form),
      });
      setForm(toForm(saved));
      setDirty(false);
      patchExperienceLocal(id, {
        title: saved.title,
        slug: saved.slug,
        status: saved.status,
        verdict: saved.verdict,
        priceFromInr: saved.priceFromInr,
        placeNeighborhood: saved.placeNeighborhood,
      });
      toast.success("Saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this listing for good? Photos and tags go with it.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteExperienceAdmin(id);
      toast.success("Listing deleted.");
      router.push("/listings");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete.");
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <EmptyState
        icon={<ListIcon />}
        title="Can't load listing"
        text={loadError}
        action={
          <Button href="/listings" variant="secondary">
            Back to listings
          </Button>
        }
        role="alert"
      />
    );
  }

  if (!form) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading listing…</p>;
  }

  // What a guest would miss. Updates as you type; each item jumps to its section.
  const todo: Array<[anchor: string, text: string]> = [];
  if (media.photos.length === 0) todo.push(["photos", "Add a photo"]);
  if (!form.verdict.trim()) todo.push(["basics", "Write the one-line verdict"]);
  if (!form.about.trim()) todo.push(["basics", "Write the About"]);
  if (Number(form.priceFromInr) <= 0) todo.push(["price", "Set the price (or leave it for ask-the-host)"]);
  if (!form.timeSlot.trim() && !form.days.trim()) todo.push(["when", "Add the hours"]);
  if (!form.faqs.some((f) => f.q.trim() && f.a.trim())) todo.push(["faqs", "Add a few FAQs"]);

  return (
    <div className={styles.screen} ref={screenRef}>
      {todo.length > 0 ? (
        <section className={styles.todo} aria-label="Finish setting up">
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Finish setting up</h2>
          <ul className={styles.todoList}>
            {todo.map(([anchor, text]) => (
              <li key={text}>
                <a href={`#sec-${anchor}`} className={styles.todoLink}>
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className={`t-body-sm ${styles.meta}`}>
        Host: {hostLabel || "—"} ·{" "}
        <Link href="/listings">Back to listings</Link>
      </p>
      <nav className={styles.jump} aria-label="Jump to section" ref={navRef}>
        {JUMPS.map(([anchor, label]) => (
          <a
            key={anchor}
            href={`#sec-${anchor}`}
            className={`${styles.jumpLink} ${active === anchor ? styles.jumpLinkActive : ""}`}
            aria-current={active === anchor ? "true" : undefined}
            onClick={() => setActive(anchor)}
          >
            {label}
          </a>
        ))}
      </nav>
      <form className={styles.panel} onSubmit={onSave}>
        <div id="sec-photos" className={styles.group}>
        <ListingPhotos
          experienceId={id}
          title={form.title.trim()}
          photos={media.photos}
          menuPages={media.menuPages}
          onSaved={(row) => setMedia(listingMedia(row))}
        />
        <StoryPhotos
          blocks={form.baseContent.blocks}
          onChange={(blocks) =>
            patchField("baseContent", { ...form.baseContent, blocks })
          }
          hidden={form.baseContent.hideStoryPhotos === true}
          onHiddenChange={(hideStoryPhotos) =>
            patchField("baseContent", {
              ...form.baseContent,
              hideStoryPhotos: hideStoryPhotos || undefined,
            })
          }
        />
        </div>
        <div id="sec-basics" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Basics</h2>
          <div className={styles.grid2}>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => patchField("title", e.target.value)}
              required
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) => patchField("slug", e.target.value)}
              required
            />
            <div className={styles.selectField}>
              <label className={styles.textareaLabel} htmlFor="listing-status">
                Status
              </label>
              <select
                id="listing-status"
                className={styles.select}
                value={form.status}
                onChange={(e) =>
                  patchField(
                    "status",
                    e.target.value as CatalogExperienceAdmin["status"],
                  )
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Active</option>
                <option value="archived">Inactive</option>
              </select>
            </div>
            <div className={styles.selectField}>
              <label className={styles.textareaLabel} htmlFor="listing-format">
                Format
              </label>
              <select
                id="listing-format"
                className={styles.select}
                value={form.format}
                onChange={(e) =>
                  patchField(
                    "format",
                    e.target.value === "venue" ? "venue" : "trip",
                  )
                }
              >
                <option value="trip">Trip (times + people)</option>
                <option value="venue">Venue / bar (no trip times)</option>
              </select>
            </div>
            {form.format === "venue" ? (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.walkIn}
                  onChange={(e) => patchField("walkIn", e.target.checked)}
                />
                <span>
                  Walk-ins welcome (bottom bar says &quot;No booking needed,
                  just walk in&quot;)
                </span>
              </label>
            ) : null}
            <Input
              label="Price from (INR)"
              inputMode="numeric"
              value={form.priceFromInr}
              onChange={(e) => patchField("priceFromInr", e.target.value)}
            />
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="listing-verdict">
                Verdict
              </label>
              <textarea
                id="listing-verdict"
                className={styles.textarea}
                value={form.verdict}
                onChange={(e) => patchField("verdict", e.target.value)}
                rows={2}
              />
            </div>
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="listing-about">
                About
              </label>
              <textarea
                id="listing-about"
                className={styles.textarea}
                value={form.about}
                onChange={(e) => patchField("about", e.target.value)}
                rows={4}
              />
            </div>
            <div className={styles.full}>
              <Input
                label="Also known as"
                value={form.aka}
                onChange={(e) => patchField("aka", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div id="sec-place" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Place</h2>
          <div className={styles.grid2}>
            <Input
              label="Place name"
              value={form.placeName}
              onChange={(e) => patchField("placeName", e.target.value)}
            />
            <Input
              label="Neighborhood"
              value={form.placeNeighborhood}
              onChange={(e) => patchField("placeNeighborhood", e.target.value)}
            />
            <Input
              label="Lat"
              inputMode="decimal"
              value={form.placeLat}
              onChange={(e) => patchField("placeLat", e.target.value)}
            />
            <Input
              label="Lng"
              inputMode="decimal"
              value={form.placeLng}
              onChange={(e) => patchField("placeLng", e.target.value)}
            />
            <div className={styles.full}>
              <Input
                label="Meeting point"
                value={form.meetingPoint}
                onChange={(e) => patchField("meetingPoint", e.target.value)}
              />
            </div>
            <div className={styles.full}>
              <p className={styles.textareaLabel}>Map pin</p>
              <PlaceMap
                lat={Number(form.placeLat)}
                lng={Number(form.placeLng)}
                label={`${form.placeName || "Listing"} map pin`}
              />
            </div>
          </div>
        </div>

        <div id="sec-price" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Price story</h2>
          <div className={styles.grid2}>
            <div className={styles.full}>
              <Input
                label="Price narrative"
                value={form.priceNarrative}
                onChange={(e) => patchField("priceNarrative", e.target.value)}
              />
            </div>
            <div className={styles.full}>
              <Input
                label="Unit"
                value={form.priceUnit}
                onChange={(e) => patchField("priceUnit", e.target.value)}
              />
            </div>
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="price-taxes">
                Taxes
              </label>
              <select
                id="price-taxes"
                className={styles.select}
                value={form.taxes}
                onChange={(e) =>
                  patchField(
                    "taxes",
                    e.target.value === "extra" ? "extra" : "inclusive",
                  )
                }
              >
                <option value="inclusive">Inclusive of taxes</option>
                <option value="extra">+ taxes</option>
              </select>
            </div>
            <div className={styles.full}>
              <Input
                label="Phones (comma separated)"
                value={form.phones}
                onChange={(e) => patchField("phones", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div id="sec-when" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>When</h2>
          <div className={styles.grid2}>
            <Input
              label="Days open"
              value={form.days}
              onChange={(e) => patchField("days", e.target.value)}
            />
            <Input
              label="Time slot (usual hours, e.g. 8 am – 1 am)"
              value={form.timeSlot}
              onChange={(e) => patchField("timeSlot", e.target.value)}
            />
            <div className={styles.full}>
              <DayPicker
                legend="Closed on"
                value={form.closedDays}
                onChange={(days) => patchField("closedDays", days)}
              />
            </div>
            <DayPicker
              legend="Other hours on (e.g. weekends)"
              value={form.altDays}
              onChange={(days) => patchField("altDays", days)}
            />
            <Input
              label="Other hours time slot"
              value={form.altTimeSlot}
              onChange={(e) => patchField("altTimeSlot", e.target.value)}
            />
            <Input
              label="Best time"
              value={form.bestTime}
              onChange={(e) => patchField("bestTime", e.target.value)}
            />
            <Input
              label="Duration label"
              value={form.durationLabel}
              onChange={(e) => patchField("durationLabel", e.target.value)}
            />
            <div className={styles.full}>
              <Input
                label="Age group"
                value={form.ageGroup}
                onChange={(e) => patchField("ageGroup", e.target.value)}
              />
            </div>
            <Input
              label="Min people"
              value={form.minPeople}
              onChange={(e) => patchField("minPeople", e.target.value)}
            />
            <Input
              label="Duration (minutes)"
              inputMode="numeric"
              value={form.durationMinutes}
              onChange={(e) => patchField("durationMinutes", e.target.value)}
            />
            <Input
              label="Group size max"
              inputMode="numeric"
              value={form.groupSizeMax}
              onChange={(e) => patchField("groupSizeMax", e.target.value)}
            />
            <div className={styles.full}>
              <Input
                label="Group size label"
                value={form.groupSizeLabel}
                onChange={(e) => patchField("groupSizeLabel", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div id="sec-links" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Links</h2>
          <p className={`t-body-sm ${styles.hint}`}>
            Paste maps, menu, WhatsApp, or Instagram URLs from the sheet.
          </p>
          <div className={styles.grid2}>
            <Input
              label="Maps URL"
              type="url"
              value={form.mapsUrl}
              onChange={(e) => patchField("mapsUrl", e.target.value)}
            />
            <Input
              label="Menu URL"
              type="url"
              value={form.menuUrl}
              onChange={(e) => patchField("menuUrl", e.target.value)}
            />
            <Input
              label="WhatsApp URL"
              type="url"
              value={form.whatsappUrl}
              onChange={(e) => patchField("whatsappUrl", e.target.value)}
            />
            <Input
              label="Instagram URL"
              type="url"
              value={form.instagramUrl}
              onChange={(e) => patchField("instagramUrl", e.target.value)}
            />
          </div>
        </div>

        <div id="sec-booking" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Booking</h2>
          <fieldset className={styles.choice}>
            <legend className={styles.textareaLabel}>How guests book</legend>
            <label className={styles.checkRow}>
              <input
                type="radio"
                name="book-via"
                checked={form.bookVia === "call"}
                onChange={() => patchField("bookVia", "call")}
              />
              <span>Call the host</span>
            </label>
            <label className={styles.checkRow}>
              <input
                type="radio"
                name="book-via"
                checked={form.bookVia === "link"}
                onChange={() => patchField("bookVia", "link")}
              />
              <span>Host&apos;s booking page</span>
            </label>
          </fieldset>
          {form.bookVia === "call" ? (
            <p className={`t-body-sm ${styles.hint}`}>
              The button calls {hostLabel || "the host"}&apos;s number from Hosts.
            </p>
          ) : (
            <Input
              label="Booking page URL"
              type="url"
              value={form.bookUrl}
              onChange={(e) => patchField("bookUrl", e.target.value)}
              hint="The button opens this page."
              required
            />
          )}
        </div>

        <div id="sec-faqs" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={`t-title-sm ${styles.sectionTitle}`}>FAQs</h2>
            <button type="button" className={styles.addBtn} onClick={addFaq}>
              Add FAQ
            </button>
          </div>
          {form.faqs.length === 0 ? (
            <p className={`t-body-sm ${styles.hint}`}>
              No FAQs yet. Hit Add FAQ.
            </p>
          ) : (
            <ul className={styles.stack}>
              {form.faqs.map((faq, index) => (
                <li key={`faq-${index}`} className={styles.stackItem}>
                  <div className={styles.stackItemHead}>
                    <span className={`t-body-sm ${styles.stackLabel}`}>
                      FAQ {index + 1}
                    </span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeFaq(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    label="Question"
                    value={faq.q}
                    onChange={(e) => updateFaq(index, "q", e.target.value)}
                  />
                  <div className={styles.textareaField}>
                    <label
                      className={styles.textareaLabel}
                      htmlFor={`faq-a-${index}`}
                    >
                      Answer
                    </label>
                    <textarea
                      id={`faq-a-${index}`}
                      className={styles.textarea}
                      value={faq.a}
                      onChange={(e) => updateFaq(index, "a", e.target.value)}
                      rows={2}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div id="sec-policy" className={styles.section}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Policy</h2>
          <div className={styles.grid2}>
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="policy-summary">
                Summary / terms
              </label>
              <textarea
                id="policy-summary"
                className={styles.textarea}
                value={form.policySummary}
                onChange={(e) => patchField("policySummary", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <LineList
            title="Booking notes"
            lines={form.bookingNotes}
            onAdd={() => addLine("bookingNotes")}
            onChange={(i, v) => updateLine("bookingNotes", i, v)}
            onRemove={(i) => removeLine("bookingNotes", i)}
            emptyHint="No booking notes yet. Hit Add note."
            addLabel="Add note"
          />
          <LineList
            title="Cancellation"
            lines={form.cancellationNotes}
            onAdd={() => addLine("cancellationNotes")}
            onChange={(i, v) => updateLine("cancellationNotes", i, v)}
            onRemove={(i) => removeLine("cancellationNotes", i)}
            emptyHint="No cancellation lines yet. Hit Add note."
            addLabel="Add note"
          />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.showFinalTermsNote}
              onChange={(e) =>
                patchField("showFinalTermsNote", e.target.checked)
              }
            />
            <span>
              Show &quot;Check the final terms on{" "}
              {hostLabel || "this place"} before paying.&quot; under the
              policy
            </span>
          </label>

          <div className={styles.grid2}>
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="additional-info">
                Additional info
              </label>
              <textarea
                id="additional-info"
                className={styles.textarea}
                value={form.additionalInfo}
                onChange={(e) => patchField("additionalInfo", e.target.value)}
                rows={3}
              />
            </div>
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="terms-detail">
                Terms detail
              </label>
              <textarea
                id="terms-detail"
                className={styles.textarea}
                value={form.termsDetail}
                onChange={(e) => patchField("termsDetail", e.target.value)}
                rows={3}
              />
            </div>
            <div className={`${styles.textareaField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="health-advisory">
                Health advisory
              </label>
              <textarea
                id="health-advisory"
                className={styles.textarea}
                value={form.healthAdvisory}
                onChange={(e) => patchField("healthAdvisory", e.target.value)}
                rows={2}
              />
            </div>
            <Input
              label="Short pitch (italic, top of About)"
              value={form.pitch}
              onChange={(e) => patchField("pitch", e.target.value)}
            />
            <Input
              label="Fitness level"
              value={form.fitnessLevel}
              onChange={(e) => patchField("fitnessLevel", e.target.value)}
            />
            <Input
              label="Student to instructor ratio"
              value={form.instructorRatio}
              onChange={(e) => patchField("instructorRatio", e.target.value)}
            />
          </div>

          <LineList
            title="Things to get with you"
            lines={form.carry}
            onAdd={() => addLine("carry")}
            onChange={(i, v) => updateLine("carry", i, v)}
            onRemove={(i) => removeLine("carry", i)}
            emptyHint="Nothing listed. Hit Add item."
            addLabel="Add item"
          />
          <LineList
            title="Know before you go"
            lines={form.knowBeforeYouGo}
            onAdd={() => addLine("knowBeforeYouGo")}
            onChange={(i, v) => updateLine("knowBeforeYouGo", i, v)}
            onRemove={(i) => removeLine("knowBeforeYouGo", i)}
            emptyHint="Empty: the guest page uses the booking and cancellation notes."
            addLabel="Add tip"
          />
          <LineList
            title="What's included"
            lines={form.included}
            onAdd={() => addLine("included")}
            onChange={(i, v) => updateLine("included", i, v)}
            onRemove={(i) => removeLine("included", i)}
            emptyHint="Nothing listed. Hit Add item."
            addLabel="Add item"
          />
          <LineList
            title="What's not included"
            lines={form.notIncluded}
            onAdd={() => addLine("notIncluded")}
            onChange={(i, v) => updateLine("notIncluded", i, v)}
            onRemove={(i) => removeLine("notIncluded", i)}
            emptyHint="Nothing listed. Hit Add item."
            addLabel="Add item"
          />
        </div>

        <div id="sec-tags" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={`t-title-sm ${styles.sectionTitle}`}>Tags</h2>
          </div>
          {form.tags.length > 0 ? (
            <ul className={styles.tagList}>
              {form.tags.map((tag, index) => (
                <li key={`${tag}-${index}`} className={styles.tagChip}>
                  <span>{tag}</span>
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => removeTag(index)}
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`t-body-sm ${styles.hint}`}>No tags yet.</p>
          )}
          <div className={styles.tagAddRow}>
            <Input
              label="New tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className={styles.addBtn} onClick={addTag}>
              Add tag
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button href="/listings" variant="secondary">
            Cancel
          </Button>
          <span className={`t-body-sm ${styles.message}`} role="status">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <button
            type="button"
            className={styles.danger}
            onClick={onDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Deleting…" : "Delete listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

const JUMPS = [
  ["photos", "Photos"],
  ["basics", "Basics"],
  ["place", "Place"],
  ["price", "Price"],
  ["when", "When"],
  ["links", "Links"],
  ["booking", "Booking"],
  ["faqs", "FAQs"],
  ["policy", "Policy"],
  ["tags", "Tags"],
] as const;

type LineListProps = {
  title: string;
  lines: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  emptyHint: string;
  addLabel: string;
};

function LineList({
  title,
  lines,
  onAdd,
  onChange,
  onRemove,
  emptyHint,
  addLabel,
}: LineListProps) {
  return (
    <div className={styles.lineBlock}>
      <div className={styles.sectionHead}>
        <h3 className={`t-body-sm ${styles.stackLabel}`}>{title}</h3>
        <button type="button" className={styles.addBtn} onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {lines.length === 0 ? (
        <p className={`t-body-sm ${styles.hint}`}>{emptyHint}</p>
      ) : (
        <ul className={styles.stack}>
          {lines.map((line, index) => (
            <li key={`${title}-${index}`} className={styles.lineRow}>
              <input
                className={styles.lineInput}
                value={line}
                onChange={(e) => onChange(index, e.target.value)}
                aria-label={`${title} ${index + 1}`}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DayPicker({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}) {
  const toggle = (day: Weekday, on: boolean) =>
    onChange(WEEKDAYS.filter((d) => (d === day ? on : value.includes(d))));
  return (
    <fieldset className={styles.choice}>
      <legend className={styles.textareaLabel}>{legend}</legend>
      <div className={styles.dayRow}>
        {WEEKDAYS.map((day) => (
          <label key={day} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={value.includes(day)}
              onChange={(e) => toggle(day, e.target.checked)}
            />
            <span>{day}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
