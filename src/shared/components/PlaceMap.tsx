"use client";

import styles from "./PlaceMap.module.css";

type Props = {
  lat: number;
  lng: number;
  /** Optional override for the “open” link. Defaults to Google Maps search. */
  mapsUrl?: string;
  label?: string;
};

function isValidCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function osmEmbedSrc(lat: number, lng: number) {
  const pad = 0.02;
  const bbox = [
    lng - pad,
    lat - pad,
    lng + pad,
    lat + pad,
  ]
    .map((n) => n.toFixed(6))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

/**
 * Dark-friendly map preview for admin. Uses OSM embed (no API key).
 */
export function PlaceMap({ lat, lng, mapsUrl, label = "Map pin" }: Props) {
  if (!isValidCoord(lat, lng)) {
    return (
      <p className={`t-body-sm ${styles.empty}`}>
        Add lat and lng to see the map.
      </p>
    );
  }

  const openHref = mapsUrl?.trim() || googleMapsUrl(lat, lng);

  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <iframe
          title={label}
          className={styles.iframe}
          src={osmEmbedSrc(lat, lng)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className={`t-body-sm ${styles.meta}`}>
        {lat.toFixed(5)}, {lng.toFixed(5)} ·{" "}
        <a
          className={styles.open}
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}
