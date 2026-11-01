import { AddListingScreen } from "@/features/listings/components/AddListingScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function NewListingPage() {
  return (
    <AdminShell
      title="Add listing"
      subtitle="Starts as a draft unless you set it active."
      showPrimaryAction={false}
    >
      <AddListingScreen />
    </AdminShell>
  );
}
