"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { BarList } from "@/shared/components/BarList";
import { Button } from "@/shared/components/Button";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { DonutChart } from "@/shared/components/DonutChart";
import { PageHeader } from "@/shared/components/PageHeader";
import { ProgressBar } from "@/shared/components/ProgressBar";
import { StatCard } from "@/shared/components/StatCard";
import { ListIcon, StarIcon, UsersIcon } from "@/shared/components/icons";
import {
  fetchExperiences,
  fetchHosts,
  type CatalogExperienceSummary,
} from "@/shared/utils/catalogApi";
import { formatInr } from "@/shared/utils/formatInr";
import styles from "../styles/OverviewDashboard.module.css";

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

export function OverviewDashboard() {
  const [listings, setListings] = useState<CatalogExperienceSummary[] | null>(
    null,
  );
  const [hostCount, setHostCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchExperiences(), fetchHosts()])
      .then(([exp, hosts]) => {
        if (cancelled) return;
        setListings(exp.experiences);
        setHostCount(hosts.hosts.length);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load overview.");
        setListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const rows = listings ?? [];
    const live = rows.filter((r) => r.status === "published").length;
    const drafts = rows.filter((r) => r.status === "draft").length;
    const archived = rows.filter((r) => r.status === "archived").length;
    const withPrice = rows.filter((r) => r.priceFromInr > 0);
    const avgPrice =
      withPrice.length === 0
        ? 0
        : Math.round(
            withPrice.reduce((s, r) => s + r.priceFromInr, 0) / withPrice.length,
          );
    return {
      live,
      drafts,
      archived,
      total: rows.length,
      avgPrice,
      hostCount,
    };
  }, [listings, hostCount]);

  const placeBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of listings ?? []) {
      const key = row.placeNeighborhood || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(1, ...entries.map(([, n]) => n));
    return entries.map(([label, n]) => ({
      id: label,
      label,
      valueLabel: `${n}`,
      percent: Math.round((n / max) * 100),
    }));
  }, [listings]);

  const statusDonut = useMemo(
    () => [
      { label: "Active", value: Math.max(stats.live, 0.001), tone: "positive" as const },
      { label: "Draft", value: Math.max(stats.drafts, 0.001), tone: "notice" as const },
      {
        label: "Inactive",
        value: Math.max(stats.archived, 0.001),
        tone: "muted" as const,
      },
    ],
    [stats],
  );

  if (listings === null) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading overview…</p>;
  }

  if (error) {
    return (
      <p className={`t-body-sm ${styles.error}`} role="alert">
        {error}. Start the API on 8080.
      </p>
    );
  }

  const liveShare =
    stats.total === 0 ? 0 : Math.round((stats.live / stats.total) * 100);

  return (
    <div className={styles.stack}>
      <PageHeader
        pretitle="Overview"
        title="Dashboard"
        actions={
          <Button href="/listings" variant="secondary">
            All listings
          </Button>
        }
      />

      <section className={styles.stats3} aria-label="Snapshot">
        <StatCard
          label="Active listings"
          value={String(stats.live)}
          change={`${stats.total} total`}
          changeTone="up"
          subtext="Shown on the web"
          icon={<ListIcon />}
          iconTone="bone"
        />
        <StatCard
          label="Active hosts"
          value={String(stats.hostCount)}
          change="from API"
          changeTone="flat"
          subtext="Tied to listings"
          icon={<UsersIcon />}
          iconTone="positive"
        />
        <StatCard
          label="Drafts waiting"
          value={String(stats.drafts)}
          change={stats.drafts ? "needs verdict" : "clear"}
          changeTone={stats.drafts ? "down" : "up"}
          subtext="Publish only with a verdict"
          icon={<StarIcon />}
          iconTone="notice"
        />
      </section>

      <section className={styles.stats3} aria-label="More stats">
        <StatCard
          label="Avg price from"
          value={stats.avgPrice ? formatInr(stats.avgPrice) : "—"}
          changeTone="up"
          subtext="Across priced listings"
          iconTone="positive"
          progress={Math.min(100, Math.round(stats.avgPrice / 50))}
          progressTone="positive"
        />
        <StatCard
          label="Live share"
          value={`${liveShare}%`}
          changeTone="up"
          subtext="Published vs all"
          iconTone="critical"
          progress={liveShare}
          progressTone="bone"
        />
        <StatCard
          label="Inactive"
          value={String(stats.archived)}
          changeTone="flat"
          subtext="Hidden on the web"
          iconTone="muted"
          progress={
            stats.total === 0
              ? 0
              : Math.round((stats.archived / stats.total) * 100)
          }
          progressTone="muted"
        />
      </section>

      <div className={styles.row84}>
        <Card>
          <CardHeader
            title="Listings"
            subtitle="From the catalog API"
            action={
              <Button href="/listings" variant="secondary">
                View all
              </Button>
            }
          />
          <CardBody flush>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Listing</th>
                    <th scope="col">Host</th>
                    <th scope="col">Status</th>
                    <th scope="col">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <p className={`t-body-sm ${styles.metaPad}`}>
                          No listings yet.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    listings.slice(0, 8).map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link
                            className={styles.listingTitle}
                            href={`/listings/${row.id}`}
                          >
                            {row.title}
                          </Link>
                          <p className={`t-body-sm ${styles.verdict}`}>
                            {row.verdict || row.placeNeighborhood}
                          </p>
                        </td>
                        <td>{row.hostBusinessName || "—"}</td>
                        <td>
                          <Badge tone={statusTone(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className={styles.price}>
                          {row.priceFromInr > 0
                            ? formatInr(row.priceFromInr)
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className={styles.stackGap}>
          <Card>
            <CardHeader
              title="Catalog mix"
              subtitle={`${stats.live} live of ${stats.total}`}
            />
            <CardBody>
              <ProgressBar
                segments={[
                  { value: Math.max(stats.live, 0.01), tone: "bone" },
                  { value: Math.max(stats.drafts, 0.01), tone: "notice" },
                  { value: Math.max(stats.archived, 0.01), tone: "muted" },
                ]}
              />
              <ul className={styles.legend}>
                <li>
                  <span className={styles.dotBone} /> Active {stats.live}
                </li>
                <li>
                  <span className={styles.dotNotice} /> Drafts {stats.drafts}
                </li>
                <li>
                  <span className={styles.dotMuted} /> Inactive {stats.archived}
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status split" />
            <CardBody>
              <DonutChart
                slices={statusDonut}
                centerValue={String(stats.total)}
                centerLabel="listings"
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className={styles.stats3}>
        <Card>
          <CardHeader title="Places in the shortlist" />
          <CardBody>
            {placeBars.length === 0 ? (
              <p className={`t-body-sm ${styles.meta}`}>No places yet.</p>
            ) : (
              <BarList items={placeBars} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
