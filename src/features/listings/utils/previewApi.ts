import { requestJson, type ExperienceAdminPatch } from "@/shared/utils/catalogApi";

/** The guest page's data for an unsaved draft. Writes nothing. Returned as-is for the preview to draw. */
export function previewExperienceAdmin(id: string, draft: ExperienceAdminPatch, signal?: AbortSignal) {
  return requestJson<unknown>(`/v1/admin/experiences/${encodeURIComponent(id)}/preview`, {
    method: "POST",
    body: JSON.stringify(draft),
    signal,
  });
}
