/**
 * Order and visibility of the guest page parts, saved in `content.sections`.
 * Mirrors `discovr-frontend/src/features/experience/utils/sections.ts`: keep the two in step.
 */
export type SectionId = "title" | "info" | "verdict" | "actions" | "about" | "menu" | "policy" | "host" | "reviews";
export type FixedId = "gallery" | "more" | "booking";
export type PartId = SectionId | FixedId | "faqs" | "tags";

/** The page as it has always been. */
export const DEFAULT_SECTIONS: SectionId[] = ["title", "info", "verdict", "actions", "about", "menu", "policy", "host", "reviews"];

export type SectionState = { id: SectionId; show: boolean };

export const PART_META: Record<PartId, { label: string; hint: string; glyph: string }> = {
  gallery: { label: "Photo gallery", hint: "Always at the top", glyph: "▣" },
  title: { label: "Title & price", hint: "Name, host", glyph: "T" },
  info: { label: "Price, place & hours", hint: "The info list", glyph: "◷" },
  verdict: { label: "Verdict", hint: "One-line take", glyph: "“" },
  actions: { label: "Action buttons", hint: "Call, directions, share", glyph: "⚡" },
  about: { label: "About", hint: "The story below", glyph: "≣" },
  menu: { label: "Menu", hint: "Pages or link", glyph: "▤" },
  policy: { label: "Booking & cancellation", hint: "Terms and policy", glyph: "≡" },
  host: { label: "Host card", hint: "Who runs it", glyph: "☺" },
  reviews: { label: "Reviews", hint: "From guests", glyph: "★" },
  more: { label: "More in Goa", hint: "Related listings", glyph: "◎" },
  booking: { label: "Booking bar", hint: "Call or link button", glyph: "▭" },
  faqs: { label: "FAQs", hint: "Feeds the default story", glyph: "?" },
  tags: { label: "Tags", hint: "Search and cards", glyph: "#" },
};

type Saved = { id: string; show?: boolean };

function asList(value: unknown): Saved[] {
  return Array.isArray(value) ? value.filter((v): v is Saved => !!v && typeof (v as { id?: unknown }).id === "string") : [];
}

/** Saved layout merged with the default: unknown ids dropped, missing ones kept after the part before them. */
export function readSections(value: unknown): SectionState[] {
  const saved = asList(value);
  const known = new Set<string>(DEFAULT_SECTIONS);
  const out = saved
    .filter((s, i) => known.has(s.id) && saved.findIndex((x) => x.id === s.id) === i)
    .map((s) => ({ id: s.id as SectionId, show: s.show !== false }));
  for (const id of DEFAULT_SECTIONS) {
    if (out.some((s) => s.id === id)) continue;
    const prev = DEFAULT_SECTIONS[DEFAULT_SECTIONS.indexOf(id) - 1];
    out.splice(prev ? out.findIndex((s) => s.id === prev) + 1 : 0, 0, { id, show: true });
  }
  return out;
}

export function readFixedShown(value: unknown, id: FixedId): boolean {
  const saved = asList(value).find((s) => s.id === id);
  return saved ? saved.show !== false : true;
}

/** What gets saved. The default layout saves as nothing, so untouched listings stay untouched. */
export function writeSections(order: SectionState[], fixed: Partial<Record<FixedId, boolean>>): Saved[] | undefined {
  const isDefault = order.every((s, i) => s.id === DEFAULT_SECTIONS[i] && s.show) && Object.values(fixed).every((v) => v !== false);
  if (isDefault) return undefined;
  return [
    ...order.map(({ id, show }) => ({ id, ...(show ? {} : { show: false }) })),
    ...(Object.entries(fixed) as Array<[FixedId, boolean]>).filter(([, v]) => v === false).map(([id]) => ({ id, show: false })),
  ];
}

/** Which form sections open in the Edit tab for each part. */
export const FORMS: Record<PartId, Array<"photos" | "basics" | "place" | "price" | "when" | "links" | "faqs" | "policy" | "tags" | "booking" | "story">> = {
  gallery: ["photos"],
  title: ["basics"],
  info: ["price", "place", "when"],
  verdict: ["basics"],
  actions: ["links"],
  about: ["basics"],
  menu: ["photos", "links"],
  policy: ["policy"],
  host: [],
  reviews: [],
  more: [],
  booking: ["booking"],
  faqs: ["faqs"],
  tags: ["tags"],
};
