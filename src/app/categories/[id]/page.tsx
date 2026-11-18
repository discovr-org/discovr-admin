import { CategoryEditor } from "@/features/categories/components/CategoryEditor";

type Props = { params: Promise<{ id: string }> };

/** Full-screen editor with its own top bar, like the listing editor. */
export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  return <CategoryEditor key={id} id={id} />;
}
