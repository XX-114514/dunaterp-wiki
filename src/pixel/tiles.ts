// Ground tiles for the salt lake.
//
// Each tile paints itself with deterministic per-coordinate variation, so a
// 3000px-wide crust never shows a repeat, and edges are resolved against the
// four neighbours instead of needing a hand-drawn autotile sheet.

import { dither, hash2, px, rect, type Painter } from "./paint";

export const TILE = 16;

export const enum Tile {
  Salt = 0,
  SaltDamp = 1,
  Sand = 2,
  Mud = 3,
  Brine = 4,
  BrineDeep = 5,
  Amber = 6,
  Water = 7,
  WaterDeep = 8,
  Plank = 9,
  AlgaeMat = 10,
  Rock = 11,
  /** Carotenoid-stained evaporite crust: the band left as a pond dries back. */
  Mineral = 12,
  AmberDeep = 13,
}

export type Neighbours = (dx: number, dy: number) => Tile;

const WET = new Set<Tile>([Tile.Brine, Tile.BrineDeep, Tile.Amber, Tile.AmberDeep, Tile.Water, Tile.WaterDeep]);

export function isWet(tile: Tile): boolean {
  return WET.has(tile);
}

/** Tiles the hero cannot walk onto in free-roam mode. */
export function isSolid(tile: Tile): boolean {
  return tile === Tile.BrineDeep || tile === Tile.WaterDeep || tile === Tile.AmberDeep;
}

/** Walking speed multiplier — shallow water and mud slow the hero down. */
export function drag(tile: Tile): number {
  switch (tile) {
    case Tile.Brine:
    case Tile.Amber:
    case Tile.Water:
      return 0.62;
    case Tile.Mineral:
      return 0.94;
    case Tile.Mud:
      return 0.78;
    case Tile.Plank:
      return 1.12;
    default:
      return 1;
  }
}

type TilePainter = (p: Painter, x: number, y: number, tx: number, ty: number) => void;

// --- Salt plate field -----------------------------------------------------
// A dry salt pan cracks into polygons a few metres across. The pattern is a
// jittered Voronoi evaluated at 2px granularity: cheap, deterministic, and the
// single most recognisable thing about this landscape.

const PLATE = 5.5;

function plateSite(cx: number, cy: number): [number, number] {
  return [
    (cx + 0.18 + hash2(cx, cy, 911) * 0.64) * PLATE,
    (cy + 0.18 + hash2(cx, cy, 917) * 0.64) * PLATE,
  ];
}

/** Nearest-site id and the distance gap to the second nearest, in tile units. */
function plateAt(px: number, py: number): { id: number; edge: number } {
  const cx0 = Math.floor(px / PLATE);
  const cy0 = Math.floor(py / PLATE);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const [sx, sy] = plateSite(cx, cy);
      const d = Math.hypot(sx - px, sy - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = (cx * 73856093) ^ (cy * 19349663);
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return { id, edge: d2 - d1 };
}

/**
 * Paint one tile of crust. Each polygon takes a single flat tone from its own
 * ramp, with a lifted ridge and a dark crack at the boundary — a plate is a
 * plate, not a field of noise, and only a minority of them get any texture at
 * all. That restraint is what makes a salt pan read as a salt pan.
 */
function paintPlates(
  p: Painter,
  x: number,
  y: number,
  tx: number,
  ty: number,
  tones: readonly string[],
  ridge: string,
  crack: string,
) {
  for (let sy = 0; sy < TILE; sy += 2) {
    for (let sx = 0; sx < TILE; sx += 2) {
      const { id, edge } = plateAt(tx + (sx + 1) / TILE, ty + (sy + 1) / TILE);
      if (edge < 0.05) rect(p, x + sx, y + sy, 2, 2, crack);
      else if (edge < 0.11) rect(p, x + sx, y + sy, 2, 2, ridge);
      else rect(p, x + sx, y + sy, 2, 2, tones[Math.abs(id) % tones.length]);
    }
  }
}

/** The salt plate a tile belongs to. Terrain generation aligns damp patches to
 * these so a wet area is a whole plate, never an axis-aligned block of tiles. */
export function plateIdAt(tx: number, ty: number): number {
  return plateAt(tx + 0.5, ty + 0.5).id;
}

/** True for the minority of plates that carry a broken, granular surface. */
function plateIsRough(tx: number, ty: number): boolean {
  const { id } = plateAt(tx + 0.5, ty + 0.5);
  return hash2(Math.abs(id) % 4093, 0, 977) > 0.72;
}

const SALT_TONES = ["a", "a", "F", "a", "b", "F"] as const;

const saltCrust: TilePainter = (p, x, y, tx, ty) => {
  paintPlates(p, x, y, tx, ty, SALT_TONES, "y", "c");
  if (plateIsRough(tx, ty)) dither(p, x, y, TILE, TILE, "b", 3, tx);
  // One or two glints per few tiles, never a field of them.
  if (hash2(tx, ty, 41) > 0.93) {
    px(p, x + Math.floor(hash2(tx, ty, 43) * TILE), y + Math.floor(hash2(tx, ty, 47) * TILE), "y");
  }
};

const MINERAL_TONES = ["i", "i", "D", "i", "s", "D"] as const;

const mineral: TilePainter = (p, x, y, tx, ty) => {
  // The same plate structure, stained by the carotenoids the bloom leaves
  // behind as a pond dries back.
  paintPlates(p, x, y, tx, ty, MINERAL_TONES, "D", "j");
  if (plateIsRough(tx, ty)) dither(p, x, y, TILE, TILE, "s", 3, tx + ty);
};

const DAMP_TONES = ["b", "c", "b", "C", "c", "b"] as const;

const saltDamp: TilePainter = (p, x, y, tx, ty) => {
  paintPlates(p, x, y, tx, ty, DAMP_TONES, "C", "d");
  if (plateIsRough(tx, ty)) dither(p, x, y, TILE, TILE, "C", 3, tx);
};

const sand: TilePainter = (p, x, y, tx, ty) => {
  rect(p, x, y, TILE, TILE, "c");
  dither(p, x, y, TILE, TILE, "d", 3, tx);
  for (let i = 0; i < 2; i += 1) {
    if (hash2(tx + i, ty, 61) > 0.7) {
      px(p, x + Math.floor(hash2(tx, ty + i, 67) * TILE), y + Math.floor(hash2(tx + i, ty, 71) * TILE), "e");
    }
  }
};

const mud: TilePainter = (p, x, y, tx, ty) => {
  rect(p, x, y, TILE, TILE, "G");
  dither(p, x, y, TILE, TILE, "e", 2, tx + ty * 3);
  if (hash2(tx, ty, 73) > 0.75) dither(p, x + 3, y + 4, 9, 6, "A", 3);
};

/**
 * Standing water. Shallow tiles are a 50/50 screen of two neighbouring tones,
 * which optically mixes to a colour between them and keeps the surface from
 * reading as one flat fill; deep tiles carry a sparser, darker screen so the
 * centre of a pond has weight.
 */
function pond(base: string, light: string, dark: string, deepTile: boolean): TilePainter {
  return (p, x, y, tx, ty) => {
    rect(p, x, y, TILE, TILE, base);
    dither(p, x, y, TILE, TILE, deepTile ? dark : light, 1, tx + ty);
    dither(p, x, y, TILE, TILE, deepTile ? dark : base, 2, tx * 3 + ty);
    if (!deepTile && hash2(tx, ty, 79) > 0.78) {
      rect(p, x + 3, y + 6, 7, 1, light);
      rect(p, x + 6, y + 10, 4, 1, light);
    }
  };
}

const plank: TilePainter = (p, x, y, tx, ty) => {
  rect(p, x, y, TILE, TILE, "p");
  for (let i = 0; i < TILE; i += 4) {
    rect(p, x, y + i, TILE, 1, "q");
    rect(p, x, y + i + 1, TILE, 2, "o");
    rect(p, x, y + i + 3, TILE, 1, "p");
  }
  // Nail heads and the odd bleached board.
  if (hash2(tx, ty, 83) > 0.6) rect(p, x, y + 4 * (Math.floor(hash2(tx, ty, 89) * 4)), TILE, 2, "o");
  px(p, x + 2, y + 2, "r");
  px(p, x + TILE - 3, y + 2, "r");
};

const algaeMat: TilePainter = (p, x, y, tx, ty) => {
  // A drying algal mat over crust: mostly the crust tone, greened where it is
  // still wet. Loud flat green reads as a texture swatch, not as biology.
  paintPlates(p, x, y, tx, ty, DAMP_TONES, "C", "d");
  dither(p, x, y, TILE, TILE, "B", 3, tx + ty);
  dither(p, x, y, TILE, TILE, "H", 3, tx * 2 + 1);
  if (hash2(tx, ty, 97) > 0.9) px(p, x + 7, y + 7, "6");
};

const rock: TilePainter = (p, x, y, tx, ty) => {
  rect(p, x, y, TILE, TILE, "d");
  dither(p, x, y, TILE, TILE, "e", 2, tx);
  dither(p, x + 2, y + 2, TILE - 4, TILE - 4, "C", 3, ty);
  if (hash2(tx, ty, 101) > 0.5) rect(p, x + 2, y + 3, TILE - 5, 1, "a");
};

const PAINTERS: Record<Tile, TilePainter> = {
  [Tile.Salt]: saltCrust,
  [Tile.SaltDamp]: saltDamp,
  [Tile.Sand]: sand,
  [Tile.Mud]: mud,
  [Tile.Brine]: pond("g", "f", "h", false),
  [Tile.BrineDeep]: pond("h", "g", "I", true),
  [Tile.Amber]: pond("i", "D", "j", false),
  [Tile.Water]: pond("l", "k", "m", false),
  [Tile.WaterDeep]: pond("m", "l", "n", true),
  [Tile.Plank]: plank,
  [Tile.AlgaeMat]: algaeMat,
  [Tile.Rock]: rock,
  [Tile.Mineral]: mineral,
  [Tile.AmberDeep]: pond("j", "i", "h", true),
};

/** Rim colour drawn on a wet tile where it meets dry ground. */
const RIM: Partial<Record<Tile, string>> = {
  [Tile.Brine]: "f",
  [Tile.BrineDeep]: "g",
  [Tile.Amber]: "D",
  [Tile.AmberDeep]: "i",
  [Tile.Water]: "k",
  [Tile.WaterDeep]: "l",
};

export function paintTile(
  p: Painter,
  tile: Tile,
  tx: number,
  ty: number,
  at: Neighbours,
) {
  const x = tx * TILE;
  const y = ty * TILE;
  PAINTERS[tile](p, x, y, tx, ty);

  // Shoreline: a bright rim on the side facing dry land, plus a damp fringe
  // painted back onto the land tile in the caller's second pass.
  const rim = RIM[tile];
  if (rim) {
    if (!isWet(at(0, -1))) rect(p, x, y, TILE, 1, rim);
    if (!isWet(at(0, 1))) rect(p, x, y + TILE - 1, TILE, 1, rim);
    if (!isWet(at(-1, 0))) rect(p, x, y, 1, TILE, rim);
    if (!isWet(at(1, 0))) rect(p, x + TILE - 1, y, 1, TILE, rim);
  }

  // Boardwalk ends get a visible plank cap so the path reads as built.
  if (tile === Tile.Plank) {
    if (at(0, -1) !== Tile.Plank) rect(p, x, y, TILE, 2, "r");
    if (at(0, 1) !== Tile.Plank) rect(p, x, y + TILE - 2, TILE, 2, "r");
    if (at(-1, 0) !== Tile.Plank) rect(p, x, y, 2, TILE, "r");
    if (at(1, 0) !== Tile.Plank) rect(p, x + TILE - 2, y, 2, TILE, "r");
  }

  // Dry tiles next to water darken slightly — cheap wet-sand contact.
  if (!isWet(tile) && tile !== Tile.Plank) {
    const wetNorth = isWet(at(0, -1));
    const wetSouth = isWet(at(0, 1));
    const wetWest = isWet(at(-1, 0));
    const wetEast = isWet(at(1, 0));
    if (wetNorth) dither(p, x, y, TILE, 4, "d", 2, tx);
    if (wetSouth) dither(p, x, y + TILE - 4, TILE, 4, "d", 2, tx);
    if (wetWest) dither(p, x, y, 4, TILE, "d", 2, ty);
    if (wetEast) dither(p, x + TILE - 4, y, 4, TILE, "d", 2, ty);
  }
}
