import { ImportListingsScreen } from "@/features/listings/components/ImportListingsScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

type Props = { searchParams: Promise<{ category?: string }> };

/** `?category=<id>` fixes the layout: the sheet has that category's columns and every row joins it. */
export default async function ImportListingsPage({ searchParams }: Props) {
  const { category } = await searchParams;
  return (
    <AdminShell title="Import listings" subtitle="Make many listings from a CSV. They start as drafts." showPrimaryAction={false}>
      <ImportListingsScreen key={category ?? "all"} categoryId={category} />
    </AdminShell>
  );
}
