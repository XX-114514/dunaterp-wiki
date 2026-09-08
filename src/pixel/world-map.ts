// The salt lake.
//
// Terrain, the guided boardwalk route, the six chapter stations and every
// scattered prop are generated here from a fixed seed, so the world is
// identical for every visitor while still avoiding hand-placing 400 objects.

import { hash2 } from "./paint";
import { ARCHIVE_COPY, STATION_COPY, type StationCopy } from "./station-copy";
import { TILE, Tile, isWet, plateIdAt } from "./tiles";

export const MAP_W = 192;
export const MAP_H = 108;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/** Boardwalk waypoints in tile space, west shore to the archive. */
const WAYPOINTS: Array<[number, number]> = [
  [8, 84],
  [18, 76],
  [30, 79],
  [42, 66],
  [54, 58],
  [66, 63],
  [78, 71],
  [90, 64],
  [100, 50],
  [112, 45],
  [124, 55],
  [136, 58],
  [148, 48],
  [160, 40],
  [172, 45],
  [184, 36],
];

export type PathSample = { x: number; y: number; dx: number; dy: number };

export class RoutePath {
  readonly points: Array<{ x: number; y: number }>;
  private readonly cumulative: number[];
  readonly length: number;

  constructor(waypoints: Array<[number, number]>, resolution = 10) {
    // Catmull-Rom through the waypoints, flattened to a dense polyline. The
    // polyline is what everything else queries, so arc-length parameterisation
    // is exact rather than approximated per frame.
    const control = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 1; i < control.length - 2; i += 1) {
      const [x0, y0] = control[i - 1];
      const [x1, y1] = control[i];
      const [x2, y2] = control[i + 1];
      const [x3, y3] = control[i + 2];
      for (let step = 0; step < resolution; step += 1) {
        const t = step / resolution;
        const t2 = t * t;
        const t3 = t2 * t;
        points.push({
          x: (0.5 * ((2 * x1) + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3)) * TILE + TILE / 2,
          y: (0.5 * ((2 * y1) + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3)) * TILE + TILE / 2,
        });
      }
    }
    const last = waypoints[waypoints.length - 1];
    points.push({ x: last[0] * TILE + TILE / 2, y: last[1] * TILE + TILE / 2 });

    this.points = points;
    this.cumulative = [0];
    for (let i = 1; i < points.length; i += 1) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(dx, dy));
    }
    this.length = this.cumulative[this.cumulative.length - 1];
  }

  /** Position and unit direction at normalised distance `u` in [0, 1]. */
  sample(u: number): PathSample {
    const target = Math.max(0, Math.min(1, u)) * this.length;
    let lo = 0;
    let hi = this.cumulative.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cumulative[mid] <= target) lo = mid;
      else hi = mid;
    }
    const a = this.points[lo];
    const b = this.points[Math.min(lo + 1, this.points.length - 1)];
    const span = Math.max(1e-6, this.cumulative[hi] - this.cumulative[lo]);
    const t = (target - this.cumulative[lo]) / span;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    return { x: a.x + dx * t, y: a.y + dy * t, dx: dx / len, dy: dy / len };
  }

  /** Closest point on the route — used to hand control back after free roam. */
  nearestU(x: number, y: number): number {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < this.points.length; i += 1) {
      const point = this.points[i];
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return this.cumulative[best] / this.length;
  }
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

export type Station = StationCopy & {
  /** Filled in by buildWorld. */
  x: number;
  y: number;
  footprint: { x: number; y: number; w: number; h: number };
};

/** Sprite footprint sizes, mirrored from sprites.ts so the map can reserve space. */
const STATION_SIZE: Record<string, [number, number]> = {
  "brine-edge": [66, 74],
  "the-cell": [74, 66],
  "light-array": [66, 50],
  "model-station": [60, 54],
  "product-yards": [78, 52],
  commons: [62, 50],
  archive: [96, 74],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type Prop = {
  sprite: string;
  x: number;
  y: number;
  shadow: "none" | "small" | "medium" | "large";
};

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export type DeckSegment = { x: number; y: number; angle: number; halfWidth: number };

export type World = {
  tiles: Uint8Array;
  blocked: Uint8Array;
  /** Boardwalk quads, laid along the route and rotated to its tangent. */
  deck: DeckSegment[];
  deckMask: Uint8Array;
  path: RoutePath;
  stations: Station[];
  archive: Station;
  props: Prop[];
  /** Water tiles that carry an animated glint, in pixel coordinates. */
  glints: Array<{ x: number; y: number; phase: number }>;
};

function index(tx: number, ty: number): number {
  return ty * MAP_W + tx;
}

function inBounds(tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;
}

function stampEllipse(
  tiles: Uint8Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shallow: Tile,
  deep: Tile,
  seed: number,
) {
  for (let ty = Math.floor(cy - ry - 2); ty <= Math.ceil(cy + ry + 2); ty += 1) {
    for (let tx = Math.floor(cx - rx - 2); tx <= Math.ceil(cx + rx + 2); tx += 1) {
      if (!inBounds(tx, ty)) continue;
      // Smooth angular wobble, so a shoreline curves instead of stepping.
      const nx = (tx - cx) / rx;
      const ny = (ty - cy) / ry;
      const angle = Math.atan2(ny, nx);
      const wobble = 1
        + Math.sin(angle * 3 + seed) * 0.13
        + Math.sin(angle * 5 - seed * 1.7) * 0.08
        + Math.sin(angle * 9 + seed * 0.6) * 0.04;
      const d = Math.hypot(nx, ny) / wobble;
      if (d > 1) continue;
      tiles[index(tx, ty)] = d < 0.58 ? deep : shallow;
    }
  }
}

function stampBands(tiles: Uint8Array) {
  // Multi-source distance transform out from every wet tile, then two colour
  // bands: the carotenoid-stained evaporite ring a drying pond leaves behind,
  // and the damp crust beyond it.
  const distance = new Int16Array(MAP_W * MAP_H).fill(999);
  const queue: number[] = [];
  for (let i = 0; i < tiles.length; i += 1) {
    if (isWet(tiles[i] as Tile)) {
      distance[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head];
    if (distance[i] >= 5) continue;
    const tx = i % MAP_W;
    const ty = (i / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(nx, ny)) continue;
      const j = index(nx, ny);
      if (distance[j] <= distance[i] + 1) continue;
      distance[j] = distance[i] + 1;
      queue.push(j);
    }
  }
  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i] as Tile;
    if (isWet(tile) || tile === Tile.Rock || tile === Tile.AlgaeMat) continue;
    const d = distance[i];
    // Jitter the band edges so the rings are not perfect offsets of the pond.
    const jitter = hash2(i % MAP_W, (i / MAP_W) | 0, 733) * 1.4;
    if (d <= 2 + jitter) tiles[i] = Tile.Mineral;
    else if (d <= 4 + jitter) tiles[i] = Tile.SaltDamp;
  }
}

export function buildWorld(): World {
  const tiles = new Uint8Array(MAP_W * MAP_H).fill(Tile.Salt);

  // Broad terrain bands: open lake along the north edge, crust in the middle,
  // mud and reed flats along the south.
  for (let ty = 0; ty < MAP_H; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) {
      const shore = 12 + Math.sin(tx * 0.055) * 5 + Math.sin(tx * 0.017 + 2) * 4;
      if (ty < shore - 5) tiles[index(tx, ty)] = Tile.WaterDeep;
      else if (ty < shore) tiles[index(tx, ty)] = Tile.Water;
      else if (ty < shore + 3) tiles[index(tx, ty)] = Tile.Sand;
      else if (ty > MAP_H - 8) tiles[index(tx, ty)] = Tile.Mud;
      else if (hash2(Math.abs(plateIdAt(tx, ty)) % 4093, 0, 5) > 0.86) tiles[index(tx, ty)] = Tile.SaltDamp;
    }
  }

  // Evaporation ponds. The pink and amber ones are Dunaliella blooms: the real
  // reason these lakes turn colour, and the visual anchor of the whole scene.
  const ponds: Array<[number, number, number, number, Tile, Tile]> = [
    [46, 84, 11, 6, Tile.Amber, Tile.AmberDeep],
    [62, 44, 10, 6, Tile.Water, Tile.WaterDeep],
    [84, 78, 14, 7, Tile.Brine, Tile.BrineDeep],
    [104, 66, 9, 5, Tile.Amber, Tile.AmberDeep],
    [122, 78, 12, 6, Tile.Brine, Tile.BrineDeep],
    [134, 34, 11, 6, Tile.Water, Tile.WaterDeep],
    [152, 66, 13, 7, Tile.Amber, Tile.AmberDeep],
    [168, 82, 10, 5, Tile.Brine, Tile.BrineDeep],
    [178, 58, 9, 5, Tile.Water, Tile.WaterDeep],
  ];
  ponds.forEach(([cx, cy, rx, ry, shallow, deep], i) => {
    stampEllipse(tiles, cx, cy, rx, ry, shallow, deep, 100 + i * 7);
  });

  // Algae mats: small, and only where the crust is already wet. Large mats
  // merge into one field and read as a texture swatch rather than as biology.
  for (let i = 0; i < 16; i += 1) {
    const tx = 12 + Math.floor(hash2(i, 3, 211) * (MAP_W - 24));
    const ty = 24 + Math.floor(hash2(i, 7, 223) * (MAP_H - 40));
    if (!inBounds(tx, ty) || isWet(tiles[index(tx, ty)] as Tile)) continue;
    let touchesWater = false;
    for (let dy = -4; dy <= 4 && !touchesWater; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        if (inBounds(tx + dx, ty + dy) && isWet(tiles[index(tx + dx, ty + dy)] as Tile)) {
          touchesWater = true;
          break;
        }
      }
    }
    if (!touchesWater) continue;
    stampEllipse(tiles, tx, ty, 2 + hash2(i, 1, 227) * 2, 1.5 + hash2(i, 2, 229) * 1.5, Tile.AlgaeMat, Tile.AlgaeMat, 300 + i);
  }

  stampBands(tiles);

  const path = new RoutePath(WAYPOINTS);

  // The route is not painted into the tile grid: stamping a curve onto 16px
  // cells produces visible staircases. It is a ribbon of plank quads laid
  // along the spline and rotated to the tangent, plus a tile-resolution mask
  // that gameplay reads for walkability and footing.
  const deck: DeckSegment[] = [];
  const deckMask = new Uint8Array(MAP_W * MAP_H);
  const layDeck = (x: number, y: number, angle: number, halfWidth: number) => {
    deck.push({ x, y, angle, halfWidth });
    const px = Math.cos(angle + Math.PI / 2);
    const py = Math.sin(angle + Math.PI / 2);
    for (let offset = -halfWidth; offset <= halfWidth; offset += 4) {
      const tx = Math.floor((x + px * offset) / TILE);
      const ty = Math.floor((y + py * offset) / TILE);
      if (inBounds(tx, ty)) deckMask[index(tx, ty)] = 1;
    }
  };
  const deckSteps = Math.ceil(path.length / 8);
  for (let step = 0; step <= deckSteps; step += 1) {
    const sample = path.sample(step / deckSteps);
    layDeck(sample.x, sample.y, Math.atan2(sample.dy, sample.dx), 15);
  }

  // Place the stations against the route, then reserve their footprint.
  const blocked = new Uint8Array(MAP_W * MAP_H);
  const place = (def: StationCopy): Station => {
    const sample = path.sample(def.u);
    const [w, h] = STATION_SIZE[def.sprite];
    // Perpendicular to travel, so a station always faces the walker.
    const x = sample.x + -sample.dy * def.offset;
    const y = sample.y + sample.dx * def.offset;
    const footprint = { x: x - w / 2, y: y - h, w, h };
    return { ...def, x, y, footprint };
  };
  const stations = STATION_COPY.map(place);
  const archive = place(ARCHIVE_COPY);

  // Station 01 reads the bloom directly, so put the bloom where it stands.
  {
    const brine = stations[0];
    const anchor = path.sample(brine.u);
    const away = Math.sign(brine.offset) || 1;
    stampEllipse(
      tiles,
      (brine.x + -anchor.dy * 26 * away) / TILE,
      (brine.y + anchor.dx * 26 * away) / TILE,
      8,
      5,
      Tile.Brine,
      Tile.BrineDeep,
      141,
    );
    stampBands(tiles);
  }

  for (const station of [...stations, archive]) {
    // Flatten the ground under a station and block its upper body, leaving a
    // walkable apron in front so the interaction radius stays reachable.
    // The apron is an irregular worn patch, not an axis-aligned rectangle: a
    // hard-edged box of damp crust behind a building is the single most
    // obvious tell that the ground was stamped by a loop.
    const acx = station.x / TILE;
    const acy = (station.footprint.y + station.footprint.h * 0.72) / TILE;
    const arx = station.footprint.w / TILE * 0.72;
    const ary = station.footprint.h / TILE * 0.58;
    const left = Math.floor(acx - arx - 3);
    const right = Math.ceil(acx + arx + 3);
    const top = Math.floor(acy - ary - 3);
    const bottom = Math.ceil(acy + ary + 3);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (!inBounds(tx, ty)) continue;
        const nx = (tx + 0.5 - acx) / arx;
        const ny = (ty + 0.5 - acy) / ary;
        const wear = Math.hypot(nx, ny) + hash2(tx, ty, 857) * 0.34 - 0.17;
        if (wear > 1.25) continue;
        // Block the structure itself, never the apron in front of it.
        const inBody = tx >= Math.floor(station.footprint.x / TILE)
          && tx <= Math.ceil((station.footprint.x + station.footprint.w) / TILE)
          && ty >= Math.floor(station.footprint.y / TILE)
          && ty <= Math.ceil((station.footprint.y + station.footprint.h - 12) / TILE);
        if (isWet(tiles[index(tx, ty)] as Tile)) {
          // A station standing over water keeps its water; only the ground it
          // is founded on is made good.
          if (inBody) tiles[index(tx, ty)] = Tile.Mineral;
        } else if (wear < 1) {
          tiles[index(tx, ty)] = Tile.SaltDamp;
        }
        if (inBody) blocked[index(tx, ty)] = 1;
      }
    }
    // A spur of decking from the route out to the station apron.
    const sample = path.sample(station.u);
    const spurAngle = Math.atan2(station.y - sample.y, station.x - sample.x);
    const spurLength = Math.hypot(station.x - sample.x, station.y - sample.y);
    const spurSteps = Math.max(1, Math.ceil(spurLength / 8));
    for (let step = 0; step <= spurSteps; step += 1) {
      const t = step / spurSteps;
      layDeck(
        sample.x + (station.x - sample.x) * t,
        sample.y + (station.y - sample.y) * t,
        spurAngle,
        11,
      );
    }
  }

  // Solid terrain and the world border.
  for (let ty = 0; ty < MAP_H; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) {
      const tile = tiles[index(tx, ty)] as Tile;
      if (tile === Tile.WaterDeep || tile === Tile.BrineDeep || tile === Tile.AmberDeep) {
        blocked[index(tx, ty)] = 1;
      }
      if (tx < 2 || ty < 2 || tx > MAP_W - 3 || ty > MAP_H - 3) blocked[index(tx, ty)] = 1;
      if (deckMask[index(tx, ty)] && tx > 1 && ty > 1 && tx < MAP_W - 2 && ty < MAP_H - 2) {
        blocked[index(tx, ty)] = 0;
      }
    }
  }

  // ---- Props -------------------------------------------------------------
  const props: Prop[] = [];
  const occupied = (x: number, y: number, radius = 12) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!inBounds(tx, ty)) return true;
    const tile = tiles[index(tx, ty)] as Tile;
    if (isWet(tile) || deckMask[index(tx, ty)]) return true;
    for (const prop of props) {
      if (Math.abs(prop.x - x) < radius && Math.abs(prop.y - y) < radius) return true;
    }
    for (const station of [...stations, archive]) {
      if (
        x > station.footprint.x - 24
        && x < station.footprint.x + station.footprint.w + 24
        && y > station.footprint.y - 24
        && y < station.footprint.y + station.footprint.h + 24
      ) return true;
    }
    return false;
  };

  // Boulders: something with mass to walk around and to occlude the hero.
  for (let i = 0; i < 26; i += 1) {
    const x = 90 + hash2(i, 11, 307) * (WORLD_W - 180);
    const y = 70 + hash2(i, 13, 311) * (WORLD_H - 150);
    if (occupied(x, y, 48)) continue;
    props.push({ sprite: i % 3 === 0 ? "boulderL" : "boulderS", x, y, shadow: "medium" });
    const half = i % 3 === 0 ? 20 : 13;
    for (let ty = Math.floor((y - half) / TILE); ty <= Math.floor((y + 4) / TILE); ty += 1) {
      for (let tx = Math.floor((x - half) / TILE); tx <= Math.floor((x + half) / TILE); tx += 1) {
        if (inBounds(tx, ty) && !deckMask[index(tx, ty)]) blocked[index(tx, ty)] = 1;
      }
    }
  }

  // Salt crystals across the open flats, denser away from the route.
  for (let i = 0; i < 640; i += 1) {
    const x = 40 + hash2(i, 1, 501) * (WORLD_W - 80);
    const y = 40 + hash2(i, 2, 503) * (WORLD_H - 80);
    if (occupied(x, y, 14)) continue;
    const roll = hash2(i, 3, 507);
    props.push({
      sprite: `crystal${Math.floor(roll * 8)}`,
      x,
      y,
      shadow: roll > 0.7 ? "small" : "none",
    });
  }

  // Reeds and algae tufts hug the shoreline.
  for (let i = 0; i < 620; i += 1) {
    const x = 30 + hash2(i, 4, 509) * (WORLD_W - 60);
    const y = 30 + hash2(i, 5, 521) * (WORLD_H - 60);
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!inBounds(tx, ty) || occupied(x, y, 10)) continue;
    let nearWater = false;
    for (let dy = -2; dy <= 2 && !nearWater; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (inBounds(tx + dx, ty + dy) && isWet(tiles[index(tx + dx, ty + dy)] as Tile)) {
          nearWater = true;
          break;
        }
      }
    }
    if (!nearWater) continue;
    const roll = hash2(i, 6, 523);
    props.push({
      sprite: roll > 0.6 ? (roll > 0.8 ? "reedsA" : "reedsB") : roll > 0.4 ? "tuftA" : roll > 0.2 ? "tuftB" : "tuftC",
      x,
      y,
      shadow: roll > 0.6 ? "small" : "none",
    });
  }

  // Harvest piles out on the crust.
  for (let i = 0; i < 42; i += 1) {
    const x = 80 + hash2(i, 7, 541) * (WORLD_W - 160);
    const y = 60 + hash2(i, 8, 547) * (WORLD_H - 140);
    if (occupied(x, y, 30)) continue;
    props.push({ sprite: "pile", x, y, shadow: "medium" });
  }

  // Route furniture: marker posts along the whole walk, lamps at intervals.
  const markerSteps = 46;
  for (let step = 1; step < markerSteps; step += 1) {
    const u = step / markerSteps;
    const sample = path.sample(u);
    const side = step % 2 === 0 ? 1 : -1;
    const x = sample.x + -sample.dy * 30 * side;
    const y = sample.y + sample.dx * 30 * side;
    props.push({
      sprite: step % 6 === 0 ? "lamp" : step % 3 === 0 ? "postTall" : "postShort",
      x,
      y,
      shadow: "small",
    });
  }

  // Working clutter next to each station.
  [...stations, archive].forEach((station, i) => {
    const clutter = ["crate", "barrelAmber", "crate", "barrelCoral", "crate", "pile", "crate"];
    props.push({
      sprite: clutter[i % clutter.length],
      x: station.x - station.footprint.w / 2 - 16,
      y: station.y + 6,
      shadow: "small",
    });
    props.push({
      sprite: i % 2 === 0 ? "pipeShort" : "postLime",
      x: station.x + station.footprint.w / 2 + 16,
      y: station.y + 4,
      shadow: "small",
    });
  });

  // Signposts at the trailhead and the archive approach.
  const head = path.sample(0.012);
  props.push({ sprite: "signStart", x: head.x - 34, y: head.y + 10, shadow: "small" });
  props.push({ sprite: "signFree", x: head.x + 34, y: head.y + 22, shadow: "small" });
  const gate = path.sample(0.94);
  props.push({ sprite: "signArchive", x: gate.x - 40, y: gate.y + 12, shadow: "small" });

  // A moored boat or two on the open water.
  for (const [bx, by] of [[58, 17], [126, 14], [166, 19]] as Array<[number, number]>) {
    props.push({ sprite: "boat", x: bx * TILE, y: by * TILE, shadow: "none" });
  }

  // ---- Water glints ------------------------------------------------------
  const glints: Array<{ x: number; y: number; phase: number }> = [];
  for (let ty = 0; ty < MAP_H; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) {
      if (!isWet(tiles[index(tx, ty)] as Tile)) continue;
      if (hash2(tx, ty, 601) < 0.93) continue;
      glints.push({
        x: tx * TILE + Math.floor(hash2(tx, ty, 607) * 12) + 2,
        y: ty * TILE + Math.floor(hash2(tx, ty, 613) * 12) + 2,
        phase: hash2(tx, ty, 617) * Math.PI * 2,
      });
    }
  }

  props.sort((a, b) => a.y - b.y);

  return { tiles, blocked, deck, deckMask, path, stations, archive, props, glints };
}

export function tileAt(world: World, x: number, y: number): Tile {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty)) return Tile.Salt;
  return world.tiles[index(tx, ty)] as Tile;
}

export function isOnDeck(world: World, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty)) return false;
  return world.deckMask[index(tx, ty)] === 1;
}

export function isBlockedAt(world: World, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!inBounds(tx, ty)) return true;
  return world.blocked[index(tx, ty)] === 1;
}
