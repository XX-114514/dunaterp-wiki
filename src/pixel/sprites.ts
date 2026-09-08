// Every sprite in the world, authored as code.
//
// The hero is drawn as character grids because a walk cycle wants hand control
// over each pixel. Everything else is painted procedurally with the DSL in
// paint.ts, which keeps the file small and lets a whole family of props be
// retuned by changing one ramp.

import { drawText, textWidth } from "./font";
import {
  block,
  dither,
  ditherEllipse,
  ellipse,
  frame,
  fromGrid,
  hash2,
  line,
  mirrored,
  px,
  rect,
  stamp,
  surface,
  type Painter,
} from "./paint";

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
// A field researcher in salt-flat kit: wide brim against the glare, pale coat,
// lime team scarf, sample satchel. 14x20, feet on the last row.

export const HERO_W = 14;
export const HERO_H = 20;
const HERO_LEG_ROW = 16;

const HERO_DOWN = [
  "....111111....",
  "...1aaaaaa1...",
  "...1bbbbbb1...",
  "...17777771...",
  ".11aaaaaaaa11.",
  ".1cccccccccc1.",
  "....1oooo1....",
  "....o1oo1o....",
  "....oooooo....",
  "....1qqqq1....",
  "..1433333341..",
  ".1o433333341o1",
  ".1o477777741o1",
  ".1o433333341o1",
  ".1o4p7733341o1",
  "..1433333341..",
  "...12211221...",
  "...12211221...",
  "...1rr11rr1...",
  "...11111111...",
];

const HERO_UP = [
  "....111111....",
  "...1aaaaaa1...",
  "...1bbbbbb1...",
  "...17777771...",
  ".11aaaaaaaa11.",
  ".1cccccccccc1.",
  "....1rrrr1....",
  "....rrrrrr....",
  "....rrrrrr....",
  "....1qqqq1....",
  "..1433333341..",
  ".1o433333341o1",
  ".1o433333341o1",
  ".1o437777341o1",
  ".1o433773341o1",
  "..1433333341..",
  "...12211221...",
  "...12211221...",
  "...1rr11rr1...",
  "...11111111...",
];

const HERO_SIDE = [
  "....111111....",
  "...1aaaaaa1...",
  "...1bbbbbb1...",
  "...17777771...",
  "..1aaaaaaaa1..",
  "..1cccccccc1..",
  "....1ooor1....",
  "....oo1orr....",
  "....oooorr....",
  "....1qqqr1....",
  "...1433341....",
  "..o1433341....",
  "..o1477741....",
  "...1433341....",
  "...14pp7341...",
  "...1433341....",
  "....122221....",
  "....122221....",
  "....1rrr11....",
  "....111111....",
];

/** Horizontal foot offset per walk frame. Frames 0 and 2 are the pass poses. */
const LEG_SWING = [0, 1, 0, -1];
/** Upper body lifts a pixel on the contact frames, which reads as a stride. */
const BODY_BOB = [0, -1, 0, -1];

function heroFrame(base: Painter, frameIndex: number): Painter {
  const p = surface(HERO_W, HERO_H);
  const bob = BODY_BOB[frameIndex];
  const swing = LEG_SWING[frameIndex];
  // Upper body.
  p.ctx.drawImage(base.canvas, 0, 0, HERO_W, HERO_LEG_ROW, 0, bob, HERO_W, HERO_LEG_ROW);
  // Legs, swung sideways and always planted on the baseline.
  p.ctx.drawImage(
    base.canvas,
    0,
    HERO_LEG_ROW,
    HERO_W,
    HERO_H - HERO_LEG_ROW,
    swing,
    HERO_LEG_ROW,
    HERO_W,
    HERO_H - HERO_LEG_ROW,
  );
  return p;
}

export type Facing = "down" | "up" | "left" | "right";

export type HeroSheet = Record<Facing, Painter[]>;

function buildHero(): HeroSheet {
  const down = fromGrid(HERO_DOWN);
  const up = fromGrid(HERO_UP);
  const left = fromGrid(HERO_SIDE);
  const right = mirrored(left);
  const frames = (base: Painter) => [0, 1, 2, 3].map((i) => heroFrame(base, i));
  return { down: frames(down), up: frames(up), left: frames(left), right: frames(right) };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Soft contact shadow, dithered rather than alpha-blended. */
function shadowBlob(rx: number, ry: number): Painter {
  const p = surface(rx * 2 + 3, ry * 2 + 3);
  ellipse(p, rx + 1, ry + 1, rx, ry, "d");
  ellipse(p, rx + 1, ry + 1, Math.max(1, rx - 2), Math.max(1, ry - 1), "e");
  return p;
}

/** Plank shading used by every timber structure. */
function planks(p: Painter, x: number, y: number, w: number, h: number, seed: number) {
  block(p, x, y, w, h, "p", "q", "o");
  for (let i = 1; i < h; i += 3) {
    rect(p, x, y + i, w, 1, "q");
  }
  for (let i = 0; i < w; i += 1) {
    if (hash2(x + i, y, seed) > 0.86) rect(p, x + i, y + 1, 1, h - 2, "o");
  }
}

/** A glass panel: dark ground, a bright diagonal, a hard frame. */
function glass(p: Painter, x: number, y: number, w: number, h: number, tint: string) {
  block(p, x, y, w, h, "2", "1", "3");
  dither(p, x + 1, y + 1, w - 2, h - 2, tint, 3);
  line(p, x + 1, y + h - 2, x + Math.min(w - 2, h), y + 1, tint);
  line(p, x + 3, y + h - 2, x + Math.min(w - 2, h + 2), y + 1, "y");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function saltCrystal(variant: number): Painter {
  // Halite grows as chunky cubic hoppers. Each shard is drawn as three faces —
  // a lit top, a mid left wall and a shaded right wall — so it reads as a solid
  // block of mineral rather than a silhouette.
  const layouts: Array<Array<[number, number, number, number]>> = [
    [[7, 5, 5, 6]],
    [[6, 4, 4, 5], [12, 7, 3, 4]],
    [[8, 3, 6, 8]],
    [[6, 6, 4, 4], [13, 3, 5, 7], [19, 7, 3, 4]],
    [[8, 3, 5, 7], [14, 8, 4, 4]],
    [[6, 8, 4, 4], [13, 4, 6, 7], [21, 8, 4, 5]],
    [[6, 5, 4, 6], [12, 8, 3, 3]],
    [[9, 2, 6, 9], [17, 7, 4, 5]],
  ];
  const shards = layouts[variant % layouts.length];
  const w = Math.max(...shards.map(([cx, , half]) => cx + half)) + 3;
  const h = Math.max(...shards.map(([, top]) => top)) + 14;
  const p = surface(w, h);
  const base = h - 2;
  for (const [cx, top, half, cap] of shards) {
    const left = cx - half;
    const right = cx + half;
    // Top facet: a flat hopper face, brightest plane.
    for (let i = 0; i < cap; i += 1) {
      const inset = Math.round((i / Math.max(1, cap - 1)) * (half - 1));
      rect(p, left + inset, top + i, (half - inset) * 2, 1, i === 0 ? "y" : "a");
    }
    // Walls.
    const wallTop = top + cap;
    rect(p, left, wallTop, half, base - wallTop, "b");
    rect(p, cx, wallTop, half, base - wallTop, "c");
    // Vertical edge and outline.
    rect(p, cx - 1, wallTop, 1, base - wallTop, "a");
    rect(p, left - 1, wallTop, 1, base - wallTop, "e");
    rect(p, right, wallTop, 1, base - wallTop, "e");
    rect(p, left, base, half * 2, 1, "e");
  }
  return p;
}

function boulder(large: boolean): Painter {
  const w = large ? 40 : 26;
  const h = large ? 28 : 19;
  const p = surface(w, h);
  const base = h - 2;
  // Top-lit rock: a bright cap, a mid body, a dark under-edge, a hard outline.
  const lumps: Array<[number, number, number, number]> = large
    ? [[15, base - 10, 14, 10], [28, base - 6, 9, 6]]
    : [[11, base - 7, 9, 7], [18, base - 4, 6, 4]];
  for (const [cx, cy, rx, ry] of lumps) ellipse(p, cx, cy, rx + 1, ry + 1, "A");
  for (const [cx, cy, rx, ry] of lumps) {
    ellipse(p, cx, cy, rx, ry, "G");
    ellipse(p, cx, cy - 1, rx - 1, ry - 2, "C");
    ellipse(p, cx - 1, cy - Math.round(ry * 0.45), rx - 3, Math.max(1, ry - 4), "d");
    ellipse(p, cx - 2, cy - Math.round(ry * 0.7), Math.max(2, rx - 7), Math.max(1, ry - 6), "c");
  }
  // Fractures, then salt drifted against the base.
  for (let i = 0; i < (large ? 4 : 2); i += 1) {
    const x = 6 + Math.floor(hash2(i, large ? 1 : 2, 733) * (w - 14));
    const y = base - 9 + Math.floor(hash2(i, 3, 739) * 6);
    line(p, x, y, x + 4, y + 4, "G");
  }
  for (const [cx, cy, rx, ry] of lumps) {
    ditherEllipse(p, cx, cy + Math.round(ry * 0.62), rx - 2, Math.max(1, Math.round(ry * 0.35)), "a", 2);
  }
  rect(p, 3, base + 1, w - 6, 1, "e");
  return p;
}

/**
 * One board of boardwalk. Segments are laid every 8px along the route and are
 * 12px long, so the dark leading edge of each shows through as a board gap and
 * the grain always runs across the direction of travel.
 */
export function deckSegment(halfWidth: number): Painter {
  const w = 12;
  const h = halfWidth * 2;
  const p = surface(w, h);
  rect(p, 0, 0, w, h, "p");
  rect(p, 0, 0, 2, h, "r");
  rect(p, 2, 0, 2, h, "q");
  rect(p, 5, 0, 3, h, "o");
  for (let y = 3; y < h - 3; y += 7) {
    if (hash2(y, halfWidth, 811) > 0.6) rect(p, 4, y, w - 5, 1, "q");
  }
  rect(p, 0, 0, w, 2, "r");
  rect(p, 0, h - 2, w, 2, "r");
  rect(p, 0, 2, w, 1, "q");
  rect(p, 0, h - 3, w, 1, "q");
  return p;
}

function saltPile(): Painter {
  const p = surface(28, 16);
  for (let y = 0; y < 13; y += 1) {
    const spread = Math.round((y / 12) * 13);
    rect(p, 14 - spread, 15 - y, spread * 2, 1, y > 8 ? "c" : "a");
  }
  dither(p, 4, 9, 20, 5, "d", 2);
  rect(p, 2, 15, 24, 1, "e");
  // A shovel left standing in the pile.
  line(p, 20, 2, 22, 12, "q");
  block(p, 21, 11, 4, 4, "C", "d", "a");
  return p;
}

function post(height: number, capKey?: string): Painter {
  const p = surface(7, height);
  block(p, 2, 1, 3, height - 2, "p", "q", "o");
  rect(p, 2, height - 2, 3, 1, "r");
  if (capKey) block(p, 1, 0, 5, 3, capKey, "1");
  return p;
}

function crate(): Painter {
  const p = surface(16, 15);
  planks(p, 1, 2, 14, 12, 7);
  frame(p, 1, 2, 14, 12, "1");
  line(p, 2, 3, 14, 12, "o");
  line(p, 14, 3, 2, 12, "o");
  rect(p, 1, 14, 14, 1, "r");
  return p;
}

function barrel(tint: string): Painter {
  const p = surface(14, 18);
  block(p, 2, 3, 10, 14, "p", "q", "o");
  rect(p, 2, 6, 10, 1, "r");
  rect(p, 2, 13, 10, 1, "r");
  ellipse(p, 7, 3, 5, 2, tint);
  ellipse(p, 7, 3, 3, 1, "y");
  frame(p, 2, 3, 10, 14, "1");
  return p;
}

function reeds(seed: number): Painter {
  const p = surface(14, 18);
  for (let i = 0; i < 7; i += 1) {
    const x = 2 + i * 2;
    const top = 3 + Math.round(hash2(i, seed, 3) * 7);
    const lean = hash2(i, seed, 9) > 0.5 ? 1 : -1;
    line(p, x, 17, x + lean, top, i % 3 === 0 ? "6" : "7");
    px(p, x + lean, top - 1, "8");
  }
  return p;
}

function algaeTuft(seed: number): Painter {
  const p = surface(12, 7);
  for (let i = 0; i < 9; i += 1) {
    const x = 1 + Math.round(hash2(i, seed, 5) * 9);
    const y = 2 + Math.round(hash2(i, seed, 11) * 4);
    px(p, x, y, hash2(i, seed, 13) > 0.5 ? "7" : "6");
    px(p, x, y + 1, "4");
  }
  return p;
}

function pipe(length: number): Painter {
  const p = surface(length, 9);
  block(p, 0, 2, length, 5, "C", "G", "F");
  for (let x = 3; x < length; x += 9) block(p, x, 1, 3, 7, "d", "e", "a");
  return p;
}

function lamp(): Painter {
  const p = surface(15, 32);
  const cx = 7;
  block(p, cx - 1, 10, 3, 20, "3", "2", "4");
  block(p, cx - 3, 29, 7, 3, "2", "1", "3");
  // Lantern head: hard box, glazed face, cap.
  block(p, cx - 4, 3, 9, 9, "2", "1", "3");
  block(p, cx - 5, 0, 11, 3, "3", "2", "4");
  // Halo, dithered so the glow needs no alpha.
  dither(p, cx - 7, 0, 15, 16, "D", 3, 1);
  rect(p, cx - 2, 5, 5, 6, "D");
  rect(p, cx - 2, 5, 5, 2, "y");
  return p;
}

function signpost(label: string, accent: string): Painter {
  const w = Math.max(28, textWidth(label) + 10);
  const p = surface(w, 26);
  block(p, Math.floor(w / 2) - 2, 12, 4, 13, "q", "r", "p");
  planks(p, 0, 1, w, 13, 21);
  frame(p, 0, 1, w, 13, "1");
  rect(p, 0, 2, w, 1, accent);
  drawText(p, label, Math.floor((w - textWidth(label)) / 2), 5, "F", { shadow: "r" });
  return p;
}

function rowboat(): Painter {
  const p = surface(30, 15);
  for (let y = 0; y < 7; y += 1) {
    const inset = Math.round((y / 6) * 4);
    rect(p, 2 + inset, 5 + y, 26 - inset * 2, 1, y < 2 ? "o" : "p");
  }
  frame(p, 2, 5, 26, 7, "1");
  rect(p, 5, 7, 20, 1, "q");
  line(p, 20, 6, 28, 0, "p");
  return p;
}

// ---------------------------------------------------------------------------
// Stations — the six chapter landmarks and the archive at the end
// ---------------------------------------------------------------------------

function stationBrineEdge(): Painter {
  // A sampling tower over the bloom pond. The previous low jetty sat at the
  // same height as the boardwalk and disappeared into it; a vertical mass with
  // a lit brine column is legible from a screen away.
  const p = surface(66, 74);
  const deckY = 58;

  // Piles and deck out over the water.
  for (const x of [8, 22, 38, 54]) block(p, x, deckY + 4, 4, 12, "q", "r", "p");
  planks(p, 4, deckY, 58, 8, 3);
  frame(p, 4, deckY, 58, 8, "1");

  // Tower frame.
  for (const x of [12, 48]) {
    block(p, x, 18, 4, deckY - 18, "q", "r", "p");
  }
  for (const y of [26, 40, 52]) rect(p, 12, y, 40, 2, "q");
  line(p, 16, deckY - 2, 48, 20, "p");
  line(p, 48, deckY - 2, 16, 20, "p");

  // Graduated brine column: the bloom, sampled and read off by eye.
  block(p, 26, 14, 12, 40, "2", "1", "3");
  for (let y = 0; y < 32; y += 1) {
    const t = y / 31;
    rect(p, 28, 20 + y, 8, 1, t < 0.2 ? "f" : t < 0.6 ? "g" : "h");
  }
  rect(p, 28, 20, 8, 2, "f");
  for (let y = 22; y < 52; y += 5) rect(p, 28, y, 3, 1, "F");
  frame(p, 26, 14, 12, 40, "1");

  // Roof and beacon.
  for (let y = 0; y < 7; y += 1) rect(p, 8 + y * 2, 14 - y, 48 - y * 4, 1, y < 2 ? "5" : "3");
  block(p, 29, 4, 6, 5, "2", "1", "3");
  rect(p, 30, 5, 4, 3, "8");
  dither(p, 25, 0, 14, 12, "8", 3);

  // Working clutter on the deck.
  stamp(p, crate(), 6, deckY - 15);
  block(p, 46, deckY - 10, 10, 10, "C", "G", "F");
  rect(p, 48, deckY - 8, 6, 6, "g");
  return p;
}

function stationTheCell(): Painter {
  // A walk-in exhibit: the cell model under a glazed dome on a timber plinth.
  // Framing it as a display case keeps the biology legible instead of reading
  // as one large green blob on the horizon.
  const p = surface(74, 66);
  const cx = 37;
  const groundY = 56;
  const domeR = 24;
  const domeY = groundY - 8;

  // Plinth.
  planks(p, 6, groundY, 62, 8, 5);
  frame(p, 6, groundY, 62, 8, "1");
  for (const x of [11, 35, 59]) block(p, x, groundY + 8, 3, 2, "r", "1");
  block(p, 10, groundY - 5, 54, 6, "q", "r", "p");

  // Glazed dome: outline, dark glass, a hard specular sweep.
  ellipse(p, cx, domeY, domeR + 1, domeR + 1, "3");
  ellipse(p, cx, domeY, domeR, domeR, "E");
  ditherEllipse(p, cx, domeY, domeR - 1, domeR - 1, "H", 2);
  for (let i = 0; i < 12; i += 1) line(p, cx - 17 + i, domeY - 15 + i, cx - 9 + i, domeY - 21 + i, "k");

  // The cell itself, small enough to read as a specimen.
  const cy = domeY + 3;
  ellipse(p, cx, cy, 15, 17, "4");
  ellipse(p, cx, cy, 14, 16, "9");
  ditherEllipse(p, cx, cy, 13, 15, "8", 2);
  // Cup-shaped chloroplast, open at the top as in the real cell.
  for (let y = 0; y < 15; y += 1) {
    const t = y / 14;
    const spread = Math.round(Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))) * 11);
    if (spread <= 0) continue;
    rect(p, cx - spread, cy - 1 + y, spread * 2, 1, "6");
    px(p, cx - spread, cy - 1 + y, "4");
    px(p, cx + spread - 1, cy - 1 + y, "4");
  }
  ellipse(p, cx, cy + 8, 3, 2, "9");
  ellipse(p, cx + 8, cy - 6, 2, 2, "t");
  ellipse(p, cx - 8, cy + 1, 3, 2, "s");
  ellipse(p, cx + 9, cy + 4, 2, 2, "s");
  // Two equal anterior flagella, breaking the dome line.
  line(p, cx - 4, cy - 16, cx - 11, cy - 27, "7");
  line(p, cx - 11, cy - 27, cx - 6, cy - 34, "7");
  line(p, cx + 4, cy - 16, cx + 11, cy - 27, "7");
  line(p, cx + 11, cy - 27, cx + 6, cy - 34, "7");
  return p;
}

function stationLightArray(): Painter {
  const p = surface(66, 50);
  // A rack of spectral lamps: the transcriptomics light-quality axis.
  block(p, 4, 40, 58, 6, "C", "G", "F");
  for (const x of [8, 56]) block(p, x, 10, 4, 32, "H", "2", "B");
  rect(p, 8, 10, 52, 3, "H");
  const tints = ["w", "x", "u", "8", "t", "s"];
  tints.forEach((tint, index) => {
    const x = 12 + index * 8;
    block(p, x, 14, 6, 12, "2", "1", "3");
    rect(p, x + 1, 15, 4, 10, tint);
    // Cast beam, dithered downward.
    dither(p, x, 26, 6, 14, tint, 2, index);
  });
  // Control desk.
  block(p, 20, 30, 22, 11, "3", "2", "4");
  glass(p, 23, 32, 16, 6, "x");
  frame(p, 4, 40, 58, 6, "1");
  return p;
}

function stationModel(): Painter {
  const p = surface(60, 54);
  // Observation hut with a chart board and a data mast.
  block(p, 6, 22, 44, 26, "p", "q", "o");
  for (let y = 24; y < 47; y += 3) rect(p, 7, y, 42, 1, "q");
  // Roof.
  for (let y = 0; y < 10; y += 1) {
    rect(p, 2 + y * 2, 22 - y, 52 - y * 4, 1, y < 2 ? "5" : "3");
  }
  frame(p, 6, 22, 44, 26, "1");
  // Chart board: an ODE trace over a branch-allocation bar row.
  block(p, 12, 27, 32, 15, "2", "1", "3");
  const trace = [10, 8, 7, 5, 4, 4, 5, 6, 6, 7, 7, 8];
  trace.forEach((value, index) => {
    px(p, 14 + index * 2, 27 + value, "8");
    px(p, 15 + index * 2, 27 + value, "8");
  });
  ["s", "t", "u", "v"].forEach((tint, index) => {
    rect(p, 15 + index * 7, 38, 4, 3, tint);
  });
  // Data mast.
  line(p, 46, 12, 46, 2, "C");
  rect(p, 43, 0, 7, 2, "x");
  dither(p, 40, 0, 13, 8, "x", 3);
  return p;
}

function stationProductYards(): Painter {
  const p = surface(78, 52);
  // Four tanks, one per product strain, fed from a shared beta-carotene line.
  const tints = ["s", "t", "u", "v"];
  const labels = ["BI", "AX", "CR", "BC"];
  tints.forEach((tint, index) => {
    const x = 5 + index * 18;
    block(p, x, 16, 14, 26, "C", "G", "F");
    rect(p, x + 2, 20, 10, 20, tint);
    dither(p, x + 2, 20, 10, 8, "y", 3, index);
    // Domed top.
    ellipse(p, x + 7, 16, 7, 4, "F");
    ellipse(p, x + 7, 15, 5, 2, "a");
    frame(p, x, 16, 14, 26, "1");
    rect(p, x - 1, 42, 16, 3, "e");
    drawText(p, labels[index], x + 2, 44, "2");
  });
  // Shared hub line across the top.
  stamp(p, pipe(72), 3, 4);
  for (let index = 0; index < 4; index += 1) {
    const x = 12 + index * 18;
    line(p, x, 10, x, 15, "C");
  }
  ellipse(p, 39, 8, 6, 4, "s");
  ellipse(p, 39, 7, 4, 2, "u");
  return p;
}

function stationCommons(): Painter {
  const p = surface(62, 50);
  // An open pavilion: the round table where the design gets challenged.
  for (const x of [4, 54]) block(p, x, 20, 4, 24, "q", "r", "p");
  for (let y = 0; y < 12; y += 1) {
    rect(p, 2 + y * 2, 20 - y, 58 - y * 4, 1, y < 2 ? "8" : y < 6 ? "7" : "6");
  }
  rect(p, 0, 20, 62, 2, "q");
  // Table and four stools in the support-accent colours.
  ellipse(p, 31, 38, 16, 7, "p");
  ellipse(p, 31, 37, 14, 5, "o");
  frame(p, 15, 31, 32, 13, "r");
  const seats: Array<[number, number, string]> = [
    [12, 34, "t"],
    [50, 34, "x"],
    [22, 45, "u"],
    [42, 45, "w"],
  ];
  for (const [x, y, tint] of seats) {
    ellipse(p, x, y, 4, 3, tint);
    ellipse(p, x, y - 1, 3, 2, "y");
    line(p, x, y + 2, x, y + 5, "r");
  }
  return p;
}

function stationArchive(): Painter {
  // The end of the route: the wiki archive as a salt-brick gatehouse.
  const p = surface(96, 74);
  block(p, 10, 26, 76, 44, "b", "d", "a");
  for (let y = 29; y < 68; y += 4) {
    for (let x = 11; x < 85; x += 8) {
      rect(p, x + ((y / 4) % 2 === 0 ? 0 : 4), y, 7, 3, "c");
    }
  }
  frame(p, 10, 26, 76, 44, "1");
  // Stepped parapet, seated on the wall head rather than floating above it.
  rect(p, 10, 23, 76, 4, "b");
  frame(p, 10, 23, 76, 4, "1");
  for (let i = 0; i < 5; i += 1) {
    block(p, 13 + i * 15, 18, 11, 6, "b", "d", "a");
  }
  // Doorway with a warm, banded interior rather than a scatter of sparkles.
  block(p, 40, 44, 18, 26, "2", "1", "3");
  for (let y = 0; y < 22; y += 1) {
    const t = y / 21;
    rect(p, 42, 47 + y, 14, 1, t < 0.35 ? "D" : t < 0.7 ? "i" : "j");
  }
  dither(p, 42, 47, 14, 22, "y", 3);
  rect(p, 40, 42, 18, 3, "3");
  // Beacon towers flanking the gate.
  for (const x of [4, 84]) {
    block(p, x, 12, 8, 58, "3", "2", "4");
    block(p, x - 1, 6, 10, 7, "2", "1", "3");
    rect(p, x + 1, 8, 6, 4, "8");
    dither(p, x - 4, 2, 16, 14, "8", 3);
  }
  // Sign band, sized to its text.
  const label = "ARCHIVE";
  const bandW = textWidth(label) + 16;
  const bandX = Math.round((96 - bandW) / 2);
  block(p, bandX, 30, bandW, 11, "2", "1", "3");
  rect(p, bandX, 30, bandW, 1, "8");
  drawText(p, label, bandX + 8, 33, "8", { shadow: "1" });
  return p;
}

// ---------------------------------------------------------------------------
// Atlas
// ---------------------------------------------------------------------------

export type Atlas = {
  hero: HeroSheet;
  shadowSmall: Painter;
  shadowMedium: Painter;
  shadowLarge: Painter;
  props: Record<string, Painter>;
  stations: Record<string, Painter>;
};

let atlas: Atlas | null = null;

export function getAtlas(): Atlas {
  if (atlas) return atlas;
  atlas = {
    hero: buildHero(),
    shadowSmall: shadowBlob(6, 2),
    shadowMedium: shadowBlob(11, 4),
    shadowLarge: shadowBlob(20, 6),
    props: {
      crystal0: saltCrystal(0),
      crystal1: saltCrystal(1),
      crystal2: saltCrystal(2),
      crystal3: saltCrystal(3),
      crystal4: saltCrystal(4),
      crystal5: saltCrystal(5),
      crystal6: saltCrystal(6),
      crystal7: saltCrystal(7),
      pile: saltPile(),
      postShort: post(14),
      postTall: post(24, "7"),
      postLime: post(18, "8"),
      crate: crate(),
      barrelAmber: barrel("s"),
      barrelCoral: barrel("t"),
      reedsA: reeds(1),
      reedsB: reeds(2),
      tuftA: algaeTuft(1),
      tuftB: algaeTuft(2),
      tuftC: algaeTuft(3),
      pipeShort: pipe(28),
      pipeLong: pipe(52),
      lamp: lamp(),
      boulderS: boulder(false),
      boulderL: boulder(true),
      boat: rowboat(),
      signStart: signpost("SALT ROUTE", "8"),
      signFree: signpost("FREE ROAM", "x"),
      signArchive: signpost("ARCHIVE", "s"),
    },
    stations: {
      "brine-edge": stationBrineEdge(),
      "the-cell": stationTheCell(),
      "light-array": stationLightArray(),
      "model-station": stationModel(),
      "product-yards": stationProductYards(),
      commons: stationCommons(),
      archive: stationArchive(),
    },
  };
  return atlas;
}

/** Signage generated on demand for the numbered station plates. */
export function stationPlate(index: string, label: string, accent: string): Painter {
  const text = `${index} ${label}`;
  const w = textWidth(text) + 12;
  const p = surface(w, 16);
  block(p, 0, 0, w, 13, "2", "1", "3");
  rect(p, 0, 0, w, 1, accent);
  rect(p, 2, 3, 2, 7, accent);
  drawText(p, text, 7, 3, "F", { shadow: "1" });
  return p;
}
