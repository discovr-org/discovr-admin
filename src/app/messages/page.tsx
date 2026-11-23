import { MessagesScreen } from "@/features/messages/components/MessagesScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

export default function MessagesPage() {
  return (
    <AdminShell
      title="Messages"
      subtitle="Pick who to reach and which WhatsApp template to send."
      showPrimaryAction={false}
    >
      <MessagesScreen />
    </AdminShell>
  );
}
