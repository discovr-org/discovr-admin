import { HostsScreen } from "@/features/hosts/components/HostsScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function HostsPage() {
  return (
    <AdminShell
      title="Hosts"
      subtitle="Edit, set active/inactive, or delete hosts with no listings."
      primaryActionLabel="Add host"
      primaryActionHref="/hosts/new"
    >
      <HostsScreen />
    </AdminShell>
  );
}
