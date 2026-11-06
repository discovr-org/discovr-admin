import { apiBaseUrl } from "@/shared/utils/apiBase";

export type CatalogExperienceSummary = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  verdict: string;
  priceFromInr: number;
  hostId: string;
  hostBusinessName: string;
  hostActive: boolean;
  placeNeighborhood: string;
  hasPhoto: boolean;
};

export type HostCredit = "hosted" | "run" | "owned";

export type CatalogHostSummary = {
  id: string;
  businessName: string;
  personName: string;
  phone: string;
  experienceCount: number;
  active: boolean;
  avatarUrl?: string;
  avatarAlt?: string;
  credit: HostCredit;
};

/** Guest app shows its own icon per link; `label` is legacy and unused. */
export type ContentLink = { url: string; label?: string };

export type ExperienceContent = {
  aka?: string;
  locationLabel?: string;
  priceNarrative?: string;
  priceUnit?: string;
  taxes?: "extra" | "inclusive";
  format?: "trip" | "venue";
  meetingPoint?: string;
  droppingPoint?: string;
  durationLabel?: string;
  additionalInfo?: string;
  termsDetail?: string;
  whatToCarry?: string;
  pitch?: string;
  walkIn?: boolean;
  fitnessLevel?: string;
  instructorRatio?: string;
  healthAdvisory?: string;
  carry?: string[];
  knowBeforeYouGo?: string[];
  included?: string[];
  notIncluded?: string[];
  phones?: string[];
  languages?: string[];
  maxPeople?: string;
  distance?: string;
  difficulty?: string;
  tagsOnDisplay?: string[];
  faqs?: Array<{ q: string; a: string }>;
  [key: string]: unknown;
  /** "link" = the book button opens `links.book`; otherwise it calls the host. */
  bookVia?: "call" | "link";
  /** true = the app skips photo blocks in the story. */
  hideStoryPhotos?: boolean;
  links?: {
    maps?: ContentLink;
    book?: ContentLink;
    whatsapp?: ContentLink;
    instagram?: ContentLink;
    menu?: ContentLink;
  };
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type ListingSchedule = {
  days?: string;
  timeSlot?: string;
  /** Days with their own hours, e.g. weekends. */
  altDays?: Weekday[];
  altTimeSlot?: string;
  closedDays?: Weekday[];
  bestTime?: string;
  ageGroup?: string;
  minPeople?: string;
  durationLabel?: string;
};

export type ListingPolicy = {
  summary: string;
  booking: string[];
  cancellation: string[];
  /** Guest note under policy. Defaults on when omitted. */
  showFinalTermsNote?: boolean;
};

export type CatalogExperienceAdmin = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  verdict: string;
  about: string;
  placeName: string;
  placeNeighborhood: string;
  placeLat: number;
  placeLng: number;
  priceFromInr: number;
  durationMinutes: number;
  groupSizeMax: number;
  groupSizeLabel: string;
  hostId: string;
  hostBusinessName: string;
  coverPhotoUrl?: string;
  coverPhotoAlt?: string;
  photos: ListingPhoto[];
  menuPages: ListingMenuPage[];
  tags: string[];
  schedule: ListingSchedule;
  policy: ListingPolicy | null;
  content: ExperienceContent;
};

export type ListingPhoto = { id: string; src: string; alt: string; isCover: boolean };

export type ListingMenuPage = { id: string; src: string; label: string; alt: string };

export type ExperienceAdminPatch = Partial<{
  title: string;
  slug: string;
  status: CatalogExperienceAdmin["status"];
  verdict: string | null;
  about: string;
  placeName: string;
  placeNeighborhood: string;
  placeLat: number;
  placeLng: number;
  priceFromInr: number;
  durationMinutes: number;
  groupSizeMax: number;
  groupSizeLabel: string;
  tags: string[];
  schedule: ListingSchedule;
  policy: ListingPolicy | null;
  content: ExperienceContent;
}>;

export type ExperienceAdminCreate = {
  title: string;
  slug?: string;
  hostId: string;
  status?: CatalogExperienceAdmin["status"];
  verdict?: string | null;
  about?: string;
  placeName: string;
  placeNeighborhood: string;
  placeLat: number;
  placeLng: number;
  priceFromInr?: number;
  durationMinutes?: number;
  groupSizeMax?: number;
  groupSizeLabel?: string;
};

export type HostAdminPatch = Partial<{
  businessName: string;
  personName: string;
  phone: string;
  active: boolean;
  avatarUrl: string | null;
  avatarAlt: string | null;
  credit: HostCredit;
}>;

export type HostAdminCreate = {
  businessName: string;
  personName: string;
  phone: string;
  active?: boolean;
  credit?: HostCredit;
};

type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

async function parseError(path: string, res: Response): Promise<never> {
  let message = `API ${path} failed (${res.status})`;
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (body.error?.message) message = body.error.message;
  } catch {
    /* keep default */
  }
  throw new Error(message);
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) await parseError(path, res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function requestFormData<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) await parseError(path, res);
  return (await res.json()) as T;
}

/** Clear the API's cached listing cards and cache a fresh copy. */
export function refreshFeedCacheAdmin() {
  return requestJson<{ ok: true; cards: number }>(
    "/v1/admin/cache/cards/refresh",
    { method: "POST" },
  );
}

export function fetchExperiences() {
  return requestJson<{ experiences: CatalogExperienceSummary[] }>(
    "/v1/catalog/experiences",
  );
}

export function fetchHosts() {
  return requestJson<{ hosts: CatalogHostSummary[] }>("/v1/catalog/hosts");
}

export function fetchExperienceAdmin(id: string) {
  return requestJson<CatalogExperienceAdmin>(
    `/v1/admin/experiences/${encodeURIComponent(id)}`,
  );
}

export function createExperienceAdmin(input: ExperienceAdminCreate) {
  return requestJson<CatalogExperienceAdmin>("/v1/admin/experiences", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchExperienceAdmin(id: string, patch: ExperienceAdminPatch) {
  return requestJson<CatalogExperienceAdmin>(
    `/v1/admin/experiences/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function deleteExperienceAdmin(id: string) {
  return requestJson<{ ok: true }>(
    `/v1/admin/experiences/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function createHostAdmin(input: HostAdminCreate) {
  return requestJson<CatalogHostSummary>("/v1/admin/hosts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchHostAdmin(id: string, patch: HostAdminPatch) {
  return requestJson<CatalogHostSummary>(
    `/v1/admin/hosts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function deleteHostAdmin(id: string) {
  return requestJson<{ ok: true }>(
    `/v1/admin/hosts/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** Text fields go before the file so Fastify multipart attaches them on `file.fields`. */
function imageForm(file: File, fields: Record<string, string | undefined> = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value?.trim()) form.append(name, value.trim());
  }
  form.append("file", file);
  return form;
}

function experiencePath(id: string, rest: string) {
  return `/v1/admin/experiences/${encodeURIComponent(id)}/${rest}`;
}

export function uploadExperiencePhotoAdmin(
  id: string,
  file: File,
  options: { alt?: string; cover?: boolean } = {},
) {
  return requestFormData<CatalogExperienceAdmin>(
    experiencePath(id, "photos"),
    imageForm(file, { alt: options.alt, cover: options.cover ? "true" : undefined }),
  );
}

export function saveExperiencePhotosAdmin(
  id: string,
  photos: Array<{ id: string; alt: string }>,
  coverId: string | null,
) {
  return requestJson<CatalogExperienceAdmin>(experiencePath(id, "photos"), {
    method: "PUT",
    body: JSON.stringify({ photos, coverId }),
  });
}

export function deleteExperiencePhotoAdmin(id: string, photoId: string) {
  return requestJson<CatalogExperienceAdmin>(
    experiencePath(id, `photos/${encodeURIComponent(photoId)}`),
    { method: "DELETE" },
  );
}

export function uploadMenuPageAdmin(
  id: string,
  file: File,
  options: { label?: string; alt?: string } = {},
) {
  return requestFormData<CatalogExperienceAdmin>(
    experiencePath(id, "menu-pages"),
    imageForm(file, options),
  );
}

export function saveMenuPagesAdmin(
  id: string,
  pages: Array<{ id: string; label: string; alt: string }>,
) {
  return requestJson<CatalogExperienceAdmin>(experiencePath(id, "menu-pages"), {
    method: "PUT",
    body: JSON.stringify({ pages }),
  });
}

export function deleteMenuPageAdmin(id: string, pageId: string) {
  return requestJson<CatalogExperienceAdmin>(
    experiencePath(id, `menu-pages/${encodeURIComponent(pageId)}`),
    { method: "DELETE" },
  );
}

/** Upload a story image. Save the returned URL into `content.blocks`. */
export function uploadContentImageAdmin(file: File) {
  return requestFormData<{ url: string }>("/v1/admin/images", imageForm(file));
}

export function uploadHostAvatarAdmin(id: string, file: File, alt?: string) {
  return requestFormData<CatalogHostSummary>(
    `/v1/admin/hosts/${encodeURIComponent(id)}/avatar`,
    imageForm(file, { alt }),
  );
}
