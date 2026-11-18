import { requestJson } from "@/shared/utils/catalogApi";

export type SiteSettings = {
  tagline?: string;
  searchPlaceholder?: string;
  footerPromise?: string;
  footerLinks?: Array<{ label: string; href: string }>;
};

export const fetchSite = () => requestJson<{ settings: SiteSettings }>("/v1/catalog/site").then((r) => r.settings);
export const saveSite = (settings: SiteSettings) =>
  requestJson<{ settings: SiteSettings }>("/v1/admin/site", { method: "PUT", body: JSON.stringify({ settings }) }).then((r) => r.settings);
