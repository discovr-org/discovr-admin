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
};

/** Swap photos inside the story. Changes save with "Save changes". */
export function StoryPhotos({ blocks, onChange }: Props) {
  const toast = useToast();
  const photos = listStoryPhotos(blocks);
  if (photos.length === 0) return null;

  async function replace(index: number, file: File) {
    const { url } = await uploadContentImageAdmin(file);
    onChange(updateStoryPhoto(blocks, index, { src: url }));
    toast.success("Photo replaced. Save changes to publish it.");
  }

  return (
    <div className={styles.section}>
      <h2 className={`t-title-sm ${styles.sectionTitle}`}>Story photos</h2>
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
    </div>
  );
}
