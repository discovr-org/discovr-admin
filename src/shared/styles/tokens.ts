/** JS-side mirrors of CSS tokens. Prefer `var(--token)` in styles; use these only where CSS vars cannot go (metadata, canvas, etc.). */
export const color = {
  surfaceCanvas: "#061412",
  surfaceRaised: "#141a19",
  surfaceSunken: "#1d2422",
  surfaceOverlay: "#222927",
  surfaceInverse: "#f4f0e3",
  inkPrimary: "#eaebe7",
  inkMuted: "#9ba3a0",
  inkSubtle: "#808886",
  inkInverse: "#061412",
  lineSubtle: "#283130",
  lineStrong: "#636d6b",
  brandPrimary: "#f4f0e3",
  brandPrimaryHover: "#fffdf4",
  brandPrimaryPress: "#ded9c9",
  brandPrimaryOn: "#061412",
  brandTint: "#22211d",
  accentPink: "#ff5c9b",
  accentPinkTint: "#3a1425",
  statePositive: "#57d3a0",
  statePositiveTint: "#0f2a20",
  stateNotice: "#f0b74a",
  stateNoticeTint: "#2e230c",
  stateCritical: "#ff7a63",
  stateCriticalTint: "#33150f",
  focusRing: "#f4f0e3",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const size = {
  tap: 44,
  contentMax: 480,
} as const;

export const motion = {
  enterMs: 180,
  leaveMs: 120,
  enterEasing: "cubic-bezier(0.2, 0, 0, 1)",
  leaveEasing: "linear",
} as const;
