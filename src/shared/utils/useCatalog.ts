"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  fetchExperiences,
  fetchHosts,
  type CatalogExperienceSummary,
  type CatalogHostSummary,
} from "@/shared/utils/catalogApi";

/**
 * One copy of each list for the whole app. Pages show it instantly, then refresh it in the
 * background. The two lists load on their own, so a page never waits for the one it doesn't use.
 *
 * Changes show on screen first and are sent to the API after. Each helper below returns an
 * `undo` that puts back just that row if the API says no (the Linear way, minus the sync engine).
 * ponytail: no focus/interval refetch. Add if two people edit at once and see stale lists.
 */
function slot<T>(key: string, fetcher: () => Promise<T>) {
  let value: T | null = null;
  let hydrated = false;
  let inflight: Promise<T> | null = null;
  let version = 0; // bumped on every local change
  const listeners = new Set<(v: T) => void>();
  // The last copy is kept in localStorage, so a reload shows data at once instead of "Loading…".
  const read = () => {
    if (!hydrated && typeof window !== "undefined") {
      hydrated = true;
      try {
        value = JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
      } catch {
        /* bad copy: start empty */
      }
    }
    return value;
  };
  const publish = (v: T) => {
    value = v;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
    listeners.forEach((fn) => fn(v));
  };
  return {
    get: read,
    update(fn: (v: T) => T) {
      if (read() === null) return;
      version += 1;
      publish(fn(value as T));
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    load(): Promise<T> {
      const started = version;
      inflight ??= fetcher()
        .then((v) => {
          // A local change landed while this was loading: the answer may be older, drop it.
          if (version === started) publish(v);
          return v;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
  };
}

const experiencesSlot = slot("discovr.admin.experiences", () => fetchExperiences().then((r) => r.experiences));
const hostsSlot = slot("discovr.admin.hosts", () => fetchHosts().then((r) => r.hosts));

type Undo = () => void;

/** Row-level changes for a list of `{ id }` rows. */
function rowOps<T extends { id: string }>(s: ReturnType<typeof slot<T[]>>) {
  return {
    patch(id: string, partial: Partial<T>): Undo {
      const before = s.get()?.find((r) => r.id === id);
      s.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...partial } : r)));
      return () => {
        if (!before) return;
        const keys = Object.keys(partial) as (keyof T)[];
        const old = Object.fromEntries(keys.map((k) => [k, before[k]])) as Partial<T>;
        s.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...old } : r)));
      };
    },
    remove(id: string): Undo {
      const rows = s.get() ?? [];
      const at = rows.findIndex((r) => r.id === id);
      const gone = rows[at];
      s.update((all) => all.filter((r) => r.id !== id));
      return () => {
        if (!gone) return;
        s.update((all) => [...all.slice(0, at), gone, ...all.slice(at)]);
      };
    },
  };
}

const experienceOps = rowOps<CatalogExperienceSummary>(experiencesSlot);
const hostOps = rowOps<CatalogHostSummary>(hostsSlot);

export const patchExperienceLocal = experienceOps.patch;
export const removeExperienceLocal = experienceOps.remove;
export const patchHostLocal = hostOps.patch;
export const removeHostLocal = hostOps.remove;

function useSlot<T>(s: ReturnType<typeof slot<T>>) {
  // Server render and first client render both see null, so there is no hydration mismatch.
  const data = useSyncExternalStore(s.subscribe, s.get, () => null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      s.load().then(
        () => setError(null),
        (err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load."),
      ),
    [s],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}

export function useCatalog() {
  const e = useSlot(experiencesSlot);
  const h = useSlot(hostsSlot);
  const { reload: reloadE } = e;
  const { reload: reloadH } = h;
  const reload = useCallback(
    () => Promise.all([reloadE(), reloadH()]).then(() => undefined),
    [reloadE, reloadH],
  );
  return { experiences: e.data, hosts: h.data, error: e.error ?? h.error, reload };
}
