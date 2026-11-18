"use client";

import { useState } from "react";
import { fetchCategories } from "@/features/categories/utils/categoryApi";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { fetchExperienceAdmin, fetchHosts } from "@/shared/utils/catalogApi";
import { toForm } from "./EditListingScreen";
import { downloadCsv } from "../utils/csv";
import { rowFromForm, SHEET_HEADER } from "../utils/listingSheet";

/** Every listing as a CSV row, in the same columns the import reads, so an export can be edited and uploaded again. */
export function ExportListingsButton({ ids }: { ids: string[] }) {
  const toast = useToast();
  const [progress, setProgress] = useState<string | null>(null);

  async function onExport() {
    try {
      const [{ hosts }, categories] = await Promise.all([fetchHosts(), fetchCategories().catch(() => [])]);
      const rows: string[][] = [SHEET_HEADER];
      for (const [i, id] of ids.entries()) {
        setProgress(`Exporting ${i + 1} of ${ids.length}…`);
        rows.push(rowFromForm(toForm(await fetchExperienceAdmin(id)), { hosts, categories }));
      }
      downloadCsv(`discovr-listings-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't export.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void onExport()} disabled={progress !== null || ids.length === 0}>
      {progress ?? "Export CSV"}
    </Button>
  );
}
