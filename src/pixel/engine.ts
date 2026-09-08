// The world engine: input, the two travel modes and the frame loop.
//
// Guided mode maps page scroll onto the boardwalk route through a damped
// spring, which keeps the momentum of the previous 3D version. Free mode hands
// the same hero over to the keyboard with real collision, so the visitor can
// leave the route and come back to it without losing their place in the page.

import { PixelRenderer, type Camera, type Drawable } from "./renderer";
import type { Facing } from "./sprites";
import { TILE, drag } from "./tiles";
import {
  buildWorld,
  isBlockedAt,
  tileAt,
  type Station,
  type World,
} from "./world-map";

export type Mode = "guided" | "free" | "returning";

export type EngineEvents = {
  onLoadProgress: (ratio: number) => void;
  onReady: () => void;
  onMode: (mode: Mode) => void;
  /** Index into world.stations, or -1 between chapters. */
  onChapter: (index: number) => void;
  onPrompt: (station: Station | null) => void;
  /** Fired when the visitor confirms an interaction. */
  onEnter: (station: Station) => void;
};

const WALK_SPEED = 62;
const RUN_SPEED = 104;
const ACCEL = 620;
const FRICTION = 12;

// Guided-mode spring, carried over from the previous scroll journey.
const FOLLOW_STIFFNESS = 70;
const FOLLOW_DAMPING = 15;
const MAX_FOLLOW_SPEED = 0.48;

const INTERACT_RADIUS = 62;
/** Hero collision box at the feet, in pixels. */
const BODY_HALF_W = 5;
const BODY_HALF_H = 3;

export class PixelEngine {
  readonly world: World;
  private readonly renderer: PixelRenderer;
  private readonly host: HTMLElement;
  private readonly events: EngineEvents;

  private raf = 0;
  private disposed = false;
  private lastTime = 0;

  mode: Mode = "guided";
  /** Normalised position along the route. */
  u = 0.001;
  private targetU = 0.001;
  private uVelocity = 0;

  private hero = { x: 0, y: 0, vx: 0, vy: 0 };
  private facing: Facing = "right";
  private walkDistance = 0;
  private returnFrom = { x: 0, y: 0 };
  private returnTime = 0;

  private camera: Camera = { x: 0, y: 0 };
  private keys = new Set<string>();
  private stick: { active: boolean; x: number; y: number; originX: number; originY: number } = {
    active: false,
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
  };

  private activeStation: Station | null = null;
  private chapter = -1;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, host: HTMLElement, events: EngineEvents) {
    this.world = buildWorld();
    this.renderer = new PixelRenderer(canvas);
    this.host = host;
    this.events = events;

    const start = this.world.path.sample(0.001);
    this.hero.x = start.x;
    this.hero.y = start.y;
    this.camera.x = start.x;
    this.camera.y = start.y;
  }

  async start() {
    this.applySize();
    this.resizeObserver = new ResizeObserver(() => this.applySize());
    this.resizeObserver.observe(this.host);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.renderer.display.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);

    await this.renderer.prepareGround(
      this.world,
      (ratio) => this.events.onLoadProgress(ratio),
      () => this.disposed,
    );
    if (this.disposed) return;
    this.events.onReady();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.display.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.renderer.dispose();
  }

  private applySize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  }

  // -- public control ------------------------------------------------------

  /** Called from the scroll handler while in guided mode. */
  setScrollProgress(value: number) {
    this.targetU = Math.max(0.001, Math.min(0.999, value));
  }

  enterFree() {
    if (this.mode === "free") return;
    const sample = this.world.path.sample(this.u);
    this.hero.x = sample.x;
    this.hero.y = sample.y;
    this.hero.vx = 0;
    this.hero.vy = 0;
    this.mode = "free";
    this.events.onMode(this.mode);
  }

  exitFree() {
    if (this.mode !== "free") return;
    this.u = this.world.path.nearestU(this.hero.x, this.hero.y);
    this.targetU = this.u;
    this.uVelocity = 0;
    this.returnFrom = { x: this.hero.x, y: this.hero.y };
    this.returnTime = 0;
    this.mode = "returning";
    this.events.onMode(this.mode);
    this.keys.clear();
    this.stick.active = false;
  }

  /** Confirm the current interaction prompt. Returns the route, if any. */
  interact(): Station | null {
    if (!this.activeStation) return null;
    this.events.onEnter(this.activeStation);
    return this.activeStation;
  }

  get journey() {
    return this.u;
  }

  // -- input ---------------------------------------------------------------

  private static readonly MOVE_KEYS = new Set([
    "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d",
  ]);

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const key = event.key.toLowerCase();

    if (key === "escape" && this.mode === "free") {
      event.preventDefault();
      this.exitFree();
      return;
    }
    if ((key === "e" || key === "enter") && this.activeStation) {
      event.preventDefault();
      this.interact();
      return;
    }
    if (!PixelEngine.MOVE_KEYS.has(key) && key !== "shift") return;

    // A movement key is the invitation to leave the guided route.
    if (this.mode !== "free" && PixelEngine.MOVE_KEYS.has(key)) this.enterFree();
    if (this.mode === "free") event.preventDefault();
    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onBlur = () => {
    this.keys.clear();
    this.stick.active = false;
  };

  private onPointerDown = (event: PointerEvent) => {
    if (this.mode !== "free") return;
    this.stick.active = true;
    this.stick.originX = event.clientX;
    this.stick.originY = event.clientY;
    this.stick.x = 0;
    this.stick.y = 0;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.stick.active) return;
    const dx = event.clientX - this.stick.originX;
    const dy = event.clientY - this.stick.originY;
    const length = Math.hypot(dx, dy);
    const dead = 12;
    if (length < dead) {
      this.stick.x = 0;
      this.stick.y = 0;
      return;
    }
    const clamped = Math.min(1, (length - dead) / 46);
    this.stick.x = (dx / length) * clamped;
    this.stick.y = (dy / length) * clamped;
  };

  private onPointerUp = () => {
    this.stick.active = false;
    this.stick.x = 0;
    this.stick.y = 0;
  };

  private inputVector(): { x: number; y: number; run: boolean } {
    let x = 0;
    let y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) y -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y += 1;
    if (x || y) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    } else if (this.stick.active) {
      x = this.stick.x;
      y = this.stick.y;
    }
    return { x, y, run: this.keys.has("shift") };
  }

  // -- simulation ----------------------------------------------------------

  private moveWithCollision(dx: number, dy: number) {
    // Axis-separated resolution against the tile grid: the hero slides along a
    // wall instead of sticking to it.
    const testX = this.hero.x + dx;
    if (
      !isBlockedAt(this.world, testX - BODY_HALF_W, this.hero.y - BODY_HALF_H)
      && !isBlockedAt(this.world, testX + BODY_HALF_W, this.hero.y - BODY_HALF_H)
      && !isBlockedAt(this.world, testX - BODY_HALF_W, this.hero.y + BODY_HALF_H)
      && !isBlockedAt(this.world, testX + BODY_HALF_W, this.hero.y + BODY_HALF_H)
    ) {
      this.hero.x = testX;
    } else {
      this.hero.vx = 0;
    }

    const testY = this.hero.y + dy;
    if (
      !isBlockedAt(this.world, this.hero.x - BODY_HALF_W, testY - BODY_HALF_H)
      && !isBlockedAt(this.world, this.hero.x + BODY_HALF_W, testY - BODY_HALF_H)
      && !isBlockedAt(this.world, this.hero.x - BODY_HALF_W, testY + BODY_HALF_H)
      && !isBlockedAt(this.world, this.hero.x + BODY_HALF_W, testY + BODY_HALF_H)
    ) {
      this.hero.y = testY;
    } else {
      this.hero.vy = 0;
    }
  }

  private stepFree(delta: number) {
    const input = this.inputVector();
    const terrain = drag(tileAt(this.world, this.hero.x, this.hero.y));
    const max = (input.run ? RUN_SPEED : WALK_SPEED) * terrain;

    this.hero.vx += input.x * ACCEL * delta;
    this.hero.vy += input.y * ACCEL * delta;
    const damping = Math.exp(-FRICTION * delta);
    if (!input.x) this.hero.vx *= damping;
    if (!input.y) this.hero.vy *= damping;

    const speed = Math.hypot(this.hero.vx, this.hero.vy);
    if (speed > max) {
      this.hero.vx = (this.hero.vx / speed) * max;
      this.hero.vy = (this.hero.vy / speed) * max;
    }

    this.moveWithCollision(this.hero.vx * delta, this.hero.vy * delta);
    this.walkDistance += Math.hypot(this.hero.vx, this.hero.vy) * delta;
    this.updateFacing(this.hero.vx, this.hero.vy);
    // Keep the page scroll roughly in step so leaving free mode never jumps.
    this.u = this.world.path.nearestU(this.hero.x, this.hero.y);
  }

  private stepGuided(delta: number) {
    const remaining = this.targetU - this.u;
    this.uVelocity += (remaining * FOLLOW_STIFFNESS - this.uVelocity * FOLLOW_DAMPING) * delta;
    this.uVelocity = Math.max(-MAX_FOLLOW_SPEED, Math.min(MAX_FOLLOW_SPEED, this.uVelocity));
    const next = this.u + this.uVelocity * delta;
    if (Math.sign(this.targetU - next) !== Math.sign(remaining) && Math.abs(remaining) < 0.0015) {
      this.u = this.targetU;
      this.uVelocity = 0;
    } else {
      this.u = Math.max(0.001, Math.min(0.999, next));
    }

    const sample = this.world.path.sample(this.u);
    // A gentle sway keeps the walk from looking rail-mounted.
    const sway = Math.sin(this.u * Math.PI * 22) * 3.5;
    const previousX = this.hero.x;
    const previousY = this.hero.y;
    this.hero.x = sample.x + -sample.dy * sway;
    this.hero.y = sample.y + sample.dx * sway;
    const moveX = this.hero.x - previousX;
    const moveY = this.hero.y - previousY;
    this.walkDistance += Math.hypot(moveX, moveY);
    if (Math.abs(this.uVelocity) > 0.0006) {
      const direction = this.uVelocity >= 0 ? 1 : -1;
      this.updateFacing(sample.dx * direction, sample.dy * direction);
    }
  }

  private stepReturning(delta: number) {
    this.returnTime += delta;
    const t = Math.min(1, this.returnTime / 0.7);
    const eased = t * t * (3 - 2 * t);
    const sample = this.world.path.sample(this.u);
    this.hero.x = this.returnFrom.x + (sample.x - this.returnFrom.x) * eased;
    this.hero.y = this.returnFrom.y + (sample.y - this.returnFrom.y) * eased;
    this.walkDistance += Math.hypot(sample.x - this.returnFrom.x, sample.y - this.returnFrom.y) * delta;
    this.updateFacing(sample.x - this.returnFrom.x, sample.y - this.returnFrom.y);
    if (t >= 1) {
      this.mode = "guided";
      this.events.onMode(this.mode);
    }
  }

  private updateFacing(dx: number, dy: number) {
    if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return;
    if (Math.abs(dx) >= Math.abs(dy)) this.facing = dx > 0 ? "right" : "left";
    else this.facing = dy > 0 ? "down" : "up";
  }

  private updateProximity() {
    let nearest: Station | null = null;
    let nearestDistance = INTERACT_RADIUS;
    for (const station of [...this.world.stations, this.world.archive]) {
      const distance = Math.hypot(station.x - this.hero.x, station.y + 6 - this.hero.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = station;
      }
    }
    if (nearest !== this.activeStation) {
      this.activeStation = nearest;
      this.events.onPrompt(nearest);
    }

    // Chapter HUD follows route position, not proximity, so it stays stable
    // while the visitor wanders off the boardwalk.
    let chapter = -1;
    this.world.stations.forEach((station, index) => {
      if (Math.abs(this.u - station.u) < 0.062) chapter = index;
    });
    if (chapter !== this.chapter) {
      this.chapter = chapter;
      this.events.onChapter(chapter);
    }
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) {
      this.lastTime = now;
      return;
    }
    const delta = Math.min(0.04, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.mode === "free") this.stepFree(delta);
    else if (this.mode === "returning") this.stepReturning(delta);
    else this.stepGuided(delta);

    this.updateProximity();

    // Camera leads slightly in the direction of travel, and on the guided
    // route it drifts toward whichever station is coming up so the landmark is
    // always framed rather than sitting just past the edge of the viewport.
    let leadX = 0;
    let leadY = 0;
    if (this.mode === "free") {
      leadX = this.hero.vx * 0.32;
      leadY = this.hero.vy * 0.32;
    } else {
      for (const station of [...this.world.stations, this.world.archive]) {
        const weight = Math.max(0, 1 - Math.abs(this.u - station.u) / 0.08);
        if (weight <= 0) continue;
        const ease = weight * weight * (3 - 2 * weight);
        leadX += (station.x - this.hero.x) * 0.5 * ease;
        leadY += (station.y - 24 - this.hero.y) * 0.5 * ease;
      }
    }
    const ease = 1 - Math.exp(-(this.mode === "free" ? 7.5 : 5.2) * delta);
    this.camera.x += (this.hero.x + leadX - this.camera.x) * ease;
    this.camera.y += (this.hero.y + leadY - this.camera.y) * ease;
    this.renderer.clampCamera(this.camera);

    const drawables: Drawable[] = [];
    for (const prop of this.world.props) drawables.push({ kind: "prop", prop });
    for (const station of this.world.stations) drawables.push({ kind: "station", station });
    drawables.push({ kind: "station", station: this.world.archive });
    drawables.push({
      kind: "hero",
      x: this.hero.x,
      y: this.hero.y,
      facing: this.facing,
      frame: Math.floor(this.walkDistance / 7) % 4,
    });

    this.renderer.render({
      world: this.world,
      camera: this.camera,
      drawables,
      time: now / 1000,
      daylight: this.u,
      prompt: this.activeStation
        ? {
          x: this.hero.x,
          y: this.hero.y - 26,
          text: this.mode === "free" ? "E  ENTER" : this.activeStation.index,
          accent: this.activeStation.accent,
        }
        : null,
    });
  };
}

export { TILE };
