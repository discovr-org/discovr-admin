import { requestJson, type ExperienceAdminPatch } from "@/shared/utils/catalogApi";

/** The guest page's data for an unsaved draft. Writes nothing. Returned as-is for the preview to draw. */
export function previewExperienceAdmin(id: string, draft: ExperienceAdminPatch, signal?: AbortSignal) {
  return requestJson<unknown>(`/v1/admin/experiences/${encodeURIComponent(id)}/preview`, {
    method: "POST",
    body: JSON.stringify(draft),
    signal,
  });
}

/** A category's page on a made-up listing with every field filled. For a category no real listing uses yet. Writes nothing. */
export function previewCategorySampleAdmin(categoryId: string, layout: unknown, signal?: AbortSignal) {
  return requestJson<unknown>(`/v1/admin/categories/${encodeURIComponent(categoryId)}/preview`, {
    method: "POST",
    body: JSON.stringify({ layout }),
    signal,
  });
}
