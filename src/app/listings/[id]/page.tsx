import { EditListingScreen } from "@/features/listings/components/EditListingScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell
      title="Edit listing"
      subtitle="Change copy, place, price, or status. Delete if it's gone."
    >
      <EditListingScreen id={id} />
    </AdminShell>
  );
}
