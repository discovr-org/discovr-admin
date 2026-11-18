import { SiteSettingsScreen } from "@/features/site/components/SiteSettingsScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function SitePage() {
  return (
    <AdminShell title="Site settings" subtitle="Words and links the guest app shows everywhere." showPrimaryAction={false}>
      <SiteSettingsScreen />
    </AdminShell>
  );
}
