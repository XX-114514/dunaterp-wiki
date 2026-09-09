// The small cast that lives along the free-roam route.
//
// NPCs deliberately use the same route samples as the stations.  Keeping the
// definitions here makes the people useful to both the canvas engine and the
// journal overlay without making world-map.ts depend on UI concerns.

import type { World } from "./world-map";

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
  /** Lateral offset from the route in pixels. Zero keeps the NPC on the deck. */
  offset: number;
  /** Canvas tint and accessory colours are kept in the locked pixel palette family. */
  tint: string;
  accent: string;
  paletteKey: string;
  accessory: NpcAccessory;
};

export type Npc = NpcDefinition & {
  /** World-space feet position, filled from the route by createNpcs. */
  x: number;
  y: number;
};

/**
 * Three journal-facing NPCs. Their route positions sit just before stations
 * 01, 05 and 06, on the boardwalk mask, so they remain reachable in free mode
 * even when a station's building footprint is blocked.
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
    offset: 0,
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
    offset: 0,
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
    offset: 0,
    tint: "#7de2ff",
    accent: "#c4a8ff",
    paletteKey: "w",
    accessory: "notebook",
  },
];

/** Build positioned NPC records for a freshly generated world. */
export function createNpcs(world: Pick<World, "path">): Npc[] {
  return NPC_DEFINITIONS.map((definition) => {
    const sample = world.path.sample(definition.u);
    return {
      ...definition,
      x: sample.x + -sample.dy * definition.offset,
      y: sample.y + sample.dx * definition.offset,
    };
  });
}

