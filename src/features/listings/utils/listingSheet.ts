import { WEEKDAYS, type Weekday } from "@/shared/utils/catalogApi";
import { blockSources, type CategoryLayout } from "@/features/categories/utils/layout";
import { blankRow, slugFromTitle, toForm, type FormState } from "../components/EditListingScreen";
import { readFixedShown, readSections } from "./pageLayout";
import { coordsFromMapsUrl } from "./mapsUrl";

/** Who a sheet row can point at. Hosts and categories are named in the sheet, not by id. */
export type SheetContext = {
  hosts: Array<{ id: string; businessName: string }>;
  categories: Array<{ id: string; slug: string; name: string }>;
};

type Col = { key: string; hint: string; get: (f: FormState) => string; set: (f: FormState, v: string) => FormState; issue?: (v: string) => string | null };

const YES = ["yes", "y", "true", "1"];
const NO = ["no", "n", "false", "0"];
const splitList = (v: string, commas = false) => v.split(commas ? /\r?\n|,| \| / : /\r?\n| \| /).map((s) => s.trim()).filter(Boolean);

type StrKey = "title" | "slug" | "verdict" | "about" | "placeName" | "placeNeighborhood" | "priceFromInr" | "durationMinutes" | "groupSizeMax" | "groupSizeLabel" | "days" | "timeSlot" | "altTimeSlot" | "bestTime" | "ageGroup" | "minPeople" | "durationLabel" | "aka" | "priceNarrative" | "priceUnit" | "meetingPoint" | "phones" | "additionalInfo" | "termsDetail" | "pitch" | "fitnessLevel" | "instructorRatio" | "healthAdvisory" | "policySummary" | "menuUrl" | "instagramUrl" | "whatsappUrl" | "bookUrl" | "bookLabel" | "barText" | "barNote";
type ListKey = "tags" | "carry" | "knowBeforeYouGo" | "included" | "notIncluded" | "bookingNotes" | "cancellationNotes";

const str = (key: string, field: StrKey, hint: string): Col => ({ key, hint, get: (f) => f[field], set: (f, v) => ({ ...f, [field]: v.trim() }) });
const list = (key: string, field: ListKey, hint: string): Col => ({ key, hint, get: (f) => f[field].join("\n"), set: (f, v) => ({ ...f, [field]: splitList(v, field === "tags") }) });
const choice = <K extends "status" | "taxes" | "format" | "bookVia">(key: string, field: K, options: Array<FormState[K]>, hint: string): Col => ({
  key,
  hint: `${hint} One of: ${options.join(", ")}.`,
  get: (f) => String(f[field]),
  set: (f, v) => (options.includes(v.trim().toLowerCase() as FormState[K]) ? { ...f, [field]: v.trim().toLowerCase() } : f),
  issue: (v) => (!v.trim() || options.includes(v.trim().toLowerCase() as FormState[K]) ? null : `${key} must be ${options.join(", ")}`),
});
const yesNo = (key: string, field: "walkIn" | "showFinalTermsNote", hint: string): Col => ({
  key,
  hint: `${hint} yes or no.`,
  get: (f) => (f[field] ? "yes" : "no"),
  set: (f, v) => (YES.includes(v.trim().toLowerCase()) ? { ...f, [field]: true } : NO.includes(v.trim().toLowerCase()) ? { ...f, [field]: false } : f),
  issue: (v) => (!v.trim() || [...YES, ...NO].includes(v.trim().toLowerCase()) ? null : `${key} must be yes or no`),
});
const days = (key: string, field: "altDays" | "closedDays", hint: string): Col => ({
  key,
  hint: `${hint} Comma list: ${WEEKDAYS.join(", ")}.`,
  get: (f) => f[field].join(", "),
  set: (f, v) => ({ ...f, [field]: splitList(v, true).flatMap((d) => WEEKDAYS.filter((w) => w.toLowerCase() === d.slice(0, 3).toLowerCase())) as Weekday[] }),
});
const faq = (n: number, part: "q" | "a"): Col => ({
  key: `faq_${n}_${part === "q" ? "question" : "answer"}`,
  hint: `FAQ ${n} ${part === "q" ? "question" : "answer"}.`,
  get: (f) => f.faqs[n - 1]?.[part] ?? "",
  set: (f, v) => {
    const faqs = [...f.faqs];
    while (faqs.length < n) faqs.push({ q: "", a: "" });
    faqs[n - 1] = { ...faqs[n - 1], [part]: v.trim() };
    return { ...f, faqs };
  },
});

type Step = { marker?: string; title: string; caption?: string };
type Pack = { name: string; price: string; detail?: string };
const rowsOf = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
/** Sets one field of the n-th row of a list kept in the listing's content (steps, packages). Empty rows are dropped when the row is finished. */
function inContent<T extends object>(f: FormState, key: "steps" | "packages", n: number, blank: T, field: string, v: string): FormState {
  const list = [...rowsOf<T>(f.baseContent[key])];
  while (list.length < n) list.push({ ...blank });
  list[n - 1] = { ...list[n - 1], [field]: v.trim() };
  return { ...f, baseContent: { ...f.baseContent, [key]: list } };
}
const step = (n: number, part: "title" | "caption"): Col => ({
  key: `step_${n}_${part}`,
  hint: `Process step ${n} ${part}.`,
  get: (f) => rowsOf<Step>(f.baseContent.steps)[n - 1]?.[part] ?? "",
  set: (f, v) => inContent<Step>(f, "steps", n, { title: "" }, part, v),
});
const pack = (n: number, part: "name" | "price" | "detail"): Col => ({
  key: `package_${n}_${part}`,
  hint: `Price row ${n} ${part}${part === "price" ? " (rupees)" : ""}.`,
  get: (f) => rowsOf<Pack>(f.baseContent.packages)[n - 1]?.[part] ?? "",
  set: (f, v) => inContent<Pack>(f, "packages", n, { name: "", price: "" }, part, v),
});

/** Everything the sheet carries after `title`, `slug`, `host` and `category`. Photos and custom story blocks are not in it. */
const COLUMNS: Col[] = [
  choice("status", "status", ["draft", "published", "archived"], "Leave empty for draft. Published needs a verdict."),
  str("verdict", "verdict", "One line. Required to publish."),
  str("about", "about", "The About text."),
  str("pitch", "pitch", "The lead quote."),
  str("place_name", "placeName", "Name of the place."),
  str("neighborhood", "placeNeighborhood", "Area, like Baga."),
  {
    key: "map_link",
    hint: "Google Maps link. The pin position is read from it when it has one.",
    get: (f) => f.mapsUrl,
    set: (f, v) => {
      const at = coordsFromMapsUrl(v);
      return { ...f, mapsUrl: v.trim(), ...(at ? { placeLat: String(at.lat), placeLng: String(at.lng) } : {}) };
    },
  },
  str("meeting_point", "meetingPoint", "Where guests meet."),
  str("price_from", "priceFromInr", "Number in rupees."),
  str("price_narrative", "priceNarrative", "Short price story."),
  str("price_unit", "priceUnit", "Like per person or for two."),
  choice("taxes", "taxes", ["inclusive", "extra"], "Whether the price includes taxes."),
  choice("format", "format", ["trip", "venue"], "A trip has times and group size; a venue does not."),
  yesNo("walk_in", "walkIn", "Venues only: no booking needed."),
  str("duration_minutes", "durationMinutes", "Number of minutes."),
  str("duration_label", "durationLabel", "Like 2 hrs."),
  str("group_size_max", "groupSizeMax", "Number."),
  str("group_size_label", "groupSizeLabel", "Sentence about who can come."),
  str("days", "days", "Days it runs, like Daily."),
  str("time_slot", "timeSlot", "Like 6:00 AM – 9:00 AM."),
  days("alt_days", "altDays", "Days with their own hours."),
  str("alt_time_slot", "altTimeSlot", "Hours for those days."),
  days("closed_days", "closedDays", "Days it is closed."),
  str("best_time", "bestTime", "Best time to go."),
  str("age_group", "ageGroup", "Like 12+."),
  str("min_people", "minPeople", "Minimum group size."),
  str("fitness_level", "fitnessLevel", "Like Easy."),
  str("instructor_ratio", "instructorRatio", "Like 1:4."),
  str("health_advisory", "healthAdvisory", "Health note."),
  list("included", "included", "One item per line (or separate with ' | ')."),
  list("not_included", "notIncluded", "One item per line."),
  list("things_to_carry", "carry", "One item per line."),
  list("know_before_you_go", "knowBeforeYouGo", "One tip per line."),
  list("tags", "tags", "Comma separated."),
  str("phones", "phones", "Comma separated numbers. Calls use the host, else the first of these."),
  str("aka", "aka", "Also known as."),
  str("additional_info", "additionalInfo", "Extra info."),
  str("terms_detail", "termsDetail", "Venue terms."),
  str("policy_summary", "policySummary", "Booking policy summary."),
  list("booking_notes", "bookingNotes", "One note per line."),
  list("cancellation_notes", "cancellationNotes", "One note per line."),
  yesNo("show_final_terms_note", "showFinalTermsNote", "Show the note under the policy."),
  str("menu_link", "menuUrl", "Menu URL."),
  str("instagram_link", "instagramUrl", "Instagram URL."),
  str("whatsapp_link", "whatsappUrl", "WhatsApp URL."),
  choice("book_via", "bookVia", ["call", "link", "custom"], "How guests book."),
  str("book_label", "bookLabel", "Button label when book_via is custom."),
  str("book_link", "bookUrl", "Booking URL when book_via is link or custom."),
  str("left_text", "barText", "Replaces the left text of the booking bar. Empty shows the price."),
  str("left_note", "barNote", "Replaces the small line under it."),
  ...[1, 2, 3, 4, 5].flatMap((n) => [faq(n, "q"), faq(n, "a")]),
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [step(n, "title"), step(n, "caption")]),
  ...[1, 2, 3, 4, 5].flatMap((n) => [pack(n, "name"), pack(n, "price"), pack(n, "detail")]),
];

/** Photo columns hold file names. The files are added on the import page and uploaded when the listing is made. */
const PHOTO_COUNT = { gallery: 8, menu: 6, story: 6 } as const;
const PHOTO_PREFIX = { gallery: "photo", menu: "menu_page", story: "story_photo" } as const;
const PHOTO_HINT = {
  gallery: "File name of a carousel photo, like surf1.jpg. The first is the cover.",
  menu: "File name of a menu page image.",
  story: "File name of a photo shown in the story.",
} as const;
type PhotoKind = keyof typeof PHOTO_COUNT;
const photoKeys = (kind: PhotoKind) => Array.from({ length: PHOTO_COUNT[kind] }, (_, i) => `${PHOTO_PREFIX[kind]}_${i + 1}`);
const PHOTO_COLUMNS = (Object.keys(PHOTO_COUNT) as PhotoKind[]).flatMap((kind) => photoKeys(kind).map((key) => ({ key, hint: PHOTO_HINT[kind] })));

export type SheetFiles = { gallery: string[]; menu: string[]; story: string[] };
const noFiles = (): SheetFiles => ({ gallery: [], menu: [], story: [] });

/** The photo file names in a row, per place they go. Empty cells are skipped. */
export function filesFromRecord(rec: Record<string, string>): SheetFiles {
  const out = noFiles();
  for (const kind of Object.keys(PHOTO_COUNT) as PhotoKind[]) out[kind] = photoKeys(kind).map((k) => (rec[k] ?? "").trim()).filter(Boolean);
  return out;
}

const FIRST = [
  { key: "title", hint: "Required." },
  { key: "slug", hint: "The web address. Empty makes one from the title." },
  { key: "host", hint: "The host's business name exactly as in Hosts. Empty = no host." },
  { key: "category", hint: "A category's slug or name. Empty uses the category picked on this page." },
];
const ALL = [...FIRST, ...COLUMNS.map(({ key, hint }) => ({ key, hint })), ...PHOTO_COLUMNS];

/** What a page part of the listing needs in the sheet. Title, host and reviews need nothing extra. */
const PART_COLUMNS: Record<string, string[]> = {
  info: ["price_from", "price_narrative", "price_unit", "taxes", "format", "walk_in", "duration_minutes", "duration_label", "group_size_max", "group_size_label", "days", "time_slot", "alt_days", "alt_time_slot", "closed_days", "best_time", "age_group", "min_people", "meeting_point"],
  verdict: ["verdict"],
  actions: ["phones", "instagram_link", "whatsapp_link", "map_link"],
  about: ["about"],
  menu: ["menu_link", ...photoKeys("menu")],
  policy: ["policy_summary", "booking_notes", "cancellation_notes", "terms_detail", "show_final_terms_note"],
};
/** What a story block's field needs in the sheet. */
const SOURCE_COLUMNS: Record<string, string[]> = {
  title: ["title"], about: ["about"], verdict: ["verdict"], pitch: ["pitch"], healthAdvisory: ["health_advisory"], additionalInfo: ["additional_info"],
  fitnessLevel: ["fitness_level"], instructorRatio: ["instructor_ratio"], ageGroup: ["age_group"], bestTime: ["best_time"], priceNarrative: ["price_narrative"],
  termsDetail: ["terms_detail"], included: ["included"], notIncluded: ["not_included"], carry: ["things_to_carry"], knowBeforeYouGo: ["know_before_you_go"],
  faqs: [1, 2, 3, 4, 5].flatMap((n) => [`faq_${n}_question`, `faq_${n}_answer`]),
  steps: [1, 2, 3, 4, 5, 6].flatMap((n) => [`step_${n}_title`, `step_${n}_caption`]),
  packages: [1, 2, 3, 4, 5].flatMap((n) => [`package_${n}_name`, `package_${n}_price`, `package_${n}_detail`]),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((n) => [`storyPhotos.${n}`, [`story_photo_${n + 1}`]])),
};
const ALWAYS = ["title", "slug", "host", "status", "place_name", "neighborhood", "map_link", "price_from"];

/**
 * The columns a category's sheet needs: the basics every listing needs to be created, plus whatever its layout reads
 * (shown page parts, shown story blocks and the fields they name). No layout = every column.
 */
export function sheetKeys(layout?: CategoryLayout): string[] {
  if (!layout) return ALL.map((c) => c.key);
  const need = new Set(ALWAYS);
  const add = (keys: string[] = []) => keys.forEach((k) => need.add(k));
  for (const part of readSections(layout.sections)) if (part.show) add(PART_COLUMNS[part.id]);
  if (readFixedShown(layout.sections, "gallery")) add(photoKeys("gallery"));
  if (readFixedShown(layout.sections, "booking")) add(["book_via", "book_label", "book_link", "left_text", "left_note"]);
  for (const b of layout.story ?? []) {
    if (b.show === false) continue;
    for (const src of [...blockSources(b), ...(b.when ? [b.when] : [])]) add(SOURCE_COLUMNS[src]);
  }
  return ALL.map((c) => c.key).filter((k) => need.has(k) && k !== "category");
}

const hintOf = (key: string) => ALL.find((c) => c.key === key)?.hint ?? "";
export const sheetHeader = (layout?: CategoryLayout) => sheetKeys(layout);
export const sheetGuide = (layout?: CategoryLayout) => sheetKeys(layout).map((key) => ({ key, hint: hintOf(key) }));
/** The row under the header in a downloaded sheet. It starts with # so the import ignores it. */
export const hintRow = (layout?: CategoryLayout) => sheetKeys(layout).map((k, i) => (i === 0 ? `# ${hintOf(k)}` : hintOf(k)));

export const SHEET_HEADER = sheetHeader();
export const SHEET_GUIDE = sheetGuide();

/** One listing as a row, in header order. */
export function rowFromForm(f: FormState, ctx: SheetContext, keys: string[] = SHEET_HEADER): string[] {
  const values: Record<string, string> = {
    title: f.title,
    slug: f.slug,
    host: ctx.hosts.find((h) => h.id === f.hostId)?.businessName ?? "",
    category: ctx.categories.find((c) => c.id === f.categoryId)?.slug ?? "",
    ...Object.fromEntries(COLUMNS.map((c) => [c.key, c.get(f)])),
  };
  return keys.map((k) => values[k] ?? ""); // photo columns stay empty: files aren't in an export
}

/** Reads a sheet. Headers are matched loosely (case, spaces, dashes). Columns we don't know are reported, not lost silently. */
export function readSheet(rows: string[][]): { records: Array<Record<string, string>>; unknown: string[] } {
  const [head = [], ...rest] = rows;
  const body = rest.filter((r) => !(r[0] ?? "").trim().startsWith("#")); // hint rows
  const keys = head.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const known = new Set(ALL.map((c) => c.key));
  return {
    records: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""]))),
    unknown: keys.filter((k) => k && !known.has(k)),
  };
}

/** A row as editor state, plus anything wrong with it. A row with issues is not imported. */
export function formFromRecord(rec: Record<string, string>, ctx: SheetContext, defaultCategoryId: string): { form: FormState; issues: string[]; files: SheetFiles } {
  const issues: string[] = [];
  let form = toForm(blankRow());
  const title = (rec.title ?? "").trim();
  if (!title) issues.push("title is empty");
  form = { ...form, title, slug: (rec.slug ?? "").trim() || slugFromTitle(title) };

  const hostName = (rec.host ?? "").trim();
  if (hostName) {
    const host = ctx.hosts.find((h) => h.businessName.trim().toLowerCase() === hostName.toLowerCase());
    if (host) form = { ...form, hostId: host.id };
    else issues.push(`host "${hostName}" not found`);
  }
  const cat = (rec.category ?? "").trim().toLowerCase();
  if (cat) {
    const c = ctx.categories.find((x) => x.slug.toLowerCase() === cat || x.name.trim().toLowerCase() === cat);
    if (c) form = { ...form, categoryId: c.id };
    else issues.push(`category "${rec.category}" not found`);
  } else if (defaultCategoryId) form = { ...form, categoryId: defaultCategoryId };

  for (const col of COLUMNS) {
    const v = rec[col.key] ?? "";
    if (!v.trim()) continue;
    const problem = col.issue?.(v);
    if (problem) issues.push(problem);
    else form = col.set(form, v);
  }
  // Gaps in numbered rows (step 2 empty, step 3 filled) close up now that every cell is read.
  const keep = <T,>(list: T[], filled: (x: T) => boolean) => list.filter(filled);
  form = {
    ...form,
    faqs: keep(form.faqs, (x) => Boolean(x.q || x.a)),
    baseContent: {
      ...form.baseContent,
      ...(form.baseContent.steps ? { steps: keep(rowsOf<Step>(form.baseContent.steps), (x) => Boolean(x.title)).map((x, i) => ({ ...x, marker: `${i + 1}.` })) } : {}),
      ...(form.baseContent.packages ? { packages: keep(rowsOf<Pack>(form.baseContent.packages), (x) => Boolean(x.name)) } : {}),
    },
  };
  if (form.status === "published" && !form.verdict.trim()) issues.push("published needs a verdict");
  if (form.bookVia === "link" && !form.bookUrl.trim()) issues.push("book_via link needs book_link");
  if (form.bookVia === "custom" && (!form.bookUrl.trim() || !form.bookLabel.trim())) issues.push("book_via custom needs book_label and book_link");
  return { form, issues, files: filesFromRecord(rec) };
}
