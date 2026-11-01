import { ListingsScreen } from "@/features/listings/components/ListingsScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function ListingsPage() {
  return (
    <AdminShell
      title="Listings"
      subtitle="Edit or delete. Changes hit the catalog API."
    >
      <ListingsScreen />
    </AdminShell>
  );
}
