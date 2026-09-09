// Entry point for the offline art check. Re-exports only what the harness
// needs, so the check never drifts from the code the site actually ships.
export { buildWorld } from "../../src/pixel/world-map";
export { PixelRenderer } from "../../src/pixel/renderer";
export { getAtlas } from "../../src/pixel/sprites";
export { STATION_COPY, ARCHIVE_COPY } from "../../src/pixel/station-copy";
export { PixelEngine } from "../../src/pixel/engine";
export { createNpcs } from "../../src/pixel/npc-data";
export { isBlockedAt } from "../../src/pixel/world-map";
