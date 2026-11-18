/** Latitude and longitude inside a pasted Google Maps link, when the link carries them. Short links (maps.app.goo.gl) don't, so they return null. */
export function coordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const pair = String(url)
    .match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/) ??
    url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/) ??
    url.match(/[?&](?:q|query|ll|destination)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/);
  if (!pair) return null;
  const lat = Number(pair[1]);
  const lng = Number(pair[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
