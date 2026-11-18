"use client";

import Link from "next/link";
import { patchExperienceLocal, useCatalog } from "@/shared/utils/useCatalog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/shared/components/Input";
import { PlaceMap } from "@/shared/components/PlaceMap";
import { ListIcon } from "@/shared/components/icons";
import {
  deleteExperienceAdmin,
  type ExperienceAdminPatch,
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
import { BLOCK_ICON, PART_ICON } from "../utils/layerIcons";
import { BLOCK_LABEL, HALF_OK, blockLabel, WIDGETS, cleanBlocks, moveBlock, parseBlocks, seedBlocks, type StoryBlock } from "../utils/storyBlocks";
import { FORMS, PART_META, readFixedShown, readSections, writeSections, type PartId, type SectionState } from "../utils/pageLayout";
import styles2 from "../styles/ListingEditor.module.css";
import { BlockEditor } from "./BlockEditor";
import { ListingLayers, type LayerItem, type Sel } from "./ListingLayers";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import { LAYOUT_LABEL, blockSources, layoutBlockLabel, sourceForm, sourceLabel, type Category } from "@/features/categories/utils/layout";
import { Ic } from "./EditorIcon";
import { LivePreview } from "./LivePreview";
import { PaneHead } from "./PaneHead";
import { StoryContentFields } from "./StoryContentFields";
import { WidgetLibrary } from "./WidgetLibrary";

type Props = { id: string };

type LinkKey = keyof NonNullable<ExperienceContent["links"]>;
type BookVia = NonNullable<ExperienceContent["bookVia"]>;
type FaqRow = { q: string; a: string };

export type FormState = {
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
  /** The category whose layout this listing uses, and what is saved (so a plain save sends nothing about it). */
  categoryId: string | null;
  categoryWas: string | null;
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
    categoryId: (row as CatalogExperienceAdmin & { categoryId?: string | null }).categoryId ?? null,
    categoryWas: (row as CatalogExperienceAdmin & { categoryId?: string | null }).categoryId ?? null,
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
    ...(Array.isArray(form.baseContent.blocks) ? { blocks: cleanBlocks(parseBlocks(form.baseContent.blocks)) } : {}),
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

/** The label in the editor that belongs to each field a layout block can read, for jumping to it. */
const FIELD_HEADING: Record<string, RegExp> = {
  carry: /things to get/i,
  knowBeforeYouGo: /know before you go/i,
  included: /^what.s included/i,
  notIncluded: /not included/i,
  pitch: /pitch/i,
  healthAdvisory: /health/i,
  fitnessLevel: /fitness/i,
  instructorRatio: /instructor/i,
  additionalInfo: /additional info/i,
  termsDetail: /terms detail/i,
  priceNarrative: /price narrative/i,
  ageGroup: /^age/i,
  bestTime: /best time/i,
  steps: /process steps/i,
  packages: /packages/i,
  "storyPhotos.0": /story photos/i,
};

/** Shown before leaving a listing that has edits not yet saved. */
const LOSE_CHANGES = "You have unsaved changes. If you leave this listing now, you'll lose them. Leave anyway?";

/** Everything the form changes, in the shape the API takes. Used by Save and by the live preview. */
export function buildPatch(form: FormState): ExperienceAdminPatch & { categoryId?: string | null } {
  const tags = form.tags.map((t) => t.trim()).filter(Boolean);
  return {
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
    // Sent only when it matters, so listings without a category save exactly as before.
    ...(form.categoryId || form.categoryId !== form.categoryWas ? { categoryId: form.categoryId } : {}),
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
  const { experiences } = useCatalog();
  const [categories, setCategories] = useState<Category[]>([]);

  const [sel, setSel] = useState<Sel>(null);
  const [tab, setTab] = useState<"widgets" | "edit">("edit");
  const [arranging, setArranging] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<{ id: string; n: number } | null>(null);
  type Snap = { blocks: unknown; sections: unknown };
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const typingTimer = useRef(0);

  function select(next: Sel) {
    setSel(next);
    setTab("edit");
  }

  // Undo / redo cover the page layout: story blocks, order, and what is shown.
  const snapOf = (f: FormState): Snap => ({ blocks: f.baseContent.blocks, sections: f.baseContent.sections });
  function record(f: FormState, coalesce: boolean) {
    // Typing in one block is one undo step: edits within 700 ms of the last one share a snapshot.
    const typing = typingTimer.current !== 0;
    window.clearTimeout(typingTimer.current);
    typingTimer.current = coalesce ? window.setTimeout(() => (typingTimer.current = 0), 700) : 0;
    if (coalesce && typing) return;
    setPast((p) => [...p.slice(-119), snapOf(f)]);
    setFuture([]);
  }
  function restore(snap: Snap) {
    setForm((prev) => (prev ? { ...prev, baseContent: { ...prev.baseContent, blocks: snap.blocks, sections: snap.sections } } : prev));
    setDirty(true);
    setSel(null);
  }
  function undo() {
    if (!form || past.length === 0) return;
    setFuture((f) => [snapOf(form), ...f]);
    setPast(past.slice(0, -1));
    restore(past[past.length - 1]);
  }
  function redo() {
    if (!form || future.length === 0) return;
    setPast((p) => [...p, snapOf(form)]);
    setFuture(future.slice(1));
    restore(future[0]);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        if (arranging) setArranging(false);
        else if (!typing) setSel(null);
        return;
      }
      if (typing || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    // Before the categories migration the list can't load; the editor then works as it always has.
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Picking a layout block jumps to the field it reads, since several fields share one editor card.
  const pickedBlock = form?.categoryId && sel?.kind === "block" ? categories.find((c) => c.id === form.categoryId)?.layout.story?.[sel.index] : undefined;
  const focusSource = pickedBlock ? blockSources(pickedBlock)[0] : undefined;
  useEffect(() => {
    const heading = focusSource ? FIELD_HEADING[focusSource] : undefined;
    if (!heading) return;
    const root = document.getElementById("listing-form");
    const el = [...(root?.querySelectorAll("label, h3") ?? [])].find((n) => heading.test(n.textContent ?? ""));
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusSource, sel]);

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

    setSaving(true);
    try {
      const saved = await patchExperienceAdmin(id, buildPatch(form));
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
  const todo: Array<[anchor: PartId, text: string]> = [];
  if (media.photos.length === 0) todo.push(["gallery", "Add a photo"]);
  if (!form.verdict.trim()) todo.push(["verdict", "Write the one-line verdict"]);
  if (!form.about.trim()) todo.push(["about", "Write the About"]);
  if (Number(form.priceFromInr) <= 0) todo.push(["info", "Set the price (or leave it for ask-the-host)"]);
  if (!form.timeSlot.trim() && !form.days.trim()) todo.push(["info", "Add the hours"]);
  if (!form.faqs.some((f) => f.q.trim() && f.a.trim())) todo.push(["faqs", "Add a few FAQs"]);

  const blocks = parseBlocks(form.baseContent.blocks);
  const order = readSections(form.baseContent.sections);
  const fixed = { more: readFixedShown(form.baseContent.sections, "more"), booking: readFixedShown(form.baseContent.sections, "booking") };
  const venue = form.format === "venue";

  // A listing in a category shows that category's layout, locked; ops fill in the content.
  const locked = form.categoryId !== null;
  const category = categories.find((c) => c.id === form.categoryId);
  const layoutStory = category?.layout.story ?? [];
  const shownOrder = locked ? readSections(category?.layout.sections) : order;
  const shownFixed = locked ? { more: readFixedShown(category?.layout.sections, "more"), booking: readFixedShown(category?.layout.sections, "booking") } : fixed;
  const layerItems: LayerItem[] = locked
    ? layoutStory.map((b) => ({ label: layoutBlockLabel(b), type: LAYOUT_LABEL[b.type], icon: BLOCK_ICON[b.type], half: b.size === "half", hidden: b.show === false }))
    : blocks.map((b) => ({ label: blockLabel(b), type: BLOCK_LABEL[b.type] ?? b.type, icon: BLOCK_ICON[b.type] ?? "type", half: b.size === "half", hidden: b.show === false }));
  const layoutBlock = locked && sel?.kind === "block" ? layoutStory[sel.index] : undefined;
  const selPart = sel?.kind === "part" ? sel.id : null;
  // Which editor cards the Edit tab opens: the part's, or the fields a layout block reads.
  const formKeys: Array<(typeof FORMS)[PartId][number]> = layoutBlock
    ? [...new Set(blockSources(layoutBlock).map((k) => sourceForm(k)).filter((k): k is NonNullable<typeof k> => !!k))]
    : selPart
      ? FORMS[selPart]
      : [];
  const showSec = (k: (typeof FORMS)[PartId][number]) => formKeys.includes(k);
  const current = !locked && sel?.kind === "block" ? blocks[sel.index] : undefined;

  /** One place that writes the layout, so every change is undoable. */
  function applyLayout(
    patch: { blocks?: StoryBlock[]; order?: SectionState[]; fixed?: Partial<typeof fixed> },
    to?: Sel,
    coalesce = false,
  ) {
    const f = form!;
    record(f, coalesce);
    const nextOrder = patch.order ?? order;
    const nextFixed = { ...fixed, ...patch.fixed };
    patchField("baseContent", {
      ...f.baseContent,
      ...(patch.blocks ? { blocks: patch.blocks } : {}),
      sections: writeSections(nextOrder, nextFixed),
    });
    if (to !== undefined) select(to);
  }
  const insertAt = (at: number, widget: number) => {
    applyLayout({ blocks: [...blocks.slice(0, at), structuredClone(WIDGETS[widget].block), ...blocks.slice(at)] }, { kind: "block", index: at });
  };
  const addWidget = (widget: number) => insertAt(sel?.kind === "block" ? sel.index + 1 : blocks.length, widget);
  const moveSection = (from: number, to: number) => {
    if (from === to) return;
    const next = order.slice();
    next.splice(to, 0, ...next.splice(from, 1));
    applyLayout({ order: next });
  };
  /** The id the live preview gives a selection. FAQs and tags have no spot on the page. */
  const pvId = (s: Sel): string | null => (s?.kind === "block" ? `block:${s.index}` : s?.kind === "part" && s.id !== "faqs" && s.id !== "tags" ? `part:${s.id}` : null);
  const selectFromLayers = (next: Sel) => {
    select(next);
    const id = pvId(next);
    if (id) setScrollTo((c) => ({ id, n: (c?.n ?? 0) + 1 }));
  };
  const fromPv = (id: string): Sel => (id.startsWith("block:") ? { kind: "block", index: Number(id.slice(6)) } : { kind: "part", id: id.slice(5) as PartId });
  const toggleSection = (id: SectionState["id"]) => applyLayout({ order: order.map((x) => (x.id === id ? { ...x, show: !x.show } : x)) });
  const toggleBlock = (i: number) => applyLayout({ blocks: blocks.map((b, j) => (j === i ? { ...b, show: b.show === false ? undefined : false } : b)) });
  const patchBlock = (i: number, b: StoryBlock, coalesce = false) => applyLayout({ blocks: blocks.map((x, j) => (j === i ? b : x)) }, undefined, coalesce);
  const startStory = () =>
    applyLayout({ blocks: seedBlocks({ title: form.title, about: form.about, included: form.included, notIncluded: form.notIncluded, carry: form.carry, faqs: form.faqs }) }, null);

  const editTitle = current ? BLOCK_LABEL[current.type] ?? current.type : layoutBlock ? LAYOUT_LABEL[layoutBlock.type] : selPart ? PART_META[selPart].label : null;
  const partShow = (id: PartId): boolean | null => {
    if (id === "more" || id === "booking") return fixed[id];
    return order.find((x) => x.id === id)?.show ?? null;
  };
  const partNote: Partial<Record<PartId, string>> = {
    gallery: "The photo gallery is always at the top. Manage the photos below.",
    host: "The host card comes from the host's page. Edit the host there.",
    reviews: "Reviews come from guests. Nothing to fill in here.",
    more: "Other listings in the city. Nothing to fill in here.",
    about: "The About story is built from the blocks in Layers. Write the plain About text here for listings without a custom story.",
  };

  /** Where a dragged part lands, as a position in the list once it has been lifted out. */
  const dropIndex = (from: number, target: number, after: boolean) => {
    const at = target + (after ? 1 : 0);
    return from < at ? at - 1 : at;
  };
  const hideLabel = (shown: boolean) => (shown ? "Hide from page" : "Show on page");

  return (
    <div className={styles2.app}>
      <header className={styles2.top}>
        <Link href="/listings" className={styles2.back} onClick={(e) => dirty && !window.confirm(LOSE_CHANGES) && e.preventDefault()}>
          ← Listings
        </Link>
        <div className={styles2.logo}>
          discovr<span className={styles2.logoTag}>Admin</span>
        </div>
        <div className={styles2.crumb}>
          /{" "}
          <select
            className={styles2.crumbSelect}
            aria-label="Listing"
            value={id}
            onChange={(e) => {
              if (dirty && !window.confirm(LOSE_CHANGES)) return;
              router.push(`/listings/${e.target.value}`);
            }}
          >
            {/* The open listing shows its live name, so a rename is visible before you save. */}
            {[{ id, title: form.title.trim() || "Untitled listing" }, ...(experiences ?? []).filter((x) => x.id !== id)]
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
          </select>
          <span className={`${styles2.pill} ${form.status === "published" ? styles2.pillLive : ""}`}>{form.status}</span>
        </div>
        <div className={styles2.spacer} />
        <span className={styles2.saveState} role="status">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button type="button" className={styles2.ibtn} aria-label="Undo" title="Undo (⌘Z)" disabled={past.length === 0} onClick={undo}>
          <Ic name="undo" size={17} />
        </button>
        <button type="button" className={styles2.ibtn} aria-label="Redo" title="Redo (⇧⌘Z)" disabled={future.length === 0} onClick={redo}>
          <Ic name="redo" size={17} />
        </button>
        <button type="button" className={`${styles2.btn} ${styles2.btnDanger}`} onClick={onDelete} disabled={saving || deleting}>
          <Ic name="trash" size={15} />
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button type="submit" form="listing-form" className={`${styles2.btn} ${styles2.btnPrimary}`} disabled={saving || deleting}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      <div className={styles2.main}>
        <ListingLayers
          sel={sel}
          onSel={selectFromLayers}
          hover={hoverId}
          onHover={setHoverId}
          items={layerItems}
          locked={locked}
          order={shownOrder}
          fixed={shownFixed}
          venue={venue}
          onMoveSection={moveSection}
          onToggleSection={toggleSection}
          onToggleFixed={(id) => applyLayout({ fixed: { [id]: !fixed[id] } })}
          onMoveBlock={(from, to) => applyLayout({ blocks: moveBlock(blocks, from, to) }, { kind: "block", index: to })}
          onToggleBlock={toggleBlock}
          onDuplicate={(i) => applyLayout({ blocks: [...blocks.slice(0, i + 1), structuredClone(blocks[i]), ...blocks.slice(i + 1)] }, { kind: "block", index: i + 1 })}
          onDelete={(i) => applyLayout({ blocks: blocks.filter((_, j) => j !== i) }, null)}
          onAdd={() => setTab("widgets")}
          onStart={startStory}
          onDropWidget={(w, at) => insertAt(at, w)}
        />

        <section className={styles2.mid}>
          <div className={styles2.tabs}>
            {locked ? null : (
              <button type="button" className={`${styles2.tab} ${tab === "widgets" ? styles2.tabOn : ""}`} onClick={() => setTab("widgets")}>
                <Ic name="widgets" size={15} />
                <span>Widgets</span>
              </button>
            )}
            <button type="button" className={`${styles2.tab} ${tab === "edit" ? styles2.tabOn : ""}`} onClick={() => setTab("edit")}>
              <Ic name="edit" size={15} />
              <span>{editTitle ? `Edit · ${current ? blockLabel(current) : layoutBlock ? layoutBlockLabel(layoutBlock) : editTitle}` : "Edit block"}</span>
            </button>
          </div>
          <div className={styles2.pane}>
            {tab === "widgets" && !locked ? (
              <WidgetLibrary
                blocks={blocks}
                order={order}
                noStory={blocks.length === 0}
                onAdd={addWidget}
                onShowSection={toggleSection}
              />
            ) : null}

            {tab === "edit" && !sel ? (
              <div className={styles2.paneInner}>
                <div className={styles2.ihead}>
                  <span className={styles2.iheadIc}>
                    <Ic name="edit" size={22} />
                  </span>
                  <div>
                    <h3 className={styles2.paneTitle}>Nothing selected</h3>
                    <p>Click any block in the phone or in Layers to fill in its details.</p>
                  </div>
                </div>
                {todo.length > 0 ? (
                  <section className={styles.todo} aria-label="Finish setting up">
                    <h2 className={`t-title-sm ${styles.sectionTitle}`}>Finish setting up</h2>
                    <ul className={styles.todoList}>
                      {todo.map(([anchor, text]) => (
                        <li key={text}>
                          <button type="button" className={styles.todoLink} onClick={() => select({ kind: "part", id: anchor })}>
                            {text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === "edit" && current && sel?.kind === "block" ? (
              <div className={styles2.paneInner}>
                <PaneHead icon={BLOCK_ICON[current.type] ?? "type"} title={blockLabel(current)} sub={BLOCK_LABEL[current.type] ?? current.type} />
                {HALF_OK.includes(current.type) ? (
                  <div className={styles2.isec}>
                    <h4 className={styles2.isecTitle}>Widget size</h4>
                    <div className={styles2.seg} role="group" aria-label="Width">
                      <button type="button" className={current.size === "half" ? styles2.segOn : ""} aria-pressed={current.size === "half"} onClick={() => patchBlock(sel.index, { ...current, size: "half" })}>
                        <span className={styles2.szic}>
                          <i className="f" />
                          <i />
                        </span>
                        Half width
                      </button>
                      <button type="button" className={current.size !== "half" ? styles2.segOn : ""} aria-pressed={current.size !== "half"} onClick={() => patchBlock(sel.index, { ...current, size: undefined })}>
                        <span className={styles2.szic}>
                          <i className="f" />
                          <i className="f" />
                        </span>
                        Full width
                      </button>
                    </div>
                    <p className={styles2.note} style={{ marginTop: 10 }}>
                      Two half-width widgets next to each other sit side by side. A lone one stays full width.
                    </p>
                  </div>
                ) : null}
                <div className={styles2.isec}>
                  <h4 className={styles2.isecTitle}>Content</h4>
                  <div className={styles2.isecBody}>
                    <BlockEditor block={current} onChange={(b) => patchBlock(sel.index, b, true)} />
                  </div>
                </div>
                <div className={styles2.ifoot}>
                  <button type="button" className={styles2.btn} onClick={() => toggleBlock(sel.index)}>
                    <Ic name={current.show === false ? "eye" : "eyeoff"} size={15} />
                    {hideLabel(current.show !== false)}
                  </button>
                  <button type="button" className={styles2.btn} disabled={sel.index === 0} onClick={() => applyLayout({ blocks: moveBlock(blocks, sel.index, sel.index - 1) }, { kind: "block", index: sel.index - 1 })}>
                    <Ic name="up" size={15} />
                    Move up
                  </button>
                  <button type="button" className={styles2.btn} disabled={sel.index === blocks.length - 1} onClick={() => applyLayout({ blocks: moveBlock(blocks, sel.index, sel.index + 1) }, { kind: "block", index: sel.index + 1 })}>
                    <Ic name="chev" size={15} />
                    Move down
                  </button>
                  <button type="button" className={styles2.btn} onClick={() => applyLayout({ blocks: [...blocks.slice(0, sel.index + 1), structuredClone(current), ...blocks.slice(sel.index + 1)] }, { kind: "block", index: sel.index + 1 })}>
                    <Ic name="copy" size={15} />
                    Duplicate
                  </button>
                  <button type="button" className={`${styles2.btn} ${styles2.btnDanger}`} onClick={() => applyLayout({ blocks: blocks.filter((_, j) => j !== sel.index) }, null)}>
                    <Ic name="trash" size={15} />
                    Delete
                  </button>
                </div>
              </div>
            ) : null}

            {tab === "edit" && layoutBlock && sel?.kind === "block" ? (
              <div className={styles2.paneInner} style={{ paddingBottom: 0 }}>
                <PaneHead icon={BLOCK_ICON[layoutBlock.type]} title={layoutBlockLabel(layoutBlock)} sub={`${LAYOUT_LABEL[layoutBlock.type]} · from ${category?.name ?? "category"}`} />
                <p className={styles2.note}>
                  {blockSources(layoutBlock).length
                    ? `Shows: ${blockSources(layoutBlock).map(sourceLabel).join(", ")}. Fill it in below. The block hides itself when it is empty.`
                    : "Fixed text from the category. Nothing to fill in here."}
                </p>
              </div>
            ) : null}

            {tab === "edit" && selPart ? (
              <div className={styles2.paneInner} style={{ paddingBottom: 0 }}>
                <PaneHead icon={PART_ICON[selPart]} title={PART_META[selPart].label} sub={PART_META[selPart].hint} />
                {partNote[selPart] ? <p className={styles2.note}>{partNote[selPart]}</p> : null}
                {partShow(selPart) !== null && !locked ? (
                  <div className={styles2.ifoot}>
                    <button
                      type="button"
                      className={styles2.btn}
                      onClick={() => (selPart === "more" || selPart === "booking" ? applyLayout({ fixed: { [selPart]: !fixed[selPart] } }) : toggleSection(selPart as SectionState["id"]))}
                    >
                      <Ic name={partShow(selPart) ? "eyeoff" : "eye"} size={15} />
                      {hideLabel(partShow(selPart) === true)}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <form id="listing-form" className={`${styles2.paneInner} ${styles.editForm}`} onSubmit={onSave} hidden={tab !== "edit" || formKeys.length === 0}>
        <div id="sec-photos" className={styles.group} hidden={!showSec("photos")}>
        <ListingPhotos
          experienceId={id}
          title={form.title.trim()}
          photos={media.photos}
          menuPages={media.menuPages}
          onSaved={(row) => setMedia(listingMedia(row))}
        />
        </div>
        <div id="sec-basics" className={styles.section} hidden={!showSec("basics")}>
          <h2 className={`t-title-sm ${styles.sectionTitle}`}>Basics</h2>
          <div className={styles.grid2}>
            <div className={`${styles.selectField} ${styles.full}`}>
              <label className={styles.textareaLabel} htmlFor="listing-category">
                Category
              </label>
              <select
                id="listing-category"
                className={styles.select}
                value={form.categoryId ?? ""}
                onChange={(e) => {
                  const next = e.target.value || null;
                  const name = categories.find((c) => c.id === next)?.name;
                  const msg = next ? `This listing will use the ${name} layout. Its own story blocks stay saved but won't be shown.` : "This listing goes back to its own layout.";
                  if (!window.confirm(`${msg} Continue?`)) return;
                  patchField("categoryId", next);
                  setSel(null);
                }}
              >
                <option value="">None (own layout)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className={`t-body-sm ${styles.hint}`}>A category fixes the page layout. You fill in the content.</p>
            </div>
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

        <div id="sec-place" className={styles.section} hidden={!showSec("place")}>
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

        <div id="sec-price" className={styles.section} hidden={!showSec("price")}>
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

        <div id="sec-when" className={styles.section} hidden={!showSec("when")}>
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

        <div id="sec-links" className={styles.section} hidden={!showSec("links")}>
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

        <div id="sec-booking" className={styles.section} hidden={!showSec("booking")}>
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

        <div id="sec-faqs" className={styles.section} hidden={!showSec("faqs")}>
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

        <div id="sec-policy" className={styles.section} hidden={!showSec("policy")}>
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

        <div id="sec-story" className={styles.section} hidden={!showSec("story")}>
          <StoryContentFields content={form.baseContent} onChange={(c) => patchField("baseContent", c)} />
        </div>
        <div id="sec-tags" className={styles.section} hidden={!showSec("tags")}>
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

            </form>
          </div>
        </section>

        <section className={styles2.stage} aria-label="Mobile preview">
          <div className={styles2.stagebar}>
            <div>
              <div className={styles2.t}>Mobile preview</div>
              <div className={styles2.s}>discovr.in/experiences/{form.slug || "untitled"}</div>
            </div>
            {locked ? null : (
              <button type="button" className={`${styles2.btn} ${styles2.btnSm} ${arranging ? styles2.btnActive : ""}`} aria-pressed={arranging} onClick={() => setArranging(!arranging)}>
                <Ic name={arranging ? "check" : "move"} size={14} />
                {arranging ? "Done" : "Arrange"}
              </button>
            )}
          </div>
          <LivePreview
            id={id}
            draft={buildPatch(form)}
            mediaKey={media.photos.map((ph) => `${ph.id}${ph.src}${ph.isCover}`).join() + media.menuPages.map((m) => `${m.id}${m.src}`).join()}
            selected={pvId(sel)}
            hover={hoverId}
            arranging={arranging}
            scrollTo={scrollTo}
            onSelect={(pv) => select(fromPv(pv))}
            onHover={setHoverId}
            onArrange={setArranging}
            onAdd={() => setTab("widgets")}
            onMove={(from, to, after) => {
              if (from.startsWith("block:")) {
                const a = Number(from.slice(6));
                const b = dropIndex(a, Number(to.slice(6)), after);
                applyLayout({ blocks: moveBlock(blocks, a, b) }, { kind: "block", index: b });
              } else {
                const a = order.findIndex((x) => `part:${x.id}` === from);
                moveSection(a, dropIndex(a, order.findIndex((x) => `part:${x.id}` === to), after));
              }
            }}
            onRemove={(pv) => {
              if (pv.startsWith("block:")) applyLayout({ blocks: blocks.filter((_, j) => j !== Number(pv.slice(6))) }, null);
              else toggleSection(pv.slice(5) as SectionState["id"]);
            }}
          />
        </section>
      </div>
    </div>
  );
}


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
