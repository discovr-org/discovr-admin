import { requestJson, type ExperienceAdminPatch } from "@/shared/utils/catalogApi";

/** Origin of the guest app that draws the live preview. Set `NEXT_PUBLIC_GUEST_URL` per environment. */
export function guestOrigin(): string {
  return (process.env.NEXT_PUBLIC_GUEST_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

/** The guest page's data for an unsaved draft. Writes nothing. Returned as-is for the preview to draw. */
export function previewExperienceAdmin(id: string, draft: ExperienceAdminPatch, signal?: AbortSignal) {
  return requestJson<unknown>(`/v1/admin/experiences/${encodeURIComponent(id)}/preview`, {
    method: "POST",
    body: JSON.stringify(draft),
    signal,
  });
}
