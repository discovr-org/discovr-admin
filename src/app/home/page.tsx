import { HomeFeedScreen } from "@/features/home/components/HomeFeedScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function HomePage() {
  return (
    <AdminShell title="Home feed" subtitle="The sections on the guest home page, and which listings show in each." showPrimaryAction={false}>
      <HomeFeedScreen />
    </AdminShell>
  );
}
