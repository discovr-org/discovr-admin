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

export type ContentLink = { label: string; url: string };

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
  included?: string[];
  notIncluded?: string[];
  phones?: string[];
  languages?: string[];
  maxPeople?: string;
  distance?: string;
  difficulty?: string;
  tagsOnDisplay?: string[];
  faqs?: Array<{ q: string; a: string }>;
  links?: {
    maps?: ContentLink;
    book?: ContentLink;
    whatsapp?: ContentLink;
    instagram?: ContentLink;
    menu?: ContentLink;
  };
};

export type ListingSchedule = {
  days?: string;
  timeSlot?: string;
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
  tags: string[];
  schedule: ListingSchedule;
  policy: ListingPolicy | null;
  content: ExperienceContent;
};

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

export function uploadExperienceCoverAdmin(
  id: string,
  file: File,
  alt?: string,
) {
  const form = new FormData();
  // alt before file so Fastify multipart attaches it on file.fields
  if (alt?.trim()) form.append("alt", alt.trim());
  form.append("file", file);
  return requestFormData<CatalogExperienceAdmin>(
    `/v1/admin/experiences/${encodeURIComponent(id)}/cover`,
    form,
  );
}

export function uploadHostAvatarAdmin(id: string, file: File, alt?: string) {
  const form = new FormData();
  if (alt?.trim()) form.append("alt", alt.trim());
  form.append("file", file);
  return requestFormData<CatalogHostSummary>(
    `/v1/admin/hosts/${encodeURIComponent(id)}/avatar`,
    form,
  );
}
