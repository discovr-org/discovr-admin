import { OverviewDashboard } from "@/features/overview/components/OverviewDashboard";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function OverviewPage() {
  return (
    <AdminShell
      title="Dashboard"
      subtitle="What's active, what's waiting."
      showPrimaryAction={false}
    >
      <OverviewDashboard />
    </AdminShell>
  );
}
