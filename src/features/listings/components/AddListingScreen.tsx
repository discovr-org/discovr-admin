"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/Button";
import { createExperienceAdmin, fetchHosts } from "@/shared/utils/catalogApi";
import styles from "../styles/EditListingScreen.module.css";

/**
 * "Add listing" opens the editor straight away: it makes an empty draft and goes to it, so the
 * layout, the fields and the phone preview are all in one place. A draft nobody fills in can be deleted from its page.
 */
export function AddListingScreen() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [noHosts, setNoHosts] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return; // dev mode runs effects twice; one draft is enough
    started.current = true;
    (async () => {
      try {
        const { hosts } = await fetchHosts();
        if (!hosts[0]) return setNoHosts(true);
        const created = await createExperienceAdmin({
          title: "Untitled listing",
          slug: `untitled-${Date.now().toString(36)}`,
          hostId: hosts[0].id,
          status: "draft",
          about: "",
          placeName: "To be added",
          placeNeighborhood: "Goa",
          placeLat: 15.49,
          placeLng: 73.82,
          priceFromInr: 0,
        });
        router.replace(`/listings/${created.id}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Couldn't start a new listing.");
      }
    })();
  }, [router, attempt]);

  if (noHosts) {
    return (
      <p className="t-body-sm" role="alert">
        A listing needs a host first. <a href="/hosts/new">Add a host</a>, then come back.
      </p>
    );
  }
  if (error) {
    return (
      <div className={styles.panel} role="alert">
        <p className={`t-body-sm ${styles.error}`}>{error}</p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={() => {
              setError(null);
              started.current = false;
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
          <Button href="/listings" variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p className="t-body-sm" role="status">
      Opening the editor…
    </p>
  );
}
