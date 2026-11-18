import {
  deleteExperiencePhotoAdmin,
  deleteMenuPageAdmin,
  saveExperiencePhotosAdmin,
  saveMenuPagesAdmin,
  uploadExperiencePhotoAdmin,
  uploadMenuPageAdmin,
  type CatalogExperienceAdmin,
  type ListingMenuPage,
  type ListingPhoto,
} from "@/shared/utils/catalogApi";

/** Photos and menu pages are edited on screen first. A staged item that isn't on the server yet has an id starting with this. */
export const NEW_PREFIX = "new:";
export const isStaged = (id: string) => id.startsWith(NEW_PREFIX);

/** Files picked but not uploaded yet, by staged id. */
export type PendingFiles = Map<string, File>;

type Row = Pick<CatalogExperienceAdmin, "photos" | "menuPages">;

function must(files: PendingFiles, id: string): File {
  const file = files.get(id);
  if (!file) throw new Error("A picked image went missing. Add it again.");
  return file;
}

/**
 * Makes the server's photos match `staged`: removes what was removed, uploads what was added,
 * then writes the order, alt text and cover. Returns the listing as the server now has it, or null when nothing changed.
 */
export async function syncPhotos(listingId: string, saved: ListingPhoto[], staged: ListingPhoto[], files: PendingFiles): Promise<CatalogExperienceAdmin | null> {
  const removed = saved.filter((s) => !staged.some((x) => x.id === s.id));
  const added = staged.filter((x) => isStaged(x.id));
  let row: CatalogExperienceAdmin | null = null;

  for (const p of removed) row = await deleteExperiencePhotoAdmin(listingId, p.id);
  for (const p of added) row = await uploadExperiencePhotoAdmin(listingId, must(files, p.id), { alt: p.alt });

  // New photos land at the end, in the order they were uploaded.
  const fresh = row ? row.photos.slice(row.photos.length - added.length) : [];
  const ids = new Map(added.map((p, i) => [p.id, fresh[i]?.id ?? p.id]));
  const ordered = staged.map((p) => ({ id: ids.get(p.id) ?? p.id, alt: p.alt }));
  const coverId = ordered.length ? (ids.get(staged.find((p) => p.isCover)?.id ?? "") ?? staged.find((p) => p.isCover)?.id ?? ordered[0].id) : null;

  const untouched = !removed.length && !added.length && saved.length === staged.length && saved.every((s, i) => s.id === staged[i].id && s.alt === staged[i].alt && s.isCover === staged[i].isCover);
  if (untouched) return null;
  if (ordered.length) row = await saveExperiencePhotosAdmin(listingId, ordered, coverId);
  return row;
}

/** Same as `syncPhotos`, for menu pages (no cover). */
export async function syncMenuPages(listingId: string, saved: ListingMenuPage[], staged: ListingMenuPage[], files: PendingFiles): Promise<CatalogExperienceAdmin | null> {
  const removed = saved.filter((s) => !staged.some((x) => x.id === s.id));
  const added = staged.filter((x) => isStaged(x.id));
  let row: CatalogExperienceAdmin | null = null;

  for (const p of removed) row = await deleteMenuPageAdmin(listingId, p.id);
  for (const p of added) row = await uploadMenuPageAdmin(listingId, must(files, p.id), { label: p.label, alt: p.alt });

  const fresh = row ? row.menuPages.slice(row.menuPages.length - added.length) : [];
  const ids = new Map(added.map((p, i) => [p.id, fresh[i]?.id ?? p.id]));
  const ordered = staged.map((p) => ({ id: ids.get(p.id) ?? p.id, label: p.label, alt: p.alt }));

  const untouched = !removed.length && !added.length && saved.length === staged.length && saved.every((s, i) => s.id === staged[i].id && s.alt === staged[i].alt && s.label === staged[i].label);
  if (untouched) return null;
  if (ordered.length) row = await saveMenuPagesAdmin(listingId, ordered);
  return row;
}

/** Photos first, then menu pages. Returns the latest server copy of the media, or null if nothing changed. */
export async function syncMedia(listingId: string, saved: Row, staged: Row, files: PendingFiles): Promise<Row | null> {
  const afterPhotos = await syncPhotos(listingId, saved.photos, staged.photos, files);
  // Menu pages never changed by the photo calls, so compare against the original list.
  const afterMenu = await syncMenuPages(listingId, saved.menuPages, staged.menuPages, files);
  const row = afterMenu ?? afterPhotos;
  if (!row) return null;
  return { photos: afterPhotos?.photos ?? row.photos, menuPages: afterMenu?.menuPages ?? row.menuPages };
}
