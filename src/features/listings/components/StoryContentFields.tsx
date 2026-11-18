"use client";

import { ImageUploadField } from "@/shared/components/ImageUploadField";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { uploadContentImageAdmin, type ExperienceContent } from "@/shared/utils/catalogApi";
import styles from "../styles/EditListingScreen.module.css";

type Step = { marker?: string; title: string; caption?: string };
type Pack = { name: string; detail?: string; price: string };
type Photo = { src: string; alt?: string; caption?: string };

type Props = { content: ExperienceContent; onChange: (next: ExperienceContent) => void };

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const swap = <T,>(a: T[], i: number, j: number) => a.map((x, k) => (k === i ? a[j] : k === j ? a[i] : x));

/** Fields only a category layout reads: process steps, price rows and story photos. */
export function StoryContentFields({ content, onChange }: Props) {
  const toast = useToast();
  const steps = list<Step>(content.steps);
  const packages = list<Pack>(content.packages);
  const photos = list<Photo>(content.storyPhotos);
  const set = (patch: Partial<ExperienceContent>) => onChange({ ...content, ...patch });

  return (
    <>
      <h2 className={`t-title-sm ${styles.sectionTitle}`}>Story content</h2>
      <p className={`t-body-sm ${styles.hint}`}>What a category layout shows in the story: steps, price rows and photos. Empty ones are hidden.</p>

      <div className={styles.sectionHead}>
        <h3 className={`t-body-sm ${styles.stackLabel}`}>Process steps</h3>
        <button type="button" className={styles.addBtn} onClick={() => set({ steps: [...steps, { title: "", caption: "" }] })}>
          Add step
        </button>
      </div>
      {steps.map((s, i) => (
        <div key={i} className={styles.grid2}>
          <Input label={`Step ${i + 1}`} value={s.title} onChange={(e) => set({ steps: steps.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} />
          <Input label="Description (optional)" value={s.caption ?? ""} onChange={(e) => set({ steps: steps.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)) })} />
          <div className={styles.sectionHead}>
            <button type="button" className={styles.removeBtn} disabled={i === 0} onClick={() => set({ steps: swap(steps, i, i - 1) })}>
              Up
            </button>
            <button type="button" className={styles.removeBtn} disabled={i === steps.length - 1} onClick={() => set({ steps: swap(steps, i, i + 1) })}>
              Down
            </button>
            <button type="button" className={styles.removeBtn} onClick={() => set({ steps: steps.filter((_, k) => k !== i) })}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className={styles.sectionHead}>
        <h3 className={`t-body-sm ${styles.stackLabel}`}>Packages & prices</h3>
        <button type="button" className={styles.addBtn} onClick={() => set({ packages: [...packages, { name: "", price: "" }] })}>
          Add package
        </button>
      </div>
      {packages.map((p, i) => (
        <div key={i} className={styles.grid2}>
          <Input label="Name" value={p.name} onChange={(e) => set({ packages: packages.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
          <Input label="Price (₹)" inputMode="numeric" value={p.price} onChange={(e) => set({ packages: packages.map((x, k) => (k === i ? { ...x, price: e.target.value } : x)) })} />
          <Input label="Detail (optional)" value={p.detail ?? ""} onChange={(e) => set({ packages: packages.map((x, k) => (k === i ? { ...x, detail: e.target.value } : x)) })} />
          <div className={styles.sectionHead}>
            <button type="button" className={styles.removeBtn} onClick={() => set({ packages: packages.filter((_, k) => k !== i) })}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className={styles.sectionHead}>
        <h3 className={`t-body-sm ${styles.stackLabel}`}>Story photos</h3>
        <button type="button" className={styles.addBtn} disabled={photos.length >= 6} onClick={() => set({ storyPhotos: [...photos, { src: "", alt: "" }] })}>
          Add photo
        </button>
      </div>
      {photos.map((ph, i) => (
        <div key={i} className={styles.grid2}>
          <ImageUploadField
            label={`Story photo ${i + 1}`}
            previewUrl={ph.src || null}
            previewAlt={ph.alt}
            onUpload={async (file) => {
              const { url } = await uploadContentImageAdmin(file);
              set({ storyPhotos: photos.map((x, k) => (k === i ? { ...x, src: url } : x)) });
              toast.success("Photo added. Save changes to publish it.");
            }}
          />
          <div className={styles.stackFields}>
            <Input label="Alt text" value={ph.alt ?? ""} onChange={(e) => set({ storyPhotos: photos.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)) })} />
            <Input label="Caption (optional)" value={ph.caption ?? ""} onChange={(e) => set({ storyPhotos: photos.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)) })} />
            <button type="button" className={styles.removeBtn} onClick={() => set({ storyPhotos: photos.filter((_, k) => k !== i) })}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
