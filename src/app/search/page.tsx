import { SearchScreen } from "@/features/search/components/SearchScreen";
import { AdminShell } from "@/features/shell/components/AdminShell";

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.q;
  const initialQuery = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");

  return (
    <AdminShell
      title="Search"
      subtitle="Find a listing or host in the catalog."
    >
      <SearchScreen initialQuery={initialQuery} />
    </AdminShell>
  );
}
