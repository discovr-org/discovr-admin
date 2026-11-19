/**
 * A category's page layout. Story blocks name the listing field they fill (`source`), so a listing
 * keeps only its content. Mirrors `discovr-frontend/src/features/experience/utils/layout.ts`: keep the two in step.
 */
export type LayoutBlock = { size?: "full" | "half"; show?: boolean; when?: string; space?: "none" | "large"; hide?: "mobile" | "desktop" } & (
  | { type: "heading"; level: "section" | "small"; text?: string; source?: string }
  | { type: "line" }
  | { type: "menu" }
  | { type: "text"; label?: string; text?: string; source?: string }
  | { type: "quote"; text?: string; source?: string }
  | { type: "checklist"; title: string; source: string }
  | { type: "forNotFor"; columns: Array<{ title: string; tone: "included" | "bring"; source: string }> }
  | { type: "callout"; tone: "heads_up" | "tip"; title: string; text?: string; source?: string }
  | { type: "faq"; source?: string }
  | { type: "steps"; source?: string }
  | { type: "stats"; tiles: Array<{ label: string; source: string }> }
  | { type: "packages"; title?: string; source?: string }
  | { type: "photo"; source: string }
);

export type LayoutBlockType = LayoutBlock["type"];
export type CategoryLayout = { sections?: Array<{ id: string; show?: boolean }>; story?: LayoutBlock[] };

export type Category = { id: string; slug: string; name: string; layout: CategoryLayout; listingCount?: number };

export type SourceKind = "text" | "lines" | "faqs" | "steps" | "packages" | "photo";

/** A field on a listing that a layout block can show. `form` is the editor card where ops fill it in. */
export type Source = { key: string; label: string; kind: SourceKind; form: "basics" | "price" | "when" | "policy" | "faqs" | "story" };

export const SOURCES: Source[] = [
  { key: "title", label: "Listing title", kind: "text", form: "basics" },
  { key: "about", label: "About", kind: "text", form: "basics" },
  { key: "verdict", label: "Verdict", kind: "text", form: "basics" },
  { key: "pitch", label: "Pitch (one line)", kind: "text", form: "policy" },
  { key: "healthAdvisory", label: "Health advisory", kind: "text", form: "policy" },
  { key: "additionalInfo", label: "Additional info", kind: "text", form: "policy" },
  { key: "fitnessLevel", label: "Fitness level", kind: "text", form: "policy" },
  { key: "instructorRatio", label: "Instructor ratio", kind: "text", form: "policy" },
  { key: "ageGroup", label: "Age", kind: "text", form: "when" },
  { key: "bestTime", label: "Best time", kind: "text", form: "when" },
  { key: "priceNarrative", label: "Price note", kind: "text", form: "price" },
  { key: "termsDetail", label: "Terms detail", kind: "text", form: "policy" },
  { key: "included", label: "What's included", kind: "lines", form: "policy" },
  { key: "notIncluded", label: "What's not included", kind: "lines", form: "policy" },
  { key: "carry", label: "Things to bring", kind: "lines", form: "policy" },
  { key: "knowBeforeYouGo", label: "Know before you go", kind: "lines", form: "policy" },
  { key: "faqs", label: "FAQs", kind: "faqs", form: "faqs" },
  { key: "steps", label: "Process steps", kind: "steps", form: "story" },
  { key: "packages", label: "Packages & prices", kind: "packages", form: "story" },
  ...[0, 1, 2, 3, 4, 5].map((n): Source => ({ key: `storyPhotos.${n}`, label: `Story photo ${n + 1}`, kind: "photo", form: "story" })),
];

export const sourcesOf = (kind: SourceKind) => SOURCES.filter((s) => s.kind === kind);
export const sourceLabel = (key: string | undefined) => SOURCES.find((s) => s.key === key)?.label ?? key ?? "";
export const sourceForm = (key: string | undefined) => SOURCES.find((s) => s.key === key)?.form;

export const LAYOUT_LABEL: Record<LayoutBlockType, string> = {
  heading: "Heading",
  line: "Divider",
  menu: "Menu",
  text: "Text",
  quote: "Quote",
  checklist: "Checklist",
  forNotFor: "Included / Not included",
  callout: "Callout",
  faq: "FAQ",
  steps: "Steps",
  stats: "Stat tiles",
  packages: "Packages & prices",
  photo: "Photo",
};

/** Blocks that can sit half width next to another half block. */
export const LAYOUT_HALF_OK: LayoutBlockType[] = ["callout", "quote", "photo", "checklist", "stats", "text"];

/** What a block is called in Layers: its own title, else the field it fills. */
export function layoutBlockLabel(b: LayoutBlock): string {
  switch (b.type) {
    case "heading":
      return (b.source ? sourceLabel(b.source) : b.text) || "Heading";
    case "checklist":
    case "callout":
      return b.title || LAYOUT_LABEL[b.type];
    case "packages":
      return b.title || LAYOUT_LABEL.packages;
    case "text":
      return b.label || (b.source ? sourceLabel(b.source) : b.text) || "Text";
    case "quote":
      return b.source ? sourceLabel(b.source) : b.text || "Quote";
    case "photo":
      return sourceLabel(b.source);
    case "stats":
      return b.tiles.map((t) => t.label).filter(Boolean).join(" · ") || LAYOUT_LABEL.stats;
    case "faq":
    case "steps":
      return LAYOUT_LABEL[b.type];
    case "forNotFor":
      return b.columns.map((c) => c.title).filter(Boolean).join(" / ") || LAYOUT_LABEL.forNotFor;
    default:
      return LAYOUT_LABEL[b.type];
  }
}

/** Every listing field a block reads, so the listing editor can open the right card. */
export function blockSources(b: LayoutBlock): string[] {
  const own = "source" in b && b.source ? [b.source] : b.type === "faq" ? ["faqs"] : b.type === "menu" ? ["menu"] : b.type === "steps" ? ["steps"] : b.type === "packages" ? ["packages"] : [];
  const more = b.type === "forNotFor" ? b.columns.map((c) => c.source) : b.type === "stats" ? b.tiles.map((t) => t.source) : [];
  return [...own, ...more].filter(Boolean);
}

/** Blocks a category can add. Fields start set to the likeliest source. */
export const LAYOUT_WIDGETS: Array<{ name: string; block: LayoutBlock }> = [
  { name: "Heading", block: { type: "heading", level: "section", source: "title" } },
  { name: "Text", block: { type: "text", label: "About", source: "about" } },
  { name: "Quote", block: { type: "quote", source: "pitch" } },
  { name: "Photo", block: { type: "photo", source: "storyPhotos.0" } },
  {
    name: "Included / Not included",
    block: {
      type: "forNotFor",
      columns: [
        { title: "What's Included", tone: "included", source: "included" },
        { title: "What's Not Included", tone: "bring", source: "notIncluded" },
      ],
    },
  },
  { name: "Checklist", block: { type: "checklist", title: "Things to Get With You", source: "carry" } },
  { name: "Steps", block: { type: "steps", source: "steps" } },
  { name: "Callout", block: { type: "callout", tone: "heads_up", title: "Health Advisory", source: "healthAdvisory" } },
  { name: "Know before you go", block: { type: "callout", tone: "tip", title: "Know Before You Go", source: "knowBeforeYouGo" } },
  { name: "FAQ", block: { type: "faq", source: "faqs" } },
  { name: "Age & fitness", block: { type: "stats", tiles: [{ label: "Age", source: "ageGroup" }, { label: "Fitness level", source: "fitnessLevel" }] } },
  { name: "Packages & prices", block: { type: "packages", title: "Packages", source: "packages" } },
  { name: "Menu", block: { type: "menu" } },
  { name: "Divider", block: { type: "line" } },
];

/** Starting layouts. They follow what the guest app builds today for trips and places. */
export const TEMPLATES: Array<{ id: string; name: string; hint: string; layout: CategoryLayout }> = [
  { id: "blank", name: "Blank", hint: "Start empty and add blocks.", layout: { story: [] } },
  {
    id: "trip",
    name: "Trip or activity",
    hint: "Pitch, About, photo, facts, included, process, advisory, bring list, tips, FAQs.",
    layout: {
      story: [
        { type: "heading", level: "section", source: "title" },
        { type: "line" },
        { type: "quote", source: "pitch" },
        { type: "line", when: "pitch" },
        { type: "text", label: "About", source: "about" },
        { type: "photo", source: "storyPhotos.0" },
        { type: "stats", tiles: [{ label: "Age", source: "ageGroup" }, { label: "Fitness level", source: "fitnessLevel" }, { label: "Instructors", source: "instructorRatio" }] },
        { type: "forNotFor", columns: [{ title: "What's Included", tone: "included", source: "included" }, { title: "What's Not Included", tone: "bring", source: "notIncluded" }] },
        { type: "line" },
        { type: "heading", level: "small", text: "The Process", when: "steps" },
        { type: "steps", source: "steps" },
        { type: "callout", tone: "heads_up", title: "Health Advisory", source: "healthAdvisory" },
        { type: "line", when: "carry" },
        { type: "checklist", title: "Things to Get With You", source: "carry" },
        { type: "callout", tone: "tip", title: "Know Before You Go", source: "knowBeforeYouGo" },
        { type: "line", when: "faqs" },
        { type: "heading", level: "small", text: "FAQ's", when: "faqs" },
        { type: "faq", source: "faqs" },
      ],
    },
  },
  {
    id: "place",
    name: "Place (bar, restaurant)",
    hint: "Lead quote, photo, tips, FAQs.",
    layout: {
      story: [
        { type: "heading", level: "section", source: "title" },
        { type: "line" },
        { type: "quote", source: "about" },
        { type: "photo", source: "storyPhotos.0" },
        { type: "callout", tone: "tip", title: "Know Before You Go", source: "knowBeforeYouGo" },
        { type: "line", when: "faqs" },
        { type: "heading", level: "small", text: "FAQ's", when: "faqs" },
        { type: "faq", source: "faqs" },
      ],
    },
  },
];
