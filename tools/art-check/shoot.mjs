// Offline art check.
//
// Renders the pixel world to PNG through a minimal Canvas2D rasteriser, so a
// change to the palette, a tile painter or a sprite can be reviewed as an image
// on any machine — no browser, no display, no screenshot tooling. Run it with
// `npm run art:check` and open tools/art-check/shots/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installShim, writePng } from "./canvas2d.mjs";

installShim();
const here = path.dirname(fileURLToPath(import.meta.url));
const { buildWorld, PixelRenderer, createNpcs } = await import("./.out/entry.js");

const world = buildWorld();
const renderer = new PixelRenderer(document.createElement("canvas"));
await renderer.prepareGround(world, () => {}, () => false);

const WIDTH = Number(process.env.ART_W ?? 1440);
const HEIGHT = Number(process.env.ART_H ?? 900);
const out = path.join(here, "shots");
fs.mkdirSync(out, { recursive: true });

/** Mirrors the guided-mode camera bias in engine.ts. */
function guidedCamera(u, hero) {
  let x = 0;
  let y = 0;
  for (const station of [...world.stations, world.archive]) {
    const weight = Math.max(0, 1 - Math.abs(u - station.u) / 0.08);
    if (weight <= 0) continue;
    const eased = weight * weight * (3 - 2 * weight);
    x += (station.x - hero.x) * 0.5 * eased;
    y += (station.y - 24 - hero.y) * 0.5 * eased;
  }
  return { x: hero.x + x, y: hero.y + y };
}

function shot(name, u, options = {}) {
  renderer.resize(WIDTH, HEIGHT, 1);
  const sample = world.path.sample(u);
  const hero = { x: sample.x, y: sample.y };
  const camera = guidedCamera(u, hero);
  renderer.clampCamera(camera);
  const drawables = [];
  for (const prop of world.props) drawables.push({ kind: "prop", prop });
  for (const station of world.stations) drawables.push({ kind: "station", station });
  drawables.push({ kind: "station", station: world.archive });
  for (const npc of createNpcs(world)) drawables.push({ kind: "npc", npc, x: npc.x, y: npc.y, facing: "down", frame: 0 });
  drawables.push({
    kind: "hero",
    x: hero.x,
    y: hero.y,
    facing: options.facing ?? "right",
    frame: options.frame ?? 1,
  });
  renderer.render({
    world,
    camera,
    drawables,
    time: 1.2,
    daylight: u,
    showNpcLabels: true,
    prompt: options.prompt
      ? { x: hero.x, y: hero.y - 26, text: options.prompt, accent: "8" }
      : null,
  });
  const file = path.join(out, `${name}.png`);
  fs.writeFileSync(file, writePng(renderer.display).buffer);
  console.log("wrote", path.relative(process.cwd(), file));
}

shot("00-trailhead", 0.02);
shot("01-brine-edge", world.stations[0].u, { prompt: "E  ENTER" });
shot("02-the-cell", world.stations[1].u, { prompt: "E  ENTER" });
shot("03-light-array", world.stations[2].u);
shot("04-model-station", world.stations[3].u);
shot("05-product-yards", world.stations[4].u);
shot("06-commons", world.stations[5].u);
shot("07-archive", 0.982);
shot("08-open-flats", 0.33);
shot("09-open-shore", 0.66);
