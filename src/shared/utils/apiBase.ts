/**
 * Public API origin from env.
 * Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (dev) or the host’s env.
 * Falls back to local API so admin still works without a file.
 */
export function apiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8080";
  return raw.replace(/\/$/, "");
}
