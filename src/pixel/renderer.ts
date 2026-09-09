// Pixel renderer.
//
// The whole ground layer is painted once into an offscreen canvas and then
// blitted as a single source rectangle every frame, so terrain costs one draw
// call no matter how large the lake is. Everything with height is a sorted
// sprite drawn on top.

import { drawText, textWidth } from "./font";
import { rect, surface, type Painter } from "./paint";
import { deckSegment, getAtlas, stationPlate, type Facing } from "./sprites";
import type { Npc } from "./npc-data";
import { TILE, Tile, paintTile } from "./tiles";
import {
  MAP_H,
  MAP_W,
  WORLD_H,
  WORLD_W,
  type Prop,
  type Station,
  type World,
} from "./world-map";

/** Logical pixels the camera shows across the short axis, before integer scaling. */
const TARGET_SHORT_AXIS = 224;
const MIN_SCALE = 2;
const MAX_SCALE = 6;

export type Camera = { x: number; y: number };

export type Drawable =
  | { kind: "prop"; prop: Prop }
  | { kind: "station"; station: Station }
  | { kind: "npc"; npc: Npc; x: number; y: number; facing: Facing; frame: number }
  | { kind: "hero"; x: number; y: number; facing: Facing; frame: number };

export class PixelRenderer {
  readonly display: HTMLCanvasElement;
  private readonly displayCtx: CanvasRenderingContext2D;
  private buffer: Painter;
  private ground: HTMLCanvasElement | null = null;
  private plates = new Map<string, Painter>();
  /** Tinted/accessoried hero frames, cached so render never allocates canvases. */
  private npcSprites = new Map<string, Painter>();
  scale = 3;

  constructor(display: HTMLCanvasElement) {
    this.display = display;
    this.displayCtx = display.getContext("2d", { alpha: false })!;
    this.displayCtx.imageSmoothingEnabled = false;
    this.buffer = surface(320, 180);
  }

  get width() {
    return this.buffer.w;
  }

  get height() {
    return this.buffer.h;
  }

  /**
   * Paint the terrain. Yields between bands so a 3072x1728 crust does not block
   * the main thread for half a second on first paint.
   */
  async prepareGround(world: World, onProgress: (ratio: number) => void, cancelled: () => boolean) {
    const p = surface(WORLD_W, WORLD_H);
    const at = (tx: number, ty: number) => (dx: number, dy: number): Tile => {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return Tile.Salt;
      return world.tiles[ny * MAP_W + nx] as Tile;
    };
    const band = 6;
    for (let ty = 0; ty < MAP_H; ty += band) {
      if (cancelled()) return;
      for (let y = ty; y < Math.min(MAP_H, ty + band); y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          paintTile(p, world.tiles[y * MAP_W + x] as Tile, x, y, at(x, y));
        }
      }
      onProgress(Math.min(1, (ty + band) / MAP_H));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (cancelled()) return;

    // The boardwalk is laid over the finished terrain as rotated quads, so a
    // curving route never breaks into 16px staircases. It is baked once, so
    // the rotation costs nothing per frame and never shimmers.
    const segments = new Map<number, ReturnType<typeof deckSegment>>();
    for (const pass of [0, 1]) {
      for (const segment of world.deck) {
        let sprite = segments.get(segment.halfWidth);
        if (!sprite) {
          sprite = deckSegment(segment.halfWidth);
          segments.set(segment.halfWidth, sprite);
        }
        p.ctx.save();
        p.ctx.translate(Math.round(segment.x), Math.round(segment.y) + (pass === 0 ? 3 : 0));
        p.ctx.rotate(segment.angle);
        if (pass === 0) {
          // A dark skirt one pass first, so the deck reads as raised decking.
          p.ctx.globalAlpha = 0.45;
          p.ctx.fillStyle = "#3a2f22";
          p.ctx.fillRect(-sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
          p.ctx.globalAlpha = 1;
        } else {
          p.ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2);
        }
        p.ctx.restore();
      }
    }

    this.ground = p.canvas;
    onProgress(1);
  }

  get ready() {
    return this.ground !== null;
  }

  /** Recompute the integer scale and the low-resolution buffer for a viewport. */
  resize(cssWidth: number, cssHeight: number, dpr: number) {
    const shortAxis = Math.min(cssWidth, cssHeight);
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(shortAxis / TARGET_SHORT_AXIS)));
    this.scale = scale;
    const w = Math.ceil(cssWidth / scale);
    const h = Math.ceil(cssHeight / scale);
    if (w !== this.buffer.w || h !== this.buffer.h) this.buffer = surface(w, h);
    this.display.width = Math.round(cssWidth * dpr);
    this.display.height = Math.round(cssHeight * dpr);
    this.display.style.width = `${cssWidth}px`;
    this.display.style.height = `${cssHeight}px`;
    this.displayCtx.imageSmoothingEnabled = false;
  }

  clampCamera(camera: Camera) {
    const halfW = this.buffer.w / 2;
    const halfH = this.buffer.h / 2;
    camera.x = Math.max(halfW, Math.min(WORLD_W - halfW, camera.x));
    camera.y = Math.max(halfH, Math.min(WORLD_H - halfH, camera.y));
  }

  private plateFor(station: Station): Painter {
    let plate = this.plates.get(station.key);
    if (!plate) {
      plate = stationPlate(station.index, station.short, station.accent);
      this.plates.set(station.key, plate);
    }
    return plate;
  }

  private npcSprite(npc: Npc, facing: Facing, frame: number): Painter {
    const key = `${npc.id}:${facing}:${frame % 4}`;
    const cached = this.npcSprites.get(key);
    if (cached) return cached;

    const base = getAtlas().hero[facing][frame % 4];
    const sprite = surface(base.w, base.h);
    const ctx = sprite.ctx;
    ctx.drawImage(base.canvas, 0, 0);

    // Keep the original hero's palette and linework, then add a restrained
    // source-atop tint so each NPC is readable at a glance without introducing
    // a second art style.
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = npc.tint;
    ctx.fillRect(0, 0, sprite.w, sprite.h);
    ctx.restore();

    ctx.fillStyle = npc.accent;
    ctx.strokeStyle = "#06221f";
    ctx.lineWidth = 1;
    if (npc.accessory === "helmet") {
      // Hard, one-pixel helmet brim and crown.
      ctx.fillRect(2, 1, 10, 2);
      ctx.fillRect(4, 0, 6, 1);
      ctx.fillStyle = "#06221f";
      ctx.fillRect(2, 3, 10, 1);
    } else if (npc.accessory === "satchel") {
      // Satchel over one shoulder, plus a bright sample vial in hand.
      ctx.fillRect(1, 10, 3, 6);
      ctx.fillStyle = "#06221f";
      ctx.fillRect(1, 10, 3, 1);
      ctx.fillStyle = npc.accent;
      ctx.fillRect(facing === "left" ? 10 : 1, 13, 2, 3);
    } else {
      // Research notebook held low; the pale edge survives the tint wash.
      ctx.fillRect(facing === "left" ? 2 : 10, 12, 3, 4);
      ctx.fillStyle = "#06221f";
      ctx.fillRect(facing === "left" ? 2 : 10, 12, 3, 1);
    }
    this.npcSprites.set(key, sprite);
    return sprite;
  }

  render(options: {
    world: World;
    camera: Camera;
    drawables: Drawable[];
    time: number;
    /** 0 at the trailhead, 1 at the archive — drives the light. */
    daylight: number;
    prompt: { x: number; y: number; text: string; accent: string } | null;
    /** NPC names and overhead markers are intentionally shown in free mode. */
    showNpcLabels?: boolean;
  }) {
    const { world, camera, drawables, time, daylight, prompt, showNpcLabels = false } = options;
    const p = this.buffer;
    const ctx = p.ctx;
    const ox = Math.round(camera.x - p.w / 2);
    const oy = Math.round(camera.y - p.h / 2);

    ctx.imageSmoothingEnabled = false;
    if (!this.ground) {
      ctx.fillStyle = "#0d3a33";
      ctx.fillRect(0, 0, p.w, p.h);
      this.present();
      return;
    }

    // Ground: one blit.
    ctx.drawImage(this.ground, ox, oy, p.w, p.h, 0, 0, p.w, p.h);

    // Animated water glints. Only the handful inside the viewport are touched.
    ctx.fillStyle = "#ffffff";
    for (const glint of world.glints) {
      const sx = glint.x - ox;
      const sy = glint.y - oy;
      if (sx < -4 || sy < -4 || sx > p.w + 4 || sy > p.h + 4) continue;
      const wave = Math.sin(time * 1.7 + glint.phase);
      if (wave < 0.55) continue;
      const long = wave > 0.86;
      ctx.fillRect(sx, sy, long ? 4 : 2, 1);
      if (long) ctx.fillRect(sx + 1, sy + 2, 2, 1);
    }

    // Sorted sprite pass.
    const atlas = getAtlas();
    const visible = drawables.filter((item) => {
      const [x, y] = item.kind === "prop"
        ? [item.prop.x, item.prop.y]
        : item.kind === "station"
          ? [item.station.x, item.station.y]
          : [item.x, item.y];
      return x > ox - 120 && x < ox + p.w + 120 && y > oy - 140 && y < oy + p.h + 140;
    });
    visible.sort((a, b) => {
      const ay = a.kind === "prop" ? a.prop.y : a.kind === "station" ? a.station.y : a.y;
      const by = b.kind === "prop" ? b.prop.y : b.kind === "station" ? b.station.y : b.y;
      return ay - by;
    });

    const shadowFor = (size: Prop["shadow"]) =>
      size === "large" ? atlas.shadowLarge : size === "medium" ? atlas.shadowMedium : atlas.shadowSmall;

    for (const item of visible) {
      if (item.kind === "prop") {
        const sprite = atlas.props[item.prop.sprite];
        if (!sprite) continue;
        const x = Math.round(item.prop.x - sprite.w / 2) - ox;
        const y = Math.round(item.prop.y - sprite.h) - oy;
        if (item.prop.shadow !== "none") {
          const shadow = shadowFor(item.prop.shadow);
          ctx.drawImage(
            shadow.canvas,
            Math.round(item.prop.x - shadow.w / 2) - ox,
            Math.round(item.prop.y - shadow.h / 2) - oy,
          );
        }
        ctx.drawImage(sprite.canvas, x, y);
      } else if (item.kind === "station") {
        const sprite = atlas.stations[item.station.sprite];
        if (!sprite) continue;
        const x = Math.round(item.station.x - sprite.w / 2) - ox;
        const y = Math.round(item.station.y - sprite.h) - oy;
        const shadow = atlas.shadowLarge;
        ctx.drawImage(
          shadow.canvas,
          Math.round(item.station.x - shadow.w / 2) - ox,
          Math.round(item.station.y - shadow.h / 2) - oy,
        );
        ctx.drawImage(sprite.canvas, x, y);
        const plate = this.plateFor(item.station);
        ctx.drawImage(
          plate.canvas,
          Math.round(item.station.x - plate.w / 2) - ox,
          y - plate.h - 4,
        );
      } else if (item.kind === "npc") {
        const sprite = this.npcSprite(item.npc, item.facing, item.frame);
        const shadow = atlas.shadowSmall;
        ctx.drawImage(
          shadow.canvas,
          Math.round(item.x - shadow.w / 2) - ox,
          Math.round(item.y - shadow.h / 2) - oy,
        );
        ctx.drawImage(
          sprite.canvas,
          Math.round(item.x - sprite.w / 2) - ox,
          Math.round(item.y - sprite.h) - oy,
        );
      } else {
        const sprite = atlas.hero[item.facing][item.frame % 4];
        const shadow = atlas.shadowSmall;
        ctx.drawImage(
          shadow.canvas,
          Math.round(item.x - shadow.w / 2) - ox,
          Math.round(item.y - shadow.h / 2) - oy,
        );
        ctx.drawImage(
          sprite.canvas,
          Math.round(item.x - sprite.w / 2) - ox,
          Math.round(item.y - sprite.h) - oy,
        );
      }
    }

    if (showNpcLabels) {
      for (const item of visible) {
        if (item.kind === "npc") this.drawNpcLabel(item.npc, item.x - ox, item.y - oy - 24);
      }
    }
    if (prompt) this.drawPrompt(prompt.text, prompt.x - ox, prompt.y - oy, prompt.accent);

    this.applyLight(daylight);
    this.present();
  }

  private drawPrompt(text: string, x: number, y: number, accent: string) {
    const p = this.buffer;
    const w = textWidth(text) + 10;
    const h = 15;
    const left = Math.round(x - w / 2);
    const top = Math.round(y - h);
    rect(p, left, top, w, h, "2");
    rect(p, left, top, w, 1, accent);
    rect(p, left - 1, top + 1, 1, h - 2, "1");
    rect(p, left + w, top + 1, 1, h - 2, "1");
    rect(p, left, top - 1, w, 1, "1");
    rect(p, left, top + h, w, 1, "1");
    // Tail.
    rect(p, left + Math.floor(w / 2) - 2, top + h, 5, 1, "2");
    rect(p, left + Math.floor(w / 2) - 1, top + h + 1, 3, 1, "2");
    rect(p, left + Math.floor(w / 2), top + h + 2, 1, 1, "2");
    drawText(p, text, left + 5, top + 4, "F", { shadow: "1" });
  }

  private drawNpcLabel(npc: Npc, x: number, y: number) {
    const label = npc.label;
    const w = textWidth(label) + 8;
    const left = Math.round(x - w / 2);
    const top = Math.round(y - 10);
    const p = this.buffer;
    rect(p, left, top, w, 10, "2");
    rect(p, left, top, w, 1, npc.paletteKey);
    drawText(p, label, left + 4, top + 2, "F", { shadow: "1" });

    // The exclamation mark is a tiny speech-sign marker, kept in the same
    // bitmap font and accent as the NPC rather than browser text.
    const bangW = textWidth("!") + 4;
    const bangLeft = Math.round(x - bangW / 2);
    const bangTop = top - 11;
    rect(p, bangLeft, bangTop, bangW, 9, "2");
    rect(p, bangLeft, bangTop, bangW, 1, npc.paletteKey);
    drawText(p, "!", bangLeft + 2, bangTop + 1, "8", { shadow: "1" });
  }

  /**
   * A single warm-to-cool wash plus a vignette. The journey runs from a cold
   * early morning on the west shore to low golden light at the archive, so the
   * scroll position is legible from the colour alone.
   */
  private applyLight(daylight: number) {
    const p = this.buffer;
    const ctx = p.ctx;
    const warmth = Math.max(0, Math.min(1, daylight));
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = `rgb(${Math.round(120 + warmth * 135)},${Math.round(150 + warmth * 60)},${Math.round(210 - warmth * 90)})`;
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    const vignette = ctx.createRadialGradient(
      p.w / 2,
      p.h / 2,
      Math.min(p.w, p.h) * 0.35,
      p.w / 2,
      p.h / 2,
      Math.max(p.w, p.h) * 0.72,
    );
    vignette.addColorStop(0, "rgba(6,34,31,0)");
    vignette.addColorStop(1, "rgba(6,34,31,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.restore();
  }

  private present() {
    const ctx = this.displayCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.buffer.canvas,
      0,
      0,
      this.buffer.w,
      this.buffer.h,
      0,
      0,
      this.display.width,
      this.display.height,
    );
  }

  dispose() {
    this.ground = null;
    this.plates.clear();
    this.npcSprites.clear();
    this.buffer = surface(1, 1);
    this.display.width = 1;
    this.display.height = 1;
  }
}

export { TILE };
