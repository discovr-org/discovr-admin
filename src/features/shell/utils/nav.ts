export type AdminNavId = "overview" | "listings" | "hosts" | "search";

export type AdminNavItem = {
  id: AdminNavId;
  href: string;
  label: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

/** Only routes backed by the catalog API. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { id: "overview", href: "/", label: "Overview" },
      { id: "listings", href: "/listings", label: "Listings" },
      { id: "hosts", href: "/hosts", label: "Hosts" },
      { id: "search", href: "/search", label: "Search" },
    ],
  },
];

/** Flat list for icon maps / lookups. */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items,
);
