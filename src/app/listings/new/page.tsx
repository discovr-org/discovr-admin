import { EditListingScreen } from "@/features/listings/components/EditListingScreen";

/** A new listing opens the full editor. Nothing is created until Save changes. */
export default function NewListingPage() {
  return <EditListingScreen id={null} />;
}
