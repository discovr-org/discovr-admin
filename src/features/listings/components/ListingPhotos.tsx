"use client";

import { ImageListField } from "@/shared/components/ImageListField";
import { useToast } from "@/shared/components/Toast";
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
import styles from "../styles/EditListingScreen.module.css";

type Props = {
  experienceId: string;
  title: string;
  photos: ListingPhoto[];
  menuPages: ListingMenuPage[];
  onSaved: (row: CatalogExperienceAdmin) => void;
};

/** Carousel photos and menu pages. Each change saves straight away. */
export function ListingPhotos({ experienceId, title, photos, menuPages, onSaved }: Props) {
  const toast = useToast();

  async function save(action: Promise<CatalogExperienceAdmin>, message: string) {
    const row = await action;
    onSaved(row);
    toast.success(message);
  }

  return (
    <>
      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>Photos</h2>
        <ImageListField
          label="Carousel"
          hint="The cover shows on home cards. JPG, PNG, WebP, or GIF. Under 10MB each."
          items={photos}
          coverable
          onUpload={(file) =>
            save(
              uploadExperiencePhotoAdmin(experienceId, file, { alt: title }),
              "Photo added.",
            )
          }
          onSave={(items, coverId) =>
            save(
              saveExperiencePhotosAdmin(
                experienceId,
                items.map(({ id, alt }) => ({ id, alt })),
                coverId,
              ),
              "Photos saved.",
            )
          }
          onDelete={(photoId) =>
            save(deleteExperiencePhotoAdmin(experienceId, photoId), "Photo removed.")
          }
        />
      </div>

      <div className={styles.section}>
        <h2 className={`t-title-sm ${styles.sectionTitle}`}>Menu pages</h2>
        <ImageListField
          label="Menu"
          hint="For venues. Shows as the Menu section on the listing."
          items={menuPages}
          labelled
          onUpload={(file) =>
            save(uploadMenuPageAdmin(experienceId, file), "Menu page added.")
          }
          onSave={(items) =>
            save(
              saveMenuPagesAdmin(
                experienceId,
                items.map(({ id, label, alt }) => ({ id, label: label ?? "", alt })),
              ),
              "Menu saved.",
            )
          }
          onDelete={(pageId) =>
            save(deleteMenuPageAdmin(experienceId, pageId), "Menu page removed.")
          }
        />
      </div>
    </>
  );
}
