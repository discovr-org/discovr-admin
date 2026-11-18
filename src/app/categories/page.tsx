import { CategoriesScreen } from "@/features/categories/components/CategoriesScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function CategoriesPage() {
  return (
    <AdminShell title="Categories" subtitle="A category fixes a page layout. Listings in it only fill in their content." showPrimaryAction={false}>
      <CategoriesScreen />
    </AdminShell>
  );
}
