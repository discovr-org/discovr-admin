"use client";

import { ImageUploadField } from "@/shared/components/ImageUploadField";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { uploadContentImageAdmin } from "@/shared/utils/catalogApi";
import { listStoryPhotos, updateStoryPhoto } from "../utils/storyPhotos";
import styles from "../styles/EditListingScreen.module.css";

type Props = {
  blocks: unknown;
  onChange: (blocks: unknown[]) => void;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
};

/** Show or hide photos inside the story, and swap them. Changes save with "Save changes". */
export function StoryPhotos({ blocks, onChange, hidden, onHiddenChange }: Props) {
  const toast = useToast();
  const photos = listStoryPhotos(blocks);

  async function replace(index: number, file: File) {
    const { url } = await uploadContentImageAdmin(file);
    onChange(updateStoryPhoto(blocks, index, { src: url }));
    toast.success("Photo replaced. Save changes to publish it.");
  }

  return (
    <div className={styles.section}>
      <h2 className={`t-title-sm ${styles.sectionTitle}`}>Story photos</h2>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={!hidden}
          onChange={(e) => onHiddenChange(!e.target.checked)}
        />
        <span>Show photos in the story</span>
      </label>
      {!hidden && photos.length > 0 ? (
        <>
          <p className={`t-body-sm ${styles.meta}`}>
            Photos inside the story. Replace one, then Save changes.
          </p>
          {photos.map((photo, n) => (
            <div key={photo.index} className={styles.grid2}>
              <ImageUploadField
                label={`Story photo ${n + 1}`}
                previewUrl={photo.src}
                previewAlt={photo.alt}
                onUpload={(file) => replace(photo.index, file)}
              />
              <Input
                label="Alt text"
                value={photo.alt}
                onChange={(e) =>
                  onChange(updateStoryPhoto(blocks, photo.index, { alt: e.target.value }))
                }
              />
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
