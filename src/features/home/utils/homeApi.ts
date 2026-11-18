import { requestJson } from "@/shared/utils/catalogApi";

export type HomeSection = { id: string; title: string; layout: "rail" | "stack"; slugs: string[] };

export const fetchHomeFeed = () => requestJson<{ sections: HomeSection[] | null }>("/v1/catalog/home").then((r) => r.sections ?? []);
export const saveHomeFeed = (sections: HomeSection[]) =>
  requestJson<{ sections: HomeSection[] }>("/v1/admin/home", { method: "PUT", body: JSON.stringify({ sections }) }).then((r) => r.sections);

/** Move item `i` by `d` places. */
export function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
