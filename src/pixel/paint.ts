// A very small pixel-drawing DSL.
//
// Every piece of art in the world is authored as code against this helper
// rather than shipped as an image file, so the whole visual layer is
// team-generated and attributable. Coordinates are always integers in sprite
// space; nothing here ever antialiases.

import { PALETTE, TRANSPARENT, colorOf } from "./palette";

export type Painter = {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;
};

export function surface(w: number, h: number): Painter {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, w, h };
}

/** Fill an axis-aligned rectangle with a palette colour. */
export function rect(p: Painter, x: number, y: number, w: number, h: number, key: string) {
  if (key === TRANSPARENT || w <= 0 || h <= 0) return;
  p.ctx.fillStyle = colorOf(key);
  p.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** A single pixel. */
export function px(p: Painter, x: number, y: number, key: string) {
  rect(p, x, y, 1, 1, key);
}

/** A one-pixel outline just outside the given box. */
export function frame(p: Painter, x: number, y: number, w: number, h: number, key: string) {
  rect(p, x, y - 1, w, 1, key);
  rect(p, x, y + h, w, 1, key);
  rect(p, x - 1, y, 1, h, key);
  rect(p, x + w, y, 1, h, key);
}

/** A filled box with an outline and a lit top edge — the workhorse shape. */
export function block(
  p: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  shade?: string,
  light?: string,
  outline = "1",
) {
  rect(p, x, y, w, h, fill);
  if (shade) {
    rect(p, x, y + h - 1, w, 1, shade);
    rect(p, x + w - 1, y, 1, h, shade);
  }
  if (light) rect(p, x, y, w, 1, light);
  if (outline) frame(p, x, y, w, h, outline);
}

/** Filled ellipse, drawn scanline by scanline so the edge stays pixel-hard. */
export function ellipse(
  p: Painter,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  key: string,
) {
  if (key === TRANSPARENT) return;
  p.ctx.fillStyle = colorOf(key);
  for (let y = -ry; y <= ry; y += 1) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (span <= 0 && ry > 1) continue;
    p.ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1);
  }
}

/** Bresenham line. */
export function line(p: Painter, x0: number, y0: number, x1: number, y1: number, key: string) {
  let x = x0 | 0;
  let y = y0 | 0;
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    px(p, x, y, key);
    if (x === (x1 | 0) && y === (y1 | 0)) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Checkerboard dither over a box. `density` 1 = every other pixel, 2 = every
 * fourth, 3 = sparse. Used for every soft transition in the world; there is no
 * alpha blending anywhere in the tile art.
 */
export function dither(
  p: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  key: string,
  density = 1,
  phase = 0,
) {
  if (key === TRANSPARENT) return;
  p.ctx.fillStyle = colorOf(key);
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const gx = x + i;
      const gy = y + j;
      // 1 = 50% checkerboard, 2 = 25% ordered grid, 3 = sparse scatter.
      // These must stay grid-aligned patterns: an (x + y) % 4 test produces
      // diagonal stripes, not a screen, and reads as hatching at any zoom.
      const on = density === 1
        ? (gx + gy + phase) % 2 === 0
        : density === 2
          ? (gx + phase) % 2 === 0 && (gy + phase) % 2 === 0
          : hash2(gx, gy, 900 + phase) > 0.88;
      if (on) p.ctx.fillRect(gx, gy, 1, 1);
    }
  }
}

/** Sparse dither clipped to an ellipse, so a texture pass cannot leak a
 * rectangle out past the shape it belongs to. */
export function ditherEllipse(
  p: Painter,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  key: string,
  density = 2,
  phase = 0,
) {
  if (key === TRANSPARENT) return;
  p.ctx.fillStyle = colorOf(key);
  for (let y = -ry; y <= ry; y += 1) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    for (let x = -span; x <= span; x += 1) {
      const gx = Math.round(cx + x);
      const gy = Math.round(cy + y);
      const on = density === 1
        ? (gx + gy + phase) % 2 === 0
        : density === 2
          ? (gx + phase) % 2 === 0 && (gy + phase) % 2 === 0
          : hash2(gx, gy, 900 + phase) > 0.88;
      if (on) p.ctx.fillRect(gx, gy, 1, 1);
    }
  }
}

/**
 * Decode a hand-authored character grid into a painter. `.` is transparent and
 * every other character is a palette key. Used for the hero sprites, where a
 * drawn grid beats procedural shapes.
 */
export function fromGrid(rows: string[], map?: Record<string, string>): Painter {
  const h = rows.length;
  const w = Math.max(...rows.map((row) => row.length));
  const p = surface(w, h);
  const image = p.ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const raw = row[x];
      if (raw === TRANSPARENT || raw === " ") continue;
      const key = map?.[raw] ?? raw;
      if (key === TRANSPARENT) continue;
      const hex = PALETTE[key];
      if (!hex) throw new Error(`Unknown palette key "${key}" in sprite grid`);
      const offset = (y * w + x) * 4;
      image.data[offset] = parseInt(hex.slice(1, 3), 16);
      image.data[offset + 1] = parseInt(hex.slice(3, 5), 16);
      image.data[offset + 2] = parseInt(hex.slice(5, 7), 16);
      image.data[offset + 3] = 255;
    }
  }
  p.ctx.putImageData(image, 0, 0);
  return p;
}

/** Copy a region of one painter onto another. */
export function stamp(target: Painter, source: Painter, x: number, y: number) {
  target.ctx.drawImage(source.canvas, x | 0, y | 0);
}

/** Horizontally mirrored copy — right-facing sprites reuse the left-facing art. */
export function mirrored(source: Painter): Painter {
  const p = surface(source.w, source.h);
  p.ctx.translate(source.w, 0);
  p.ctx.scale(-1, 1);
  p.ctx.drawImage(source.canvas, 0, 0);
  p.ctx.setTransform(1, 0, 0, 1, 0, 0);
  return p;
}

/** Deterministic hash — every random-looking detail in the world uses this. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
