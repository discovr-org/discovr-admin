"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/shared/components/Badge";
import { EmptyState } from "@/shared/components/EmptyState";
import { SearchIcon } from "@/shared/components/icons";
import {
  fetchExperiences,
  fetchHosts,
  type CatalogExperienceSummary,
  type CatalogHostSummary,
} from "@/shared/utils/catalogApi";
import { searchCatalog } from "@/shared/utils/catalogSearch";
import styles from "../styles/SearchScreen.module.css";

type Props = {
  initialQuery?: string;
};

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

export function SearchScreen({ initialQuery = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [experiences, setExperiences] = useState<
    CatalogExperienceSummary[] | null
  >(null);
  const [hosts, setHosts] = useState<CatalogHostSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchExperiences(), fetchHosts()])
      .then(([exp, hostBody]) => {
        if (cancelled) return;
        setExperiences(exp.experiences);
        setHosts(hostBody.hosts);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't search.");
        setExperiences([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hits = useMemo(() => {
    if (!experiences) return [];
    return searchCatalog(query, experiences, hosts);
  }, [query, experiences, hosts]);

  const listingHits = hits.filter((h) => h.kind === "listing");
  const hostHits = hits.filter((h) => h.kind === "host");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  if (error) {
    return (
      <EmptyState
        icon={<SearchIcon />}
        title="Can't reach the API"
        text={`${error} Start discovr-backend on 8080.`}
        role="alert"
      />
    );
  }

  if (experiences === null) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading catalog…</p>;
  }

  const trimmed = query.trim();

  return (
    <div className={styles.stack}>
      <form className={styles.form} onSubmit={onSubmit} role="search">
        <SearchIcon />
        <label className="vh" htmlFor="catalog-search-page">
          Search listings and hosts
        </label>
        <input
          id="catalog-search-page"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try Paloma, Assagao, phone…"
          autoComplete="off"
          autoFocus
        />
      </form>

      {!trimmed ? (
        <p className={`t-body-sm ${styles.meta}`}>
          Type a name, place, verdict, host, or phone.
        </p>
      ) : hits.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Nothing matched"
          text={`No listings or hosts for “${trimmed}”.`}
        />
      ) : (
        <>
          <p className={`t-body-sm ${styles.meta}`}>
            {hits.length} result{hits.length === 1 ? "" : "s"} for “{trimmed}”
          </p>

          {listingHits.length > 0 ? (
            <section className={styles.section} aria-labelledby="listings-hits">
              <h2 id="listings-hits" className={`t-title-sm ${styles.sectionTitle}`}>
                Listings
              </h2>
              <ul className={styles.list}>
                {listingHits.map((hit) => (
                  <li key={hit.id} className={styles.item}>
                    <Link className={styles.link} href={hit.href}>
                      <div className={styles.copy}>
                        <p className={styles.title}>{hit.title}</p>
                        <p className={`t-body-sm ${styles.detail}`}>{hit.detail}</p>
                      </div>
                      {"status" in hit ? (
                        <span className={styles.kind}>
                          <Badge tone={statusTone(hit.status)}>
                            {statusLabel(hit.status)}
                          </Badge>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hostHits.length > 0 ? (
            <section className={styles.section} aria-labelledby="hosts-hits">
              <h2 id="hosts-hits" className={`t-title-sm ${styles.sectionTitle}`}>
                Hosts
              </h2>
              <ul className={styles.list}>
                {hostHits.map((hit) => (
                  <li key={hit.id} className={styles.item}>
                    <Link className={styles.link} href={hit.href}>
                      <div className={styles.copy}>
                        <p className={styles.title}>{hit.title}</p>
                        <p className={`t-body-sm ${styles.detail}`}>{hit.detail}</p>
                      </div>
                      <span className={styles.kind}>
                        <Badge tone="neutral">Host</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
