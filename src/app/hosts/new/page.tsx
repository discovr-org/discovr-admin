import { AddHostScreen } from "@/features/hosts/components/AddHostScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function NewHostPage() {
  return (
    <AdminShell
      title="Add host"
      subtitle="Create the venue or desk, then attach listings."
      showPrimaryAction={false}
      primaryActionLabel="Add host"
      primaryActionHref="/hosts/new"
    >
      <AddHostScreen />
    </AdminShell>
  );
}
