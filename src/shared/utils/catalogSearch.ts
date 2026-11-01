import type {
  CatalogExperienceSummary,
  CatalogHostSummary,
} from "./catalogApi";

export type CatalogSearchHit =
  | {
      kind: "listing";
      id: string;
      href: string;
      title: string;
      detail: string;
      status: CatalogExperienceSummary["status"];
    }
  | {
      kind: "host";
      id: string;
      href: string;
      title: string;
      detail: string;
    };

function norm(value: string) {
  return value.trim().toLowerCase();
}

function includesAll(haystack: string, tokens: string[]) {
  return tokens.every((t) => haystack.includes(t));
}

export function searchCatalog(
  query: string,
  experiences: CatalogExperienceSummary[],
  hosts: CatalogHostSummary[],
): CatalogSearchHit[] {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: CatalogSearchHit[] = [];

  for (const row of experiences) {
    const hay = norm(
      [
        row.title,
        row.slug,
        row.verdict,
        row.hostBusinessName,
        row.placeNeighborhood,
        row.status,
      ].join(" "),
    );
    if (!includesAll(hay, tokens)) continue;
    hits.push({
      kind: "listing",
      id: row.id,
      href: `/listings/${row.id}`,
      title: row.title,
      detail:
        row.verdict ||
        [row.hostBusinessName, row.placeNeighborhood].filter(Boolean).join(" · ") ||
        row.slug,
      status: row.status,
    });
  }

  for (const row of hosts) {
    const hay = norm(
      [row.businessName, row.personName, row.phone].join(" "),
    );
    if (!includesAll(hay, tokens)) continue;
    hits.push({
      kind: "host",
      id: row.id,
      href: `/hosts?focus=${encodeURIComponent(row.id)}`,
      title: row.businessName,
      detail: `${row.personName} · ${row.phone} · ${row.experienceCount} listing${row.experienceCount === 1 ? "" : "s"}`,
    });
  }

  return hits;
}
