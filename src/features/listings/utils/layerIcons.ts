import type { IconName } from "../components/EditorIcon";
import type { PartId } from "./pageLayout";
import type { LayoutBlockType } from "@/features/categories/utils/layout";
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
  menu: "file",
};
