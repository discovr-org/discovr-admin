import type { IconName } from "../components/EditorIcon";
import type { PartId } from "./pageLayout";
import type { LayoutBlock, LayoutBlockType } from "@/features/categories/utils/layout";
import type { BlockType } from "./storyBlocks";

export const PART_ICON: Record<PartId, IconName> = {
  gallery: "image",
  title: "heading",
  info: "clock",
  verdict: "quote",
  actions: "bolt",
  about: "type",
  menu: "file",
  policy: "file",
  host: "user",
  reviews: "star",
  more: "compass",
  booking: "bar",
  faqs: "help",
  tags: "tag",
};

/** The icon for a layout block. A page part shows its own icon. */
export const layoutBlockIcon = (b: LayoutBlock): IconName => (b.type === "part" ? PART_ICON[b.id] : BLOCK_ICON[b.type]);

export const BLOCK_ICON: Record<BlockType | LayoutBlockType, IconName> = {
  heading: "heading",
  line: "minus",
  quote: "quote",
  text: "type",
  photo: "image",
  forNotFor: "list",
  steps: "steps",
  callout: "alert",
  checklist: "list",
  faq: "help",
  stats: "grid",
  packages: "tag",
  part: "grid",
};
