"use client";

import { ImageListField } from "@/shared/components/ImageListField";
import type { ListingMenuPage, ListingPhoto } from "@/shared/utils/catalogApi";
import styles from "../styles/EditListingScreen.module.css";
import { NEW_PREFIX, type PendingFiles } from "../utils/mediaSync";

type Media = { photos: ListingPhoto[]; menuPages: ListingMenuPage[] };

type Props = {
  title: string;
  photos: ListingPhoto[];
  menuPages: ListingMenuPage[];
  /** Files picked but not uploaded yet. They go up when the listing is saved. */
  files: PendingFiles;
  /**
   * Every change is a function of the latest list, not of the list this screen last drew. Picking several images at once
   * adds them one after another before the screen redraws, so each must build on the one before it.
   */
  onChange: (update: (now: Media) => Partial<Media>) => void;
};

const stagedId = () => `${NEW_PREFIX}${crypto.randomUUID()}`;

/** Carousel photos and menu pages. Changes stay on screen until Save changes. */
export function ListingPhotos({ title, photos, menuPages, files, onChange }: Props) {
  return (
    <>
      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>Photos</h2>
        <ImageListField
          label="Carousel"
          hint="The cover shows on home cards. JPG, PNG, WebP, or GIF. Under 10MB each. Saved when you tap Save changes."
          items={photos}
          coverable
          onUpload={async (file) => {
            const id = stagedId();
            files.set(id, file);
            const src = URL.createObjectURL(file);
            onChange((now) => ({ photos: [...now.photos, { id, src, alt: title, isCover: now.photos.length === 0 }] }));
          }}
          onSave={async (items, coverId) => onChange(() => ({ photos: items.map(({ id, src, alt }) => ({ id, src, alt, isCover: id === coverId })) }))}
          onDelete={async (photoId) => {
            files.delete(photoId);
            onChange((now) => {
              const rest = now.photos.filter((p) => p.id !== photoId);
              const lostCover = !rest.some((p) => p.isCover);
              return { photos: rest.map((p, i) => ({ ...p, isCover: lostCover ? i === 0 : p.isCover })) };
            });
          }}
        />
      </div>

      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>Menu pages</h2>
        <ImageListField
          label="Menu"
          hint="For venues. Shows as the Menu section on the listing. Saved when you tap Save changes."
          items={menuPages}
          labelled
          onUpload={async (file) => {
            const id = stagedId();
            files.set(id, file);
            const src = URL.createObjectURL(file);
            onChange((now) => ({ menuPages: [...now.menuPages, { id, src, label: "", alt: title }] }));
          }}
          onSave={async (items) => onChange(() => ({ menuPages: items.map(({ id, src, label, alt }) => ({ id, src, label: label ?? "", alt })) }))}
          onDelete={async (pageId) => {
            files.delete(pageId);
            onChange((now) => ({ menuPages: now.menuPages.filter((p) => p.id !== pageId) }));
          }}
        />
      </div>
    </>
  );
}
