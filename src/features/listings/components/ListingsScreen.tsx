"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListIcon, PlusIcon } from "@/shared/components/icons";
import {
  deleteExperienceAdmin,
  fetchExperiences,
  patchExperienceAdmin,
  type CatalogExperienceSummary,
} from "@/shared/utils/catalogApi";
import { formatInr } from "@/shared/utils/formatInr";
import { useToast } from "@/shared/components/Toast";
import styles from "../styles/ListingsScreen.module.css";

type StatusFilter = "all" | "published" | "draft" | "archived";
type HostFilter = "all" | "active" | "inactive";
type PriceFilter = "all" | "priced" | "ask";

function statusTone(status: CatalogExperienceSummary["status"]) {
  if (status === "published") return "positive" as const;
  if (status === "archived") return "notice" as const;
  return "neutral" as const;
}

function statusLabel(status: CatalogExperienceSummary["status"]) {
  if (status === "published") return "Active";
  if (status === "archived") return "Inactive";
  return "Draft";
}

export function ListingsScreen() {
  const toast = useToast();
  const [rows, setRows] = useState<CatalogExperienceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [hostFilter, setHostFilter] = useState<HostFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    setError(null);
    return fetchExperiences()
      .then((body) => setRows(body.experiences))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Couldn't load listings.");
        setRows([]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchExperiences()
      .then((body) => {
        if (!cancelled) setRows(body.experiences);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load listings.");
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (hostFilter === "active" && !row.hostActive) return false;
      if (hostFilter === "inactive" && row.hostActive) return false;
      if (priceFilter === "priced" && row.priceFromInr <= 0) return false;
      if (priceFilter === "ask" && row.priceFromInr > 0) return false;
      if (!q) return true;
      const hay = [
        row.title,
        row.slug,
        row.verdict,
        row.hostBusinessName,
        row.placeNeighborhood,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, statusFilter, hostFilter, priceFilter, query]);

  async function onDelete(row: CatalogExperienceSummary) {
    if (
      !window.confirm(
        `Delete “${row.title}” for good? Photos and tags go with it.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    try {
      await deleteExperienceAdmin(row.id);
      toast.success(`Deleted “${row.title}”.`);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(
    row: CatalogExperienceSummary,
    status: CatalogExperienceSummary["status"],
  ) {
    if (status === "published" && !row.verdict.trim()) {
      toast.error("Active listings need a one-line verdict. Edit first.");
      return;
    }
    setBusyId(row.id);
    try {
      await patchExperienceAdmin(row.id, { status });
      toast.success(`Status set to ${statusLabel(status)}.`);
      await load();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update status.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (rows === null) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading listings…</p>;
  }

  if (error) {
    return (
      <EmptyState
        icon={<ListIcon />}
        title="Can't reach the API"
        text={`${error} Start discovr-backend on 8080 with CATALOG_DATA_SOURCE=supabase.`}
        role="alert"
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ListIcon />}
        title="No listings yet"
        text="Add a listing, or run the seed."
        action={
          <Button href="/listings/new" variant="primary" icon={<PlusIcon />}>
            Add listing
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.head}>
        <p className={`t-body-sm ${styles.meta}`}>
          {filtered.length} of {rows.length} from catalog API
        </p>
        <Button href="/listings/new" variant="secondary" icon={<PlusIcon />}>
          Add listing
        </Button>
      </div>

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Find</span>
          <input
            className={styles.filterInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, host, place…"
          />
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Status</span>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="published">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Inactive</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Host</span>
          <select
            className={styles.filterSelect}
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value as HostFilter)}
          >
            <option value="all">All hosts</option>
            <option value="active">Active host</option>
            <option value="inactive">Inactive host</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Price</span>
          <select
            className={styles.filterSelect}
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
          >
            <option value="all">All</option>
            <option value="priced">Has price</option>
            <option value="ask">No price</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className={`t-body-sm ${styles.meta}`}>No listings match these filters.</p>
      ) : (
        <div className={styles.panel}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.colListing}>
                  Listing
                </th>
                <th scope="col" className={styles.colHost}>
                  Host
                </th>
                <th scope="col" className={styles.colStatus}>
                  Status
                </th>
                <th scope="col" className={styles.colPrice}>
                  Price
                </th>
                <th scope="col" className={styles.colActions}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className={styles.colListing}>
                    <div className={styles.listingCell}>
                      <p className={styles.title}>{row.title}</p>
                      <p className={`t-body-sm ${styles.verdict}`}>
                        {row.verdict || row.placeNeighborhood || row.slug}
                      </p>
                    </div>
                  </td>
                  <td className={styles.colHost}>
                    <div className={styles.hostCell}>
                      <p className={styles.hostName}>
                        {row.hostBusinessName || "—"}
                      </p>
                      {!row.hostActive ? (
                        <p className={`t-body-sm ${styles.verdict}`}>
                          Host inactive
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className={styles.colStatus}>
                    <Badge tone={statusTone(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className={styles.colPrice}>
                    <p className={styles.price}>
                      {row.priceFromInr > 0
                        ? formatInr(row.priceFromInr)
                        : "—"}
                    </p>
                  </td>
                  <td className={styles.colActions}>
                    <div className={styles.rowActions}>
                      {row.status !== "published" ? (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setStatus(row, "published")}
                          disabled={busyId === row.id}
                        >
                          Set active
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setStatus(row, "archived")}
                          disabled={busyId === row.id}
                        >
                          Set inactive
                        </button>
                      )}
                      <Link
                        className={styles.actionLink}
                        href={`/listings/${row.id}`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => onDelete(row)}
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
