// The small cast that lives along the free-roam route.
//
// NPCs use the route only as a landmark. Their homes and patrol points are
// deliberately placed on the surrounding salt flat, never on the boardwalk.
// Keeping the definitions here makes the people useful to both the canvas
// engine and the journal overlay without making world-map.ts depend on UI.

import { isBlockedAt, isOnDeck, type World } from "./world-map";

export type NpcId = "biologist" | "engineer" | "researcher";

export type NpcAccessory = "satchel" | "helmet" | "notebook";

export type NpcDefinition = {
  id: NpcId;
  /** Stable key shared with the journal and any DOM overlay. */
  journalKey: NpcId;
  name: string;
  role: string;
  /** Short all-caps label used above the sprite. */
  label: string;
  /** Link to the nearby station chapter. */
  stationKey: string;
  /** Normalised route position, 0 at the trailhead. */
  u: number;
  /** Lateral offset from the route in pixels. Its sign selects a bank. */
  offset: number;
  /** Elliptical off-boardwalk activity area, in world pixels. */
  activityRadiusX: number;
  activityRadiusY: number;
  /** Walking speed while the NPC patrols its activity area. */
  activitySpeed: number;
  /** Canvas tint and accessory colours are kept in the locked pixel palette family. */
  tint: string;
  accent: string;
  paletteKey: string;
  accessory: NpcAccessory;
};

export type Npc = NpcDefinition & {
  /** Current world-space feet position, updated by the engine. */
  x: number;
  y: number;
  /** Stable off-boardwalk centre of the NPC's activity area. */
  homeX: number;
  homeY: number;
  /** Pre-validated patrol targets inside the activity area. */
  activityPoints: Array<{ x: number; y: number }>;
};

/**
 * Three journal-facing NPCs. Their route positions sit just before stations
 * 01, 05 and 06, while their offsets put them on the surrounding salt flat.
 * Visitors can step off the route in free mode to meet them.
 */
export const NPC_DEFINITIONS: readonly NpcDefinition[] = [
  {
    id: "biologist",
    journalKey: "biologist",
    name: "Dr. Lin",
    role: "Biologist",
    label: "BIOLOGIST",
    stationKey: "brine-edge",
    u: 0.073,
    offset: -52,
    activityRadiusX: 26,
    activityRadiusY: 18,
    activitySpeed: 17,
    tint: "#7cc45a",
    accent: "#cdf558",
    paletteKey: "8",
    accessory: "satchel",
  },
  {
    id: "engineer",
    journalKey: "engineer",
    name: "Mara",
    role: "Engineer",
    label: "ENGINEER",
    stationKey: "product-yards",
    u: 0.723,
    offset: 54,
    activityRadiusX: 30,
    activityRadiusY: 18,
    activitySpeed: 20,
    tint: "#ee7a3a",
    accent: "#f7a52d",
    paletteKey: "s",
    accessory: "helmet",
  },
  {
    id: "researcher",
    journalKey: "researcher",
    name: "Ari",
    role: "Researcher",
    label: "RESEARCHER",
    stationKey: "commons",
    u: 0.873,
    offset: -52,
    activityRadiusX: 28,
    activityRadiusY: 20,
    activitySpeed: 18,
    tint: "#7de2ff",
    accent: "#c4a8ff",
    paletteKey: "w",
    accessory: "notebook",
  },
];

function canNpcStand(world: World, x: number, y: number) {
  const halfWidth = 5;
  const halfHeight = 3;
  return !isOnDeck(world, x, y)
    && !isBlockedAt(world, x - halfWidth, y - halfHeight)
    && !isBlockedAt(world, x + halfWidth, y - halfHeight)
    && !isBlockedAt(world, x - halfWidth, y + halfHeight)
    && !isBlockedAt(world, x + halfWidth, y + halfHeight);
}

/** Build positioned NPC records and safe patrol targets for a generated world. */
export function createNpcs(world: World): Npc[] {
  return NPC_DEFINITIONS.map((definition) => {
    const sample = world.path.sample(definition.u);
    const preferredX = sample.x + -sample.dy * definition.offset;
    const preferredY = sample.y + sample.dx * definition.offset;

    // Terrain generation may occasionally put a boulder on the preferred
    // location. Search a small deterministic grid and keep the closest safe,
    // non-deck point as the activity-area centre.
    const centreCandidates: Array<{ x: number; y: number }> = [];
    for (const radius of [0, 8, 16, 24, 32]) {
      for (let step = 0; step < 8; step += 1) {
        const angle = (step / 8) * Math.PI * 2;
        centreCandidates.push({
          x: preferredX + Math.cos(angle) * radius,
          y: preferredY + Math.sin(angle) * radius,
        });
      }
    }
    const centre = centreCandidates.find((point) => canNpcStand(world, point.x, point.y))
      ?? { x: preferredX, y: preferredY };

    const activityPoints = [{ x: centre.x, y: centre.y }];
    for (const radius of [0.45, 0.78, 1]) {
      for (let step = 0; step < 12; step += 1) {
        const angle = (step / 12) * Math.PI * 2;
        const point = {
          x: centre.x + Math.cos(angle) * definition.activityRadiusX * radius,
          y: centre.y + Math.sin(angle) * definition.activityRadiusY * radius,
        };
        if (canNpcStand(world, point.x, point.y)) activityPoints.push(point);
      }
    }

    return {
      ...definition,
      x: centre.x,
      y: centre.y,
      homeX: centre.x,
      homeY: centre.y,
      activityPoints,
    };
  });
}
