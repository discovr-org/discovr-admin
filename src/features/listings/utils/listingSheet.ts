import { WEEKDAYS, type Weekday } from "@/shared/utils/catalogApi";
import { blankRow, slugFromTitle, toForm, type FormState } from "../components/EditListingScreen";
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
    return { ...f, faqs: faqs.filter((x) => x.q || x.a) };
  },
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
];

export const SHEET_HEADER = ["title", "slug", "host", "category", ...COLUMNS.map((c) => c.key)];
export const SHEET_GUIDE: Array<{ key: string; hint: string }> = [
  { key: "title", hint: "Required." },
  { key: "slug", hint: "The web address. Empty makes one from the title." },
  { key: "host", hint: "The host's business name exactly as in Hosts. Empty = no host." },
  { key: "category", hint: "A category's slug or name. Empty uses the category picked on this page." },
  ...COLUMNS.map(({ key, hint }) => ({ key, hint })),
];

/** One listing as a row, in header order. */
export function rowFromForm(f: FormState, ctx: SheetContext): string[] {
  const host = ctx.hosts.find((h) => h.id === f.hostId)?.businessName ?? "";
  const category = ctx.categories.find((c) => c.id === f.categoryId)?.slug ?? "";
  return [f.title, f.slug, host, category, ...COLUMNS.map((c) => c.get(f))];
}

/** Reads a sheet. Headers are matched loosely (case, spaces, dashes). Columns we don't know are reported, not lost silently. */
export function readSheet(rows: string[][]): { records: Array<Record<string, string>>; unknown: string[] } {
  const [head = [], ...body] = rows;
  const keys = head.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const known = new Set(SHEET_HEADER);
  return {
    records: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""]))),
    unknown: keys.filter((k) => k && !known.has(k)),
  };
}

/** A row as editor state, plus anything wrong with it. A row with issues is not imported. */
export function formFromRecord(rec: Record<string, string>, ctx: SheetContext, defaultCategoryId: string): { form: FormState; issues: string[] } {
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
  if (form.status === "published" && !form.verdict.trim()) issues.push("published needs a verdict");
  if (form.bookVia === "link" && !form.bookUrl.trim()) issues.push("book_via link needs book_link");
  if (form.bookVia === "custom" && (!form.bookUrl.trim() || !form.bookLabel.trim())) issues.push("book_via custom needs book_label and book_link");
  return { form, issues };
}
