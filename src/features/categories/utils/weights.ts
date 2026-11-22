/** A category's weight orders its row on the guest home page: 1 to 1000, highest first. */
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 1000;

type Weighted = { id: string; weight: number };
type Named = Weighted & { slug: string; name: string };
type HomeRow = { id: string; title: string };

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The weight a typed value means, or null when it is not a whole number from 1 to 1000. */
export function parseWeight(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= MIN_WEIGHT && n <= MAX_WEIGHT ? n : null;
}

/**
 * Categories in the order the home page shows them: heaviest first. Equal weights go in the Home feed's order
 * (a row whose id or title is the category's slug or name), then by name. Mirrors the guest app's `buildHomeSections`.
 */
export function orderCategories<T extends Named>(rows: T[], home: HomeRow[]): T[] {
  const at = (c: Named) => {
    const i = home.findIndex((s) => s.id === c.slug || norm(s.title) === norm(c.name));
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...rows].sort((a, b) => b.weight - a.weight || at(a) - at(b) || a.name.localeCompare(b.name));
}

/**
 * The weights that change when the row at `from` is dragged to `to` in `ordered` (heaviest first).
 * The dragged row takes a weight between its new neighbours when there is room, so only it changes.
 * When there is none (neighbours tied, or next to each other), every row is renumbered, evenly from 1000 down.
 */
export function weightsAfterMove(ordered: Weighted[], from: number, to: number): Weighted[] {
  if (from === to || from < 0 || to < 0 || from >= ordered.length || to >= ordered.length) return [];
  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  const hi = to > 0 ? next[to - 1].weight : MAX_WEIGHT + 1; // the row above, or a ceiling just over the top
  const lo = to < next.length - 1 ? next[to + 1].weight : MIN_WEIGHT - 1; // the row below, or a floor just under the bottom
  if (hi - lo >= 2) {
    const weight = Math.floor((hi + lo) / 2);
    return weight === moved.weight ? [] : [{ id: moved.id, weight }];
  }

  const step = next.length > 1 ? Math.floor((MAX_WEIGHT - MIN_WEIGHT) / (next.length - 1)) : 0;
  const before = new Map(ordered.map((r) => [r.id, r.weight]));
  return next.map((r, i) => ({ id: r.id, weight: MAX_WEIGHT - i * step })).filter((r) => before.get(r.id) !== r.weight);
}
