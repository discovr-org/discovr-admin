export type StoryPhoto = {
  /** Position in `content.blocks`. */
  index: number;
  src: string;
  alt: string;
};

type PhotoBlock = { type: "photo"; src: string; alt?: string };

function isPhotoBlock(value: unknown): value is PhotoBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  return block.type === "photo" && typeof block.src === "string";
}

export function listStoryPhotos(blocks: unknown): StoryPhoto[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block, index) =>
    isPhotoBlock(block) ? [{ index, src: block.src, alt: block.alt ?? "" }] : [],
  );
}

/** Returns a new blocks array with one photo block changed; other blocks are untouched. */
export function updateStoryPhoto(
  blocks: unknown,
  index: number,
  patch: Partial<Pick<PhotoBlock, "src" | "alt">>,
): unknown[] {
  const list = Array.isArray(blocks) ? blocks.slice() : [];
  const block = list[index];
  if (isPhotoBlock(block)) list[index] = { ...block, ...patch };
  return list;
}
