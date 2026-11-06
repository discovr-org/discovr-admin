"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/shared/components/Button";
import {
  LayoutDashboardIcon,
  ListIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@/shared/components/icons";
import { useCatalog } from "@/shared/utils/useCatalog";
import { searchCatalog } from "@/shared/utils/catalogSearch";
import { ADMIN_NAV_GROUPS, type AdminNavId } from "../utils/nav";
import styles from "../styles/AdminShell.module.css";

const ICONS: Record<AdminNavId, typeof LayoutDashboardIcon> = {
  overview: LayoutDashboardIcon,
  listings: ListIcon,
  hosts: UsersIcon,
  search: SearchIcon,
};

export type AdminShellProps = {
  title: string;
  subtitle?: string;
  /** When false, hide the bone primary CTA. */
  showPrimaryAction?: boolean;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  children: ReactNode;
};

export function AdminShell({
  title,
  subtitle,
  showPrimaryAction = true,
  primaryActionLabel = "Add listing",
  primaryActionHref = "/listings/new",
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openHits, setOpenHits] = useState(false);
  const { experiences: exp, hosts: hostRows } = useCatalog();
  const experiences = exp ?? [];
  const hosts = hostRows ?? [];
  const onSearchRoute =
    pathname === "/search" || pathname.startsWith("/search/");
  const onAddListingRoute =
    pathname === "/listings/new" || pathname.startsWith("/listings/new/");
  const onAddHostRoute =
    pathname === "/hosts/new" || pathname.startsWith("/hosts/new/");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(max-width: 1100px)").matches) {
          router.push("/search");
          return;
        }
        inputRef.current?.focus();
        setOpenHits(true);
      }
      if (e.key === "Escape") setOpenHits(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const previewHits = searchCatalog(query, experiences, hosts).slice(0, 8);

  function goSearch(raw: string) {
    const q = raw.trim();
    setOpenHits(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    goSearch(query);
  }

  return (
    <div className={styles.shell}>
      {navOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={[styles.sidebar, navOpen ? styles.sidebarOpen : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label="Admin"
      >
        <div className={styles.brand}>
          <p className={styles.wordmark}>discovr</p>
          <p className={`t-caption ${styles.brandMeta}`}>admin</p>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.id} className={styles.navGroup}>
              <p className={`t-caption ${styles.navGroupLabel}`}>{group.label}</p>
              <div className={styles.navGroupLinks}>
                {group.items.map((item) => {
                  const Icon = ICONS[item.id];
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={[
                        styles.navLink,
                        active ? styles.navLinkActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setNavOpen(false)}
                    >
                      <Icon />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <span className={styles.operatorAvatar} aria-hidden>
            ops
          </span>
          <div className={styles.operatorCopy}>
            <span className={styles.operatorName}>Ops desk</span>
            <span className={`t-caption ${styles.operatorRole}`}>internal</span>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLead}>
            <button
              type="button"
              className={styles.menuToggle}
              aria-label="Open menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <MenuIcon />
            </button>
            <div className={styles.topbarCopy}>
              <p className={`t-caption ${styles.crumb}`}>Home / {title}</p>
              <h1 className={styles.title}>{title}</h1>
              {subtitle ? (
                <p className={`t-body-sm ${styles.subtitle}`}>{subtitle}</p>
              ) : null}
            </div>
          </div>

          {!onSearchRoute ? (
            <div className={styles.searchWrap}>
              <form className={styles.search} onSubmit={onSearch} role="search">
                <SearchIcon />
                <label className="vh" htmlFor={searchId}>
                  Search catalog
                </label>
                <input
                  ref={inputRef}
                  id={searchId}
                  className={styles.searchInput}
                  placeholder="Search listings or hosts"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpenHits(true);
                  }}
                  onFocus={() => setOpenHits(true)}
                  onBlur={() => {
                    window.setTimeout(() => setOpenHits(false), 150);
                  }}
                  autoComplete="off"
                />
                <kbd className={styles.searchHint}>⌘K</kbd>
              </form>
              {openHits && query.trim() ? (
                <div
                  className={styles.hitPanel}
                  role="listbox"
                  aria-label="Search suggestions"
                >
                  {previewHits.length === 0 ? (
                    <p className={`t-body-sm ${styles.hitEmpty}`}>No matches</p>
                  ) : (
                    <ul className={styles.hitList}>
                      {previewHits.map((hit) => (
                        <li key={`${hit.kind}-${hit.id}`}>
                          <Link
                            className={styles.hitLink}
                            href={hit.href}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setOpenHits(false)}
                          >
                            <span className={styles.hitKind}>
                              {hit.kind === "listing" ? "Listing" : "Host"}
                            </span>
                            <span className={styles.hitTitle}>{hit.title}</span>
                            <span className={`t-body-sm ${styles.hitDetail}`}>
                              {hit.detail}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={styles.hitAll}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goSearch(query)}
                  >
                    See all results
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.searchSpacer} aria-hidden />
          )}

          <div className={styles.topbarActions}>
            <Link
              href="/search"
              className={styles.searchMobile}
              aria-label="Search catalog"
            >
              <SearchIcon />
            </Link>
            {showPrimaryAction && !onAddListingRoute && !onAddHostRoute ? (
              <Button
                href={primaryActionHref}
                variant="primary"
                icon={<PlusIcon />}
              >
                {primaryActionLabel}
              </Button>
            ) : null}
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
