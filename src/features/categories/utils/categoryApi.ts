import { requestJson } from "@/shared/utils/catalogApi";
import type { Category, CategoryLayout } from "./layout";

const base = "/v1/admin/categories";

export const fetchCategories = () => requestJson<{ categories: Category[] }>(base).then((r) => r.categories);
export const fetchCategory = (id: string) => requestJson<Category>(`${base}/${encodeURIComponent(id)}`);
export const createCategory = (input: { name: string; slug?: string; layout: CategoryLayout }) =>
  requestJson<Category>(base, { method: "POST", body: JSON.stringify(input) });
export const patchCategory = (id: string, input: Partial<{ name: string; slug: string; layout: CategoryLayout }>) =>
  requestJson<Category>(`${base}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteCategory = (id: string) => requestJson<{ ok: true }>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });

/** Set several weights at once (a drag renumbers more than one). Returns every category as it is now. */
export const saveCategoryWeights = (weights: Array<{ id: string; weight: number }>) =>
  requestJson<{ categories: Category[] }>(`${base}/weights`, { method: "PUT", body: JSON.stringify({ weights }) }).then((r) => r.categories);
