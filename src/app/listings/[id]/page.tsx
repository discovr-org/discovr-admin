import { EditListingScreen } from "@/features/listings/components/EditListingScreen";

type Props = { params: Promise<{ id: string }> };

/** Full-screen editor: it has its own top bar, so no AdminShell. */
export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  return <EditListingScreen key={id} id={id} />;
}
