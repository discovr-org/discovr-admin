import { ImportListingsScreen } from "@/features/listings/components/ImportListingsScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function ImportListingsPage() {
  return (
    <AdminShell title="Import listings" subtitle="Make many listings from a CSV. They start as drafts." showPrimaryAction={false}>
      <ImportListingsScreen />
    </AdminShell>
  );
}
