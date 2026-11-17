/** Same shapes the guest app renders in the About story (`discovr-frontend/src/types/experience.ts`). */
/** `show: false` hides the block on the guest page. Two `half` blocks in a row sit side by side. */
export type BlockFlags = { show?: boolean; size?: "full" | "half" };

export type StoryBlock = BlockFlags &
  (
  | { type: "heading"; level: "section" | "small"; text: string }
  | { type: "line" }
  | { type: "quote"; text: string; plain?: boolean; cite?: string }
  | { type: "text"; paragraphs: Array<{ text: string; strong?: boolean }> }
  | { type: "photo"; src: string; alt: string; caption?: string }
  | { type: "forNotFor"; columns: Array<{ title: string; tone: "included" | "bring"; items: string[] }> }
  | { type: "steps"; items: Array<{ marker: string; title: string; caption?: string }> }
  | { type: "callout"; tone: "heads_up" | "tip"; title: string; paragraphs: string[] }
  | { type: "checklist"; title: string; items: string[] }
  | { type: "faq"; items: Array<{ q: string; a: string }> }
  | { type: "stats"; items: Array<{ label: string; value: string }> }
  | { type: "packages"; title?: string; items: Array<{ name: string; detail?: string; price: string }> }
  );

export type BlockType = StoryBlock["type"];

export const BLOCK_LABEL: Record<BlockType, string> = {
  heading: "Heading",
  line: "Divider",
  quote: "Quote",
  text: "Text",
  photo: "Photo",
  forNotFor: "Included / Not included",
  steps: "Steps",
  callout: "Callout",
  checklist: "Checklist",
  faq: "FAQ",
  stats: "Stat tiles",
  packages: "Packages & prices",
};

/** Blocks that can sit half width next to another half block. */
export const HALF_OK: BlockType[] = ["callout", "quote", "photo", "checklist", "stats", "text"];

/** Blocks an editor can add. Click one to put it in the story. */
export const WIDGETS: Array<{ name: string; block: StoryBlock }> = [
  { name: "Heading", block: { type: "heading", level: "section", text: "New heading" } },
  { name: "Text", block: { type: "text", paragraphs: [{ text: "Write a short paragraph." }] } },
  { name: "Photo", block: { type: "photo", src: "", alt: "" } },
  { name: "Quote", block: { type: "quote", text: "One line that sells it.", plain: false } },
  {
    name: "Included / Not included",
    block: {
      type: "forNotFor",
      columns: [
        { title: "What's included", tone: "included", items: ["Item"] },
        { title: "What's not included", tone: "bring", items: ["Item"] },
      ],
    },
  },
  { name: "Checklist", block: { type: "checklist", title: "Things to bring", items: ["Item"] } },
  {
    name: "Steps",
    block: { type: "steps", items: [{ marker: "1", title: "First step", caption: "" }] },
  },
  {
    name: "Callout",
    block: { type: "callout", tone: "heads_up", title: "Heads up", paragraphs: ["Say what guests should know."] },
  },
  { name: "FAQ", block: { type: "faq", items: [{ q: "Question?", a: "Answer." }] } },
  {
    name: "Age & fitness",
    block: { type: "stats", items: [{ label: "Age", value: "10+" }, { label: "Fitness level", value: "Easy - Moderate" }] },
  },
  {
    name: "Packages & prices",
    block: { type: "packages", title: "Packages", items: [{ name: "Beginner", detail: "30 min briefing + 30 min ride", price: "3250" }] },
  },
  {
    name: "Health advisory",
    block: { type: "callout", tone: "heads_up", title: "Health advisory", paragraphs: ["Tell the host about any medical condition before booking."] },
  },
  {
    name: "Good to know",
    block: { type: "callout", tone: "tip", title: "Good to know", paragraphs: ["Lockers and showers on site."], size: "half" },
  },
  { name: "Divider", block: { type: "line" } },
];

/** The saved value is `unknown`; keep only objects with a `type` so a bad row can't crash the editor. */
export function parseBlocks(value: unknown): StoryBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (b): b is StoryBlock => !!b && typeof b === "object" && typeof (b as { type?: unknown }).type === "string",
  );
}

export function blockLabel(b: StoryBlock): string {
  const known = BLOCK_LABEL[b.type] ?? b.type;
  switch (b.type) {
    case "checklist":
    case "callout":
      return b.title?.trim() || known;
    case "packages":
      return b.title?.trim() || known;
    case "stats":
      return b.items.map((t) => t.label).filter(Boolean).join(" · ") || known;
    case "heading":
    case "quote":
      return b.text?.trim() || known;
    case "text":
      return b.paragraphs?.find((p) => p.text.trim())?.text.trim() || known;
    case "photo":
      return b.caption?.trim() || b.alt?.trim() || known;
    default:
      return known;
  }
}

export function moveBlock(blocks: StoryBlock[], from: number, to: number): StoryBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = blocks.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Drop blank lines and empty items so editors can type freely and the guest page stays clean. */
export function cleanBlocks(blocks: StoryBlock[]): StoryBlock[] {
  const lines = (a: string[] | undefined) => (a ?? []).map((s) => s.trim()).filter(Boolean);
  return blocks.map((b) => {
    switch (b.type) {
      case "text":
        return { ...b, paragraphs: b.paragraphs.filter((p) => p.text.trim()) };
      case "forNotFor":
        return { ...b, columns: b.columns.map((c) => ({ ...c, items: lines(c.items) })) };
      case "checklist":
        return { ...b, items: lines(b.items) };
      case "callout":
        return { ...b, paragraphs: lines(b.paragraphs) };
      case "steps":
        return { ...b, items: b.items.filter((s) => s.title.trim()) };
      case "stats":
        return { ...b, items: b.items.filter((t) => t.label.trim() || t.value.trim()) };
      case "packages":
        return { ...b, items: b.items.filter((t) => t.name.trim()) };
      case "faq":
        return { ...b, items: b.items.filter((f) => f.q.trim() && f.a.trim()) };
      default:
        return b;
    }
  });
}

type SeedInput = {
  title: string;
  about: string;
  included: string[];
  notIncluded: string[];
  carry: string[];
  faqs: Array<{ q: string; a: string }>;
};

/** A first custom story built from the listing's own fields. */
export function seedBlocks(x: SeedInput): StoryBlock[] {
  const filled = (a: string[]) => a.map((s) => s.trim()).filter(Boolean);
  const blocks: StoryBlock[] = [{ type: "heading", level: "section", text: x.title }, { type: "line" }];
  if (x.about.trim()) blocks.push({ type: "text", paragraphs: [{ text: x.about.trim() }] });
  const included = filled(x.included);
  const notIncluded = filled(x.notIncluded);
  if (included.length || notIncluded.length) {
    blocks.push({
      type: "forNotFor",
      columns: [
        { title: "What's included", tone: "included", items: included },
        { title: "What's not included", tone: "bring", items: notIncluded },
      ],
    });
  }
  const carry = filled(x.carry);
  if (carry.length) blocks.push({ type: "checklist", title: "Things to bring", items: carry });
  const faqs = x.faqs.filter((f) => f.q.trim() && f.a.trim());
  if (faqs.length) blocks.push({ type: "line" }, { type: "heading", level: "small", text: "FAQ's" }, { type: "faq", items: faqs });
  return blocks;
}
