// The six chapter stations and the archive, in one place.
//
// Both the canvas world and the DOM overlay read from here, so a station's
// number, colour and copy can never drift between the two layers. The science
// copy follows the project draft and keeps design intent distinct from results.

export type StationCopy = {
  key: string;
  index: string;
  kicker: string;
  title: string;
  body: string;
  route: string;
  /** CSS colour for the DOM overlay. */
  color: string;
  /** Matching palette key for anything drawn on the canvas. */
  accent: string;
  /** Short label for the in-world sign plate. */
  short: string;
  /** Position along the boardwalk route, 0 at the trailhead. */
  u: number;
  /** Lateral offset from the route in pixels; negative is left of travel. */
  offset: number;
  sprite: string;
};

export const STATION_COPY: StationCopy[] = [
  {
    key: "brine-edge",
    short: "CHASSIS",
    index: "01",
    kicker: "HALOPHILIC CHASSIS",
    title: "Life without a wall",
    body: "Dunaliella salina is a wall-less, motile green alga adapted to hypersaline water.",
    route: "/alternative-platform",
    color: "#cdf558",
    accent: "8",
    u: 0.085,
    offset: 82,
    sprite: "brine-edge",
  },
  {
    key: "the-cell",
    short: "THE CELL",
    index: "02",
    kicker: "REAL CELL ARCHITECTURE",
    title: "Meet Dunaliella",
    body: "Two equal anterior flagella, a cup-shaped chloroplast, a central pyrenoid and a small eyespot shape the cell beside the road.",
    route: "/project-description",
    color: "#f7a52d",
    accent: "s",
    u: 0.245,
    offset: -88,
    sprite: "the-cell",
  },
  {
    key: "light-array",
    short: "LIGHT",
    index: "03",
    kicker: "TRANSCRIPTOMICS",
    title: "Read the light response",
    body: "Light-response profiles and carotenoid-pathway references define a shared coexpression ranking of transcription-factor homologs, with CXC domains identifying CPP sequence evidence.",
    route: "/transcriptomics",
    color: "#7de2ff",
    accent: "x",
    u: 0.415,
    offset: 84,
    sprite: "light-array",
  },
  {
    key: "model-station",
    short: "MODEL",
    index: "04",
    kicker: "MATHEMATICAL MODEL",
    title: "Find where control moves",
    body: "Models of expression, branch kinetics and network capacity explore when more LCYB may stop producing a useful gain. Their outputs are predictions to test.",
    route: "/model",
    color: "#e9c43a",
    accent: "u",
    u: 0.575,
    offset: -86,
    sprite: "model-station",
  },
  {
    key: "product-yards",
    short: "PRODUCTS",
    index: "05",
    kicker: "FOUR PRODUCT ROUTES",
    title: "One hub, four designs",
    body: "β-ionone, astaxanthin, crocetin and β-citraurin are candidate routes around a shared β-carotene hub, intended for separate strains.",
    route: "/engineering",
    color: "#e65c42",
    accent: "t",
    u: 0.735,
    offset: 88,
    sprite: "product-yards",
  },
  {
    key: "commons",
    short: "COMMONS",
    index: "06",
    kicker: "RESPONSIBLE ENGINEERING",
    title: "The world changes the design",
    body: "Safety, stakeholder feedback and reproducibility determine whether the platform should move beyond the lab.",
    route: "/human-practices",
    color: "#c4a8ff",
    accent: "w",
    u: 0.885,
    offset: -84,
    sprite: "commons",
  },
];

export const ARCHIVE_COPY: StationCopy = {
  key: "archive",
  short: "ARCHIVE",
  index: "07",
  kicker: "EVERY STANDARD ROUTE",
  title: "The DunaTerp archive",
  body: "Every judging page, in one place, reachable without the journey.",
  route: "/wiki-map",
  color: "#cdf558",
  accent: "8",
  u: 0.985,
  offset: 0,
  sprite: "archive",
};
