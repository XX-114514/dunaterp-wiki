// DunaTerp pixel palette.
//
// One locked palette for the whole world. Every sprite, tile and UI chrome
// colour is looked up from here by its single-character key, so the art stays
// coherent and a colour can be retuned in one place.
//
// The four product hues (s/t/u/v) are reserved: they identify the four product
// strains everywhere on the wiki and are never used as decoration.

export const PALETTE: Record<string, string> = {
  // Ink and deep greens — outlines, night water, structure shadow.
  "1": "#06221f",
  "2": "#0d3a33",
  "3": "#17544a",
  "4": "#2b7a63",
  "5": "#4ea36f",

  // Algae greens — Dunaliella, reeds, lime accents.
  "6": "#7cc45a",
  "7": "#a8dc3c",
  "8": "#cdf558",
  "9": "#eaffb0",

  // Salt crust — the dominant ground family.
  a: "#fdf6e3",
  b: "#f0e4c8",
  c: "#dccfae",
  d: "#b9ac8c",
  e: "#8f8468",

  // Brine bloom — hypersaline ponds coloured by Dunaliella carotenoids.
  f: "#f2b6ad",
  g: "#e0897f",
  h: "#c26a68",
  I: "#9b5052",
  J: "#1f7a86",
  i: "#f9b95c",
  j: "#ef8330",

  // Open water — the low-salinity end of the lake.
  k: "#9fe3e0",
  l: "#5fc4c9",
  m: "#3d9aa6",
  n: "#256373",

  // Timber — boardwalk, posts, crates, signage.
  o: "#d9a86a",
  p: "#b5814a",
  q: "#8a5b33",
  r: "#5e3c22",

  // Product strains. Reserved identity colours.
  s: "#f7a52d", // beta-ionone
  t: "#e65c42", // astaxanthin
  u: "#e9c43a", // crocetin
  v: "#ee7a3a", // beta-citraurin

  // Support accents.
  w: "#c4a8ff", // modelling / dry lab
  x: "#7de2ff", // data / instrumentation
  y: "#ffffff",
  z: "#ff5e45",

  // Neutrals and glow.
  A: "#3a2f22",
  B: "#6b7a5a",
  C: "#cbbfa0",
  D: "#ffe9b0",
  E: "#35544c",
  F: "#f4ead2",
  G: "#7a6b52",
  H: "#4a5f57",
};

export const TRANSPARENT = ".";

export function colorOf(key: string): string {
  const value = PALETTE[key];
  if (!value) throw new Error(`Unknown palette key: ${key}`);
  return value;
}

/** Palette keys grouped for reuse by the scene builders. */
export const RAMP = {
  salt: ["a", "b", "c", "d"] as const,
  brine: ["f", "g", "h"] as const,
  amber: ["i", "j"] as const,
  water: ["k", "l", "m", "n"] as const,
  wood: ["o", "p", "q", "r"] as const,
  algae: ["9", "8", "7", "6"] as const,
  product: ["s", "t", "u", "v"] as const,
};
