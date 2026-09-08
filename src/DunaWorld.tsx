import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import helvetikerBold from "three/examples/fonts/helvetiker_bold.typeface.json";
import type { RoutePhysics, RoutePhysicsInput } from "./route-physics";

type HeaderProps = { light?: boolean };

type PanelGroup = {
  key: string;
  index: string;
  label: string;
  short: string;
  summary: string;
  accent: string;
  links: Array<{ label: string; href: string; note: string }>;
};

const chapters = [
  {
    t: 0.08,
    n: "01",
    kicker: "HALOPHILIC CHASSIS",
    title: "Life without a wall",
    body: "Dunaliella salina is a wall-less, motile green alga adapted to hypersaline water.",
    link: "/alternative-platform",
    c: "#c9ff55",
  },
  {
    t: 0.25,
    n: "02",
    kicker: "REAL CELL ARCHITECTURE",
    title: "Meet Dunaliella",
    body: "Two equal anterior flagella, a cup-shaped chloroplast, a central pyrenoid and a small eyespot shape the cell beside the road.",
    link: "/project-description",
    c: "#ff8b3d",
  },
  {
    t: 0.42,
    n: "03",
    kicker: "TRANSCRIPTOMICS",
    title: "Read the light response",
    body: "Light intensity and quality become two analysis axes for finding testable regulators around the LCYB control point.",
    link: "/results",
    c: "#7de2ff",
  },
  {
    t: 0.59,
    n: "04",
    kicker: "MATHEMATICAL MODEL",
    title: "Find where control moves",
    body: "Expression, branch kinetics and network capacity ask when more LCYB stops producing a useful gain.",
    link: "/model",
    c: "#f8cb54",
  },
  {
    t: 0.75,
    n: "05",
    kicker: "FOUR PRODUCT ROUTES",
    title: "One hub, four strains",
    body: "β-ionone, astaxanthin, crocetin and β-citraurin are designed as separate product strains sharing a β-carotene hub.",
    link: "/engineering",
    c: "#ff6d8b",
  },
  {
    t: 0.88,
    n: "06",
    kicker: "RESPONSIBLE ENGINEERING",
    title: "The world changes the design",
    body: "Safety, stakeholder feedback and reproducibility determine whether the platform should move beyond the lab.",
    link: "/human-practices",
    c: "#c4a8ff",
  },
] as const;

const panelGroups: PanelGroup[] = [
  {
    key: "wet-lab",
    index: "01",
    label: "Wet Lab",
    short: "WL",
    summary: "Build the chassis, test the constructs and preserve every experimental decision.",
    accent: "#c9ff55",
    links: [
      { label: "Project Description", href: "/project-description", note: "The biological idea and product routes" },
      { label: "Engineering", href: "/engineering", note: "Design · Build · Test · Learn" },
      { label: "Experiments", href: "/experiments", note: "Protocols, controls and records" },
      { label: "Results", href: "/results", note: "Evidence and its limits" },
      { label: "Safety", href: "/safety-and-security", note: "Containment and risk design" },
    ],
  },
  {
    key: "dry-lab",
    index: "02",
    label: "Dry Lab",
    short: "DL",
    summary: "Connect light, regulation and pathway allocation with reproducible computation.",
    accent: "#7de2ff",
    links: [
      { label: "Model", href: "/model", note: "ODE, branch allocation and FBA" },
      { label: "Transcriptomics", href: "/results", note: "Light response and candidate regulators" },
      { label: "Alternative Platform", href: "/alternative-platform", note: "Why Dunaliella is the chassis" },
      { label: "Contribution", href: "/contribution", note: "Reusable workflows and troubleshooting" },
    ],
  },
  {
    key: "human-practices",
    index: "03",
    label: "Human Practices",
    short: "HP",
    summary: "Let stakeholders, safety and sustainability change what the team builds.",
    accent: "#f8cb54",
    links: [
      { label: "Human Practices", href: "/human-practices", note: "People, feedback and design decisions" },
      { label: "Sustainability", href: "/sustainability", note: "Whole-system impact" },
      { label: "Education", href: "/education", note: "Dialogue and reusable learning" },
    ],
  },
  {
    key: "people",
    index: "04",
    label: "People",
    short: "PE",
    summary: "Meet the team and see exactly who contributed, supported and reviewed the work.",
    accent: "#ff8b72",
    links: [
      { label: "Team", href: "/team", note: "Students, PIs, instructors and advisors" },
      { label: "Attributions", href: "/attributions", note: "A transparent division of work" },
      { label: "Responsible AI", href: "/responsible-ai", note: "Models, boundaries and human review" },
      { label: "Complete Wiki Map", href: "/wiki-map", note: "Every standard route in one place" },
    ],
  },
];

function makeRoad(curve: THREE.CatmullRomCurve3, width: number) {
  const segments = 260;
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
    positions.push(
      point.x + side.x,
      0.08,
      point.z + side.z,
      point.x - side.x,
      0.08,
      point.z - side.z,
    );
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function textSprite(text: string, accent = "#d5ff61", scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const context = canvas.getContext("2d")!;
  context.shadowColor = "rgba(2, 20, 18, .8)";
  context.shadowBlur = 18;
  context.fillStyle = accent;
  context.font = "800 54px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 384, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(8 * scale, 2 * scale, 1);
  return sprite;
}

function createTerminalScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 660;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#caff61";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#082c27";
  context.lineWidth = 22;
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#082c27";
  context.font = "900 58px system-ui";
  context.letterSpacing = "12px";
  context.fillText("END OF ROUTE", 600, 178);
  context.font = "800 116px Georgia";
  context.letterSpacing = "-4px";
  context.fillText("ENTER THE WIKI", 600, 342);
  context.font = "900 84px system-ui";
  context.letterSpacing = "18px";
  context.fillText("↓  ↓  ↓", 600, 514);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const routeLetterFont = new FontLoader().parse(helvetikerBold as FontData);

function createRouteLetter(letter: string, material: THREE.MeshToonMaterial) {
  const group = new THREE.Group();
  group.name = `Route letter ${letter}`;
  const geometry = new TextGeometry(letter, {
    font: routeLetterFont,
    size: 1,
    depth: 0.34,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const size = bounds.getSize(new THREE.Vector3());
  geometry.translate(
    -(bounds.min.x + bounds.max.x) / 2,
    -(bounds.min.y + bounds.max.y) / 2,
    -(bounds.min.z + bounds.max.z) / 2,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `DUNATERP letter ${letter}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  group.userData.mesh = mesh;
  group.userData.size = size;

  return group;
}

function createRouteWordmark() {
  const group = new THREE.Group();
  group.name = "DUNATERP starting wordmark";
  const letters = [..."DUNATERP"];
  const material = new THREE.MeshToonMaterial({ color: 0x9ed94c });
  const meshes: THREE.Mesh<TextGeometry, THREE.MeshToonMaterial>[] = [];
  let cursor = 0;

  letters.forEach((letter, index) => {
    const glyph = createRouteLetter(letter, material);
    const mesh = glyph.userData.mesh as THREE.Mesh<TextGeometry, THREE.MeshToonMaterial>;
    const size = glyph.userData.size as THREE.Vector3;
    glyph.position.set(cursor + size.x / 2, size.y / 2, 0);
    glyph.rotation.y = (index % 3 - 1) * 0.012;
    cursor += size.x + 0.13;
    group.add(glyph);
    meshes.push(mesh);
  });
  const totalWidth = cursor - 0.13;
  group.children.forEach((glyph) => {
    glyph.position.x -= totalWidth / 2;
  });
  group.userData.letterMeshes = meshes;

  return group;
}

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, radius, 8, false),
    material,
  );
}

function createDunaliella() {
  const cell = new THREE.Group();
  cell.name = "Dunaliella salina model";
  const membrane = new THREE.MeshPhysicalMaterial({
    color: 0xaef378,
    transparent: true,
    opacity: 0.34,
    roughness: 0.2,
    transmission: 0.35,
    side: THREE.DoubleSide,
  });
  const profile = [
    new THREE.Vector2(0.18, -2.5),
    new THREE.Vector2(1.35, -2.15),
    new THREE.Vector2(1.85, -0.7),
    new THREE.Vector2(1.72, 0.8),
    new THREE.Vector2(1.2, 1.9),
    new THREE.Vector2(0.48, 2.55),
    new THREE.Vector2(0.08, 2.65),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), membrane);
  body.castShadow = true;
  cell.add(body);

  const chloroplast = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.56, 14, 48, Math.PI * 1.72),
    new THREE.MeshToonMaterial({ color: 0x5ca532, transparent: true, opacity: 0.8 }),
  );
  chloroplast.rotation.set(Math.PI / 2, 0, -0.15);
  chloroplast.scale.set(1, 1.35, 1);
  chloroplast.position.y = -0.4;
  cell.add(chloroplast);

  const pyrenoid = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 24, 16),
    new THREE.MeshToonMaterial({ color: 0xd9e9a9 }),
  );
  pyrenoid.position.set(0, -0.45, 0.15);
  cell.add(pyrenoid);

  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 24, 16),
    new THREE.MeshToonMaterial({ color: 0xf3e9a7 }),
  );
  nucleus.scale.y = 1.25;
  nucleus.position.set(0, 0.85, -0.15);
  cell.add(nucleus);

  const eyespot = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 12),
    new THREE.MeshToonMaterial({ color: 0xe44924 }),
  );
  eyespot.position.set(1.18, 1.05, 0.64);
  cell.add(eyespot);

  const dropletMaterial = new THREE.MeshToonMaterial({ color: 0xf78b24 });
  [
    [-1.15, -1.25, 0.45],
    [0.9, -1.5, 0.8],
    [-1.25, 0.1, -0.55],
    [1.28, -0.2, -0.25],
    [-0.82, -1.72, -0.72],
    [0.55, -1.78, -0.9],
    [1.05, 0.4, 0.55],
  ].forEach(([x, y, z], index) => {
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 + (index % 3) * 0.035, 16, 10),
      dropletMaterial,
    );
    droplet.position.set(x, y, z);
    cell.add(droplet);
  });

  const flagellaMaterial = new THREE.MeshToonMaterial({ color: 0xbdf479 });
  const flagellumA = tube(
    [
      new THREE.Vector3(-0.2, 2.5, 0),
      new THREE.Vector3(-0.65, 3.5, 0.2),
      new THREE.Vector3(-1.7, 4.2, 0.7),
      new THREE.Vector3(-2.8, 5.5, 0.2),
      new THREE.Vector3(-2.1, 7, -0.4),
    ],
    0.055,
    flagellaMaterial,
  );
  const flagellumB = tube(
    [
      new THREE.Vector3(0.2, 2.5, 0),
      new THREE.Vector3(0.8, 3.45, -0.1),
      new THREE.Vector3(1.9, 4.1, -0.7),
      new THREE.Vector3(3, 5.35, -0.15),
      new THREE.Vector3(2.35, 6.9, 0.5),
    ],
    0.055,
    flagellaMaterial,
  );
  cell.add(flagellumA, flagellumB);
  cell.scale.setScalar(1.08);
  return cell;
}

function createVehicle() {
  const vehicle = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.45, 2.15),
    new THREE.MeshToonMaterial({ color: 0xf1762e }),
  );
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  vehicle.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshToonMaterial({ color: 0x173f3a }),
  );
  cabin.scale.set(0.86, 0.75, 1);
  cabin.rotation.x = Math.PI;
  cabin.position.set(0, 0.82, -0.2);
  vehicle.add(cabin);

  const wheelMaterial = new THREE.MeshToonMaterial({ color: 0x122522 });
  [
    [-0.76, 0.3, 0.7],
    [0.76, 0.3, 0.7],
    [-0.76, 0.3, -0.72],
    [0.76, 0.3, -0.72],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 18), wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    vehicle.add(wheel);
  });

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 20),
    new THREE.MeshBasicMaterial({ color: 0xd9ff67 }),
  );
  glow.position.set(0, 0.58, 1.081);
  vehicle.add(glow);

  const rearBumper = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 0.16, 0.12),
    new THREE.MeshToonMaterial({ color: 0x173f3a }),
  );
  rearBumper.position.set(0, 0.42, -1.11);
  vehicle.add(rearBumper);
  [-0.43, 0.43].forEach((x) => {
    const tailLight = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 16),
      new THREE.MeshBasicMaterial({ color: 0xff5e45 }),
    );
    tailLight.position.set(x, 0.64, -1.086);
    tailLight.rotation.y = Math.PI;
    vehicle.add(tailLight);
  });
  return vehicle;
}

function createMiniDunaliella(seed: number) {
  const mini = new THREE.Group();
  const colors = [0x83ca4a, 0xa8d84f, 0xe6a33b, 0x70bd45];
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 18, 12),
    new THREE.MeshToonMaterial({ color: colors[seed % colors.length] }),
  );
  body.scale.set(0.78, 1.08, 0.67);
  body.castShadow = true;
  mini.add(body);

  const chloroplast = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.1, 8, 18, Math.PI * 1.7),
    new THREE.MeshToonMaterial({ color: 0x4c8f35 }),
  );
  chloroplast.rotation.x = Math.PI / 2;
  chloroplast.position.set(0, -0.06, 0.37);
  mini.add(chloroplast);

  const eyespot = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xf26a21 }),
  );
  eyespot.position.set(0.25, 0.16, 0.34);
  mini.add(eyespot);

  const flagellaMaterial = new THREE.MeshBasicMaterial({ color: 0xcaff61 });
  mini.add(
    tube(
      [
        new THREE.Vector3(-0.1, 0.42, 0),
        new THREE.Vector3(-0.18, 0.77, 0.05),
        new THREE.Vector3(-0.42, 1.12, 0.08),
        new THREE.Vector3(-0.32, 1.48, -0.04),
      ],
      0.018,
      flagellaMaterial,
    ),
    tube(
      [
        new THREE.Vector3(0.1, 0.42, 0),
        new THREE.Vector3(0.22, 0.76, -0.04),
        new THREE.Vector3(0.46, 1.1, -0.08),
        new THREE.Vector3(0.35, 1.46, 0.04),
      ],
      0.018,
      flagellaMaterial,
    ),
  );

  mini.scale.setScalar(0.72 + (seed % 3) * 0.05);
  mini.rotation.y = seed * 1.37;
  return mini;
}

function createHelix() {
  const group = new THREE.Group();
  const blue = new THREE.MeshToonMaterial({ color: 0x66d7ef });
  const pink = new THREE.MeshToonMaterial({ color: 0xf36e9b });
  const rung = new THREE.LineBasicMaterial({ color: 0xf8d968 });
  const sideA: THREE.Vector3[] = [];
  const sideB: THREE.Vector3[] = [];

  for (let i = 0; i < 36; i += 1) {
    const y = i * 0.18;
    const angle = i * 0.52;
    sideA.push(new THREE.Vector3(Math.cos(angle) * 0.75, y, Math.sin(angle) * 0.75));
    sideB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * 0.75, y, Math.sin(angle + Math.PI) * 0.75));
    if (i % 3 === 0) {
      group.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints([sideA[i], sideB[i]]), rung),
      );
    }
  }

  group.add(tube(sideA, 0.1, blue), tube(sideB, 0.1, pink));
  group.position.y = 0.2;
  return group;
}

function createPhotobioreactorStation() {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshToonMaterial({ color: 0x0b3a34 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcaf9e9,
    transparent: true,
    opacity: 0.34,
    roughness: 0.1,
    transmission: 0.28,
  });
  const cultureMaterial = new THREE.MeshToonMaterial({ color: 0x82c94a, transparent: true, opacity: 0.78 });

  [-1.65, 0, 1.65].forEach((x, index) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 3.7, 24), glassMaterial);
    tank.position.set(x, 2.05, 0);
    tank.castShadow = true;
    group.add(tank);
    const culture = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 2.75, 24), cultureMaterial);
    culture.position.set(x, 1.6, 0);
    group.add(culture);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.18, 20), frameMaterial);
    cap.position.set(x, 4, 0);
    group.add(cap);
    const bubbleMaterial = new THREE.MeshBasicMaterial({ color: 0xf7f1df });
    for (let bubbleIndex = 0; bubbleIndex < 4; bubbleIndex += 1) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bubbleMaterial);
      bubble.position.set(
        x + Math.sin(index * 4 + bubbleIndex) * 0.28,
        0.65 + bubbleIndex * 0.68,
        0.42,
      );
      group.add(bubble);
    }
  });

  const pipe = tube(
    [
      new THREE.Vector3(-1.65, 4.05, 0),
      new THREE.Vector3(-1.65, 4.55, 0),
      new THREE.Vector3(1.65, 4.55, 0),
      new THREE.Vector3(1.65, 4.05, 0),
    ],
    0.1,
    frameMaterial,
  );
  group.add(pipe);
  return group;
}

function createLightArray() {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshToonMaterial({ color: 0x173f3a });
  const lightColors = [0xff8b72, 0x7de2ff, 0xf8cb54, 0xc4a8ff];
  lightColors.forEach((color, index) => {
    const x = (index - 1.5) * 1.55;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.2, 10), postMaterial);
    post.position.set(x, 1.6, 0.4);
    group.add(post);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 1.75, 0.16),
      new THREE.MeshBasicMaterial({ color }),
    );
    panel.position.set(x, 3.15, 0);
    panel.rotation.x = -0.18;
    panel.rotation.z = (index - 1.5) * 0.05;
    group.add(panel);
  });
  return group;
}

function createWetLabBench() {
  const group = new THREE.Group();
  const benchMaterial = new THREE.MeshToonMaterial({ color: 0x17463e });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcaf9e9,
    transparent: true,
    opacity: 0.4,
    roughness: 0.12,
  });
  const liquidColors = [0x83ca4a, 0xf8cb54, 0xff8b72];

  const top = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.3, 2.6), benchMaterial);
  top.position.y = 2.05;
  top.castShadow = true;
  group.add(top);
  [-2.35, 2.35].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2, 2.1), benchMaterial);
    leg.position.set(x, 1, 0);
    group.add(leg);
  });

  [-1.6, 0, 1.6].forEach((x, index) => {
    const flask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.62, 1.35, 18),
      glassMaterial,
    );
    flask.position.set(x, 2.85, 0);
    group.add(flask);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.75, 14), glassMaterial);
    neck.position.set(x, 3.78, 0);
    group.add(neck);
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.53, 0.24, 16),
      new THREE.MeshToonMaterial({ color: liquidColors[index], transparent: true, opacity: 0.85 }),
    );
    liquid.position.set(x, 2.38, 0);
    group.add(liquid);
  });
  return group;
}

function createCarotenoidHub() {
  const group = new THREE.Group();
  const hubPosition = new THREE.Vector3(0, 2.8, 0);
  const hub = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 1),
    new THREE.MeshToonMaterial({ color: 0xf39a2d }),
  );
  hub.position.copy(hubPosition);
  hub.castShadow = true;
  group.add(hub);

  const branchColors = [0xffbe38, 0xe85b48, 0xe6c83c, 0xee7790];
  branchColors.forEach((color, index) => {
    const angle = (index / branchColors.length) * Math.PI * 2;
    const end = new THREE.Vector3(Math.cos(angle) * 2.5, 1.2 + (index % 2) * 1.1, Math.sin(angle) * 2.5);
    group.add(tube([hubPosition, hubPosition.clone().lerp(end, 0.52), end], 0.09, new THREE.MeshToonMaterial({ color })));
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.58, 0),
      new THREE.MeshToonMaterial({ color }),
    );
    node.position.copy(end);
    node.castShadow = true;
    group.add(node);
  });
  return group;
}

function createProductDepot() {
  const group = new THREE.Group();
  const colors = [0xf7a52d, 0xe65c42, 0xe9c43a, 0xed7688];
  colors.forEach((color, index) => {
    const x = (index - 1.5) * 1.45;
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.68, 2.4 + (index % 2) * 0.55, 16),
      new THREE.MeshToonMaterial({ color }),
    );
    tank.position.set(x, 1.25 + (index % 2) * 0.28, 0);
    tank.castShadow = true;
    group.add(tank);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 0.55, 16),
      new THREE.MeshToonMaterial({ color: 0x173f3a }),
    );
    cap.position.set(x, 2.72 + (index % 2) * 0.55, 0);
    group.add(cap);
  });
  return group;
}

function createSustainabilityStation() {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshToonMaterial({ color: 0x17463e });
  const solarMaterial = new THREE.MeshToonMaterial({ color: 0x386a78 });

  [-1.8, 0, 1.8].forEach((x) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 2.25), solarMaterial);
    panel.position.set(x, 1.55, 0);
    panel.rotation.x = -0.42;
    panel.castShadow = true;
    group.add(panel);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.45, 10), frameMaterial);
    post.position.set(x, 0.75, 0.3);
    group.add(post);
  });

  const waterLoop = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.16, 10, 36),
    new THREE.MeshToonMaterial({ color: 0x7de2ff }),
  );
  waterLoop.position.set(0, 2.35, -2.15);
  waterLoop.rotation.y = Math.PI / 2;
  group.add(waterLoop);
  return group;
}

function addProp(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  t: number,
  offset: number,
  object: THREE.Object3D,
  scale = 1,
) {
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(offset);
  object.position.copy(point).add(side);
  object.position.y = 0.12;
  object.scale.multiplyScalar(scale);
  scene.add(object);
}

// The scene is rebuilt from scratch on every mount, so a client-side route
// change away from "/" and back would otherwise leak every geometry, material
// and texture on the GPU. Release them when the world unmounts.
function releaseSceneResources(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (!material) return;
    for (const entry of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(entry)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      entry.dispose();
    }
  });
}

function WikiTerminal({ ready }: { ready: boolean }) {
  const [activeKey, setActiveKey] = useState(panelGroups[0].key);
  const activeGroup = panelGroups.find((group) => group.key === activeKey) ?? panelGroups[0];

  return (
    <section className="wiki-terminal" inert={!ready} aria-label="DunaTerp Wiki navigation panel">
      <nav className="terminal-tabs" aria-label="Wiki sections">
        {panelGroups.map((group) => (
          <button
            key={group.key}
            type="button"
            className={group.key === activeKey ? "is-active" : ""}
            onClick={() => setActiveKey(group.key)}
            aria-pressed={group.key === activeKey}
          >
            <span>{group.short}</span>
            {group.label}
          </button>
        ))}
      </nav>

      <div className="terminal-shell" style={{ "--panel-accent": activeGroup.accent } as CSSProperties}>
        <div className="terminal-preview" aria-hidden="true">
          <div className="terminal-code">DUNA / {activeGroup.index}</div>
          <div className="terminal-cell">
            <i />
            <i />
            <span />
          </div>
          <p>{activeGroup.index} — FIELD</p>
          <h2>{activeGroup.label}</h2>
          <p>{activeGroup.summary}</p>
        </div>

        <div className="terminal-content">
          <header>
            <div>
              <p>SCU–CHINA · iGEM 2026</p>
              <h3>{activeGroup.label}</h3>
            </div>
            <Link to="/wiki-map">All pages ↗</Link>
          </header>
          <nav className="terminal-links" aria-label={`${activeGroup.label} pages`}>
            {activeGroup.links.map((item, index) => (
              <Link key={`${activeGroup.key}-${item.label}`} to={item.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </nav>
          <footer>
            <span>DOCUMENTED · REPRODUCIBLE · REUSABLE</span>
            <span>{activeGroup.index} / {String(panelGroups.length).padStart(2, "0")}</span>
          </footer>
        </div>
      </div>
    </section>
  );
}

export function DunaWorld({ Header }: { Header: ComponentType<HeaderProps> }) {
  const journey = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const routeBar = useRef<HTMLDivElement>(null);
  // The animation loop advances a continuous scroll value every frame; React
  // only needs the four journey milestones, so it re-renders at most four times
  // across the whole drive instead of ten times per second.
  const stageRef = useRef(0);
  const [stage, setStage] = useState(0);
  const [quality, setQuality] = useState<"webgl" | "fallback">("webgl");
  const [openingComplete, setOpeningComplete] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || window.sessionStorage.getItem("dunaterp-opening-v3") === "seen";
    } catch {
      return false;
    }
  });
  const openingCompleteRef = useRef(openingComplete);
  const driveStartedAt = useRef<number | null>(null);

  const finishOpening = useCallback(() => {
    if (openingCompleteRef.current) return;
    openingCompleteRef.current = true;
    driveStartedAt.current = performance.now();
    try {
      window.sessionStorage.setItem("dunaterp-opening-v3", "seen");
    } catch {
      // The opening still works when session storage is unavailable.
    }
    setOpeningComplete(true);
  }, []);

  useEffect(() => {
    if (openingCompleteRef.current && driveStartedAt.current === null) {
      driveStartedAt.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (openingCompleteRef.current) return;
    const timeout = window.setTimeout(finishOpening, 4300);
    return () => window.clearTimeout(timeout);
  }, [finishOpening]);

  useEffect(() => {
    if (!mount.current || !journey.current) return;
    const host = mount.current;
    const root = journey.current;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => setQuality("fallback"));
      return;
    }

    const updatePixelRatio = () => {
      const cap = window.innerWidth < 800 ? 1 : 1.35;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    };
    updatePixelRatio();
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "duna-canvas";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fd0d2);
    scene.fog = new THREE.Fog(0x8fd0d2, 35, 78);

    const camera = new THREE.PerspectiveCamera(
      48,
      host.clientWidth / Math.max(1, host.clientHeight),
      0.1,
      180,
    );
    camera.position.set(10, 9, 14);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xe7fbff, 0x304a35, 2.3));
    const sun = new THREE.DirectionalLight(0xfff1ca, 4);
    sun.position.set(-18, 25, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    // The terrain and every prop are static; only the vehicle moves. Drive the
    // shadow map manually at half the frame rate rather than re-rendering the
    // whole depth pass every frame.
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshToonMaterial({ color: 0xe9e1c7 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-18, 0, 18),
        new THREE.Vector3(-15, 0, 7),
        new THREE.Vector3(-5, 0, 12),
        new THREE.Vector3(5, 0, 5),
        new THREE.Vector3(15, 0, 10),
        new THREE.Vector3(20, 0, -2),
        new THREE.Vector3(10, 0, -11),
        new THREE.Vector3(-2, 0, -6),
        new THREE.Vector3(-14, 0, -14),
        new THREE.Vector3(-7, 0, -28),
        new THREE.Vector3(8, 0, -25),
        new THREE.Vector3(20, 0, -36),
      ],
      false,
      "catmullrom",
      0.45,
    );

    const road = new THREE.Mesh(
      makeRoad(curve, 3.7),
      new THREE.MeshToonMaterial({ color: 0x17463e }),
    );
    road.receiveShadow = true;
    scene.add(road);

    // Props are scattered on a grid, but the route sweeps from x=-18 to x=20,
    // so a grid cell can land on the tarmac. Measure against the route itself
    // rather than against a fixed corridor.
    const roadSamples = curve.getSpacedPoints(240);
    const distanceToRoad = (x: number, z: number) => {
      let nearest = Number.POSITIVE_INFINITY;
      for (const sample of roadSamples) {
        const dx = sample.x - x;
        const dz = sample.z - z;
        const squared = dx * dx + dz * dz;
        if (squared < nearest) nearest = squared;
      }
      return Math.sqrt(nearest);
    };
    const ROAD_CLEARANCE = 3.6;

    const dashMaterial = new THREE.MeshToonMaterial({ color: 0xf5da61 });
    for (let i = 2; i < 130; i += 4) {
      const t = i / 132;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.75), dashMaterial);
      dash.position.copy(point);
      dash.position.y = 0.13;
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
      scene.add(dash);
    }

    const poolMaterial = new THREE.MeshToonMaterial({ color: 0xe7a3a8, transparent: true, opacity: 0.82 });
    [
      [-24, 9, 7, 4],
      [-2, 22, 8, 3],
      [25, 19, 9, 4],
      [28, -17, 7, 3],
      [-25, -31, 10, 5],
      [4, -41, 8, 3],
    ].forEach(([x, z, sx, sz]) => {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), poolMaterial);
      pool.rotation.x = -Math.PI / 2;
      pool.scale.set(sx, sz, 1);
      pool.position.set(x, 0.025, z);
      scene.add(pool);
    });

    const saltMaterial = new THREE.MeshToonMaterial({ color: 0xfff8df });
    for (let i = 0; i < 44; i += 1) {
      const radius = 0.45 + (i % 5) * 0.17;
      const x = ((i * 37) % 93) - 46;
      const z = ((i * 61) % 97) - 48;
      if (distanceToRoad(x, z) < ROAD_CLEARANCE + radius) continue;
      const crystal = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), saltMaterial);
      crystal.scale.y = 0.22;
      crystal.position.set(x, 0.1, z);
      crystal.rotation.y = i * 0.71;
      crystal.castShadow = true;
      scene.add(crystal);
    }

    const vehicle = createVehicle();
    scene.add(vehicle);

    const landingPoint = curve.getPointAt(0.001);
    const landingRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xcaff61,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const landingRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.82, 36),
      landingRingMaterial,
    );
    landingRing.rotation.x = -Math.PI / 2;
    landingRing.position.copy(landingPoint);
    landingRing.position.y = 0.16;
    landingRing.visible = false;
    scene.add(landingRing);

    const miniAlgae: Array<{
      object: THREE.Group;
      home: THREE.Vector3;
    }> = [];
    const algaeClusterPoints = [0.13, 0.34, 0.51, 0.68, 0.83];
    let miniIndex = 0;
    algaeClusterPoints.forEach((clusterT, clusterIndex) => {
      for (let itemIndex = 0; itemIndex < 4; itemIndex += 1) {
        const t = clusterT + (itemIndex - 1.5) * 0.006;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
        // Every roadside mini cell now occupies the driveable strip and is
        // registered with Rapier below, so collision behaviour is consistent.
        const laneOffsets = [-1.16, -0.38, 0.4, 1.14];
        const offset = laneOffsets[itemIndex]
          + Math.sin((miniIndex + 1) * 3.17) * 0.05;
        const object = createMiniDunaliella(miniIndex);
        object.position.copy(point).addScaledVector(side, offset);
        object.position.y = 0.52;
        object.rotation.y = Math.atan2(tangent.x, tangent.z) + clusterIndex * 0.45;
        scene.add(object);
        miniAlgae.push({
          object,
          home: object.position.clone(),
        });
        miniIndex += 1;
      }
    });

    // Folio 2025's landing letters are individual extruded meshes registered
    // as sleeping 0.2-mass cuboids. DUNATERP follows that object structure,
    // with a locally generated word and one shared project color.
    const startWordmark = createRouteWordmark();
    const wordmarkT = 0.03;
    addProp(scene, curve, wordmarkT, -5.1, startWordmark, 0.62);
    startWordmark.position.y = 0.02;
    const wordmarkApproach = curve.getPointAt(0.001);
    startWordmark.rotation.y = Math.atan2(
      wordmarkApproach.x - startWordmark.position.x,
      wordmarkApproach.z - startWordmark.position.z,
    );
    scene.updateMatrixWorld(true);
    const wordmarkInputs = (
      startWordmark.userData.letterMeshes as Array<THREE.Mesh<TextGeometry, THREE.MeshToonMaterial>>
    ).map((mesh): RoutePhysicsInput => {
      const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
      scene.attach(mesh);
      return {
        object: mesh,
        home: mesh.position.clone(),
        kind: "letter",
        collider: {
          type: "cuboid",
          halfExtents: [size.x * 0.49, size.y * 0.49, size.z * 0.49],
        },
        mass: 0.2,
        friction: 0.7,
        restitution: 0.22,
        linearDamping: 0.82,
        angularDamping: 0.62,
        ccd: true,
        sleeping: true,
        eventThreshold: 5,
      };
    });
    scene.remove(startWordmark);

    const physicsStart = curve.getPointAt(0.001);
    const physicsStartTangent = curve.getTangentAt(0.001).normalize();
    let routePhysics: RoutePhysics | null = null;
    let physicsCancelled = false;
    const physicsInputs: RoutePhysicsInput[] = [
      ...miniAlgae.map((actor): RoutePhysicsInput => ({
        object: actor.object,
        home: actor.home,
        kind: "algae",
        collider: { type: "ball", radius: 0.48 },
      })),
      ...wordmarkInputs,
    ];
    // Rapier ships the physics engine as an inlined WebAssembly payload; keeping
    // it out of the main world chunk and loading it here means the scene paints
    // before the ~megabyte module is fetched and compiled.
    void import("./route-physics")
      .then((module) => module.RoutePhysics.create(
        physicsStart,
        Math.atan2(physicsStartTangent.x, physicsStartTangent.z),
        physicsInputs,
      ))
      .then((physics) => {
        if (physicsCancelled) physics.dispose();
        else routePhysics = physics;
      });
    const miniAlgaeIndexes = new Map<THREE.Object3D, number>(
      miniAlgae.map((actor, index) => [actor.object, index]),
    );

    const impactBursts: Array<{
      mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
      life: number;
    }> = [];
    const impactParticles: Array<{
      mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
      velocity: THREE.Vector3;
      life: number;
    }> = [];
    const impactBurstGeometry = new THREE.RingGeometry(0.18, 0.34, 18);
    const impactParticleGeometry = new THREE.IcosahedronGeometry(0.11, 0);
    let collisionFeedback = 0;
    let collisionSide = 0;

    const scenicFeatures = [
      { t: 0.16, offset: 13, object: createPhotobioreactorStation(), scale: 0.72, turn: -0.1 },
      { t: 0.345, offset: 13.8, object: createLightArray(), scale: 0.74, turn: -0.12 },
      { t: 0.49, offset: 12.9, object: createWetLabBench(), scale: 0.71, turn: -0.1 },
      { t: 0.665, offset: -13.1, object: createCarotenoidHub(), scale: 0.74, turn: 0.12 },
      { t: 0.815, offset: -13, object: createProductDepot(), scale: 0.76, turn: -0.1 },
      { t: 0.935, offset: 13.3, object: createSustainabilityStation(), scale: 0.74, turn: 0.12 },
    ];
    scenicFeatures.forEach((feature) => {
      addProp(scene, curve, feature.t, feature.offset, feature.object, feature.scale);
      const featureTangent = curve.getTangentAt(feature.t).normalize();
      feature.object.rotation.y = Math.atan2(featureTangent.x, featureTangent.z)
        + Math.PI
        + feature.turn;
    });

    const cell = createDunaliella();
    addProp(scene, curve, 0.25, -8.4, cell, 0.95);
    cell.position.y = 2.7;

    const helix = createHelix();
    addProp(scene, curve, 0.42, 6, helix, 0.78);

    const network = new THREE.Group();
    const nodeMaterial = new THREE.MeshToonMaterial({ color: 0xf5cd54 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x274d45 });
    const nodePositions = [
      new THREE.Vector3(0, 4, 0),
      new THREE.Vector3(-2, 2, 1),
      new THREE.Vector3(2, 2, -1),
      new THREE.Vector3(-2.7, 0, -1.5),
      new THREE.Vector3(0, 0, 1.8),
      new THREE.Vector3(2.8, 0, 0.2),
    ];
    nodePositions.forEach((position, index) => {
      const node = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5 + (index === 0 ? 0.2 : 0), 1),
        nodeMaterial,
      );
      node.position.copy(position);
      network.add(node);
      if (index) {
        network.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              nodePositions[Math.max(0, Math.floor((index - 1) / 2))],
              position,
            ]),
            edgeMaterial,
          ),
        );
      }
    });
    addProp(scene, curve, 0.59, -6.5, network, 0.9);

    const products = new THREE.Group();
    [
      [0xf7a52d, "β-I"],
      [0xe65c42, "AST"],
      [0xe9c43a, "CRO"],
      [0xed7688, "β-CIT"],
    ].forEach(([color, label], index) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.8, 2.2 + index * 0.5, 8),
        new THREE.MeshToonMaterial({ color: color as number }),
      );
      tower.position.set((index - 1.5) * 1.7, 1.1 + index * 0.25, 0);
      tower.castShadow = true;
      products.add(tower);
      const sprite = textSprite(label as string, "#fff1c8", 0.28);
      sprite.position.set((index - 1.5) * 1.7, 3 + index * 0.5, 0);
      products.add(sprite);
    });
    addProp(scene, curve, 0.75, 6.7, products, 0.85);

    const compass = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.18, 10, 36),
      new THREE.MeshToonMaterial({ color: 0xb9a4f2 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.2;
    compass.add(ring);
    for (let i = 0; i < 4; i += 1) {
      const person = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.7, 5, 10),
        new THREE.MeshToonMaterial({ color: [0xf07849, 0x72cbd4, 0xf2cb5b, 0xc5a4ef][i] }),
      );
      person.position.set(Math.cos((i * Math.PI) / 2) * 2, 1.1, Math.sin((i * Math.PI) / 2) * 2);
      compass.add(person);
    }
    addProp(scene, curve, 0.88, -6, compass, 0.8);

    const terminal = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 5.8, 0.72),
      new THREE.MeshToonMaterial({ color: 0x0a2925 }),
    );
    frame.position.y = 3.35;
    frame.castShadow = true;
    terminal.add(frame);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(8.05, 4.65),
      new THREE.MeshBasicMaterial({ map: createTerminalScreenTexture() }),
    );
    screen.position.set(0, 3.35, 0.38);
    terminal.add(screen);
    const gateMaterial = new THREE.MeshToonMaterial({ color: 0xf26a21 });
    const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xcaff61 });
    [-5.1, 5.1].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 7.6, 12), gateMaterial);
      pillar.position.set(x, 3.65, -0.18);
      pillar.castShadow = true;
      terminal.add(pillar);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 12), beaconMaterial);
      beacon.position.set(x, 7.55, -0.18);
      terminal.add(beacon);
    });
    const gateTop = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.42, 0.45), gateMaterial);
    gateTop.position.set(0, 7.2, -0.18);
    gateTop.castShadow = true;
    terminal.add(gateTop);
    const terminalTangent = curve.getTangentAt(0.985).normalize();
    terminal.rotation.y = Math.atan2(terminalTangent.x, terminalTangent.z) + Math.PI;
    addProp(scene, curve, 0.985, 0, terminal, 1);

    // A damped spring preserves wheel/trackpad momentum without the abrupt
    // start-stop motion caused by catching every scroll notch at fixed speed.
    const MAX_FOLLOW_SPEED = 0.48;
    const FOLLOW_STIFFNESS = 70;
    const FOLLOW_DAMPING = 15;
    let targetProgress = 0.001;
    let currentProgress = 0.001;
    let currentProgressVelocity = 0;
    let hasLeftStart = false;
    let disposed = false;
    let frameCount = 0;
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const desiredCameraTarget = new THREE.Vector3();
    const desiredCameraPosition = new THREE.Vector3();
    const travelTarget = new THREE.Vector3();
    const travelCamera = new THREE.Vector3();
    const cameraImpactOffset = new THREE.Vector3();
    const vehicleGroundPosition = new THREE.Vector3();
    let cameraRoll = 0;
    let cameraRollVelocity = 0;
    const terminalTarget = terminal.position.clone().add(new THREE.Vector3(0, 3.35, 0));
    const terminalCamera = terminal.position
      .clone()
      .addScaledVector(terminalTangent, -12)
      .add(new THREE.Vector3(0, 5.4, 0));
    const clock = new THREE.Clock();

    const startPoint = curve.getPointAt(0.001);
    const startTangent = curve.getTangentAt(0.001).normalize();
    camera.position
      .copy(startPoint)
      .addScaledVector(startTangent, -8.8)
      .add(new THREE.Vector3(0, 5.8, 0));
    camera.lookAt(
      startPoint
        .clone()
        .addScaledVector(startTangent, 4.2)
        .add(new THREE.Vector3(0, 0.8, 0)),
    );
    cameraPosition.copy(camera.position);
    cameraTarget
      .copy(startPoint)
      .addScaledVector(startTangent, 4.2)
      .add(new THREE.Vector3(0, 0.8, 0));

    const updateScrollProgress = () => {
      const rootTop = root.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, root.offsetHeight - window.innerHeight);
      targetProgress = THREE.MathUtils.clamp((window.scrollY - rootTop) / travel, 0.001, 0.995);
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      updatePixelRatio();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      updateScrollProgress();
    };

    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", resize);
    resize();

    const animate = () => {
      if (disposed) return;
      requestAnimationFrame(animate);
      // A backgrounded tab still fires rAF on some platforms; skip the physics
      // step and the WebGL draw until it is visible again. The clamped delta
      // below absorbs the long gap on the first frame back.
      if (document.hidden) return;
      const delta = Math.min(clock.getDelta(), 0.04);
      const remaining = targetProgress - currentProgress;
      currentProgressVelocity += (
        remaining * FOLLOW_STIFFNESS
        - currentProgressVelocity * FOLLOW_DAMPING
      ) * delta;
      currentProgressVelocity = THREE.MathUtils.clamp(
        currentProgressVelocity,
        -MAX_FOLLOW_SPEED,
        MAX_FOLLOW_SPEED,
      );
      const nextProgress = currentProgress + currentProgressVelocity * delta;
      if (
        Math.sign(targetProgress - nextProgress) !== Math.sign(remaining)
        && Math.abs(remaining) < 0.004
      ) {
        currentProgress = targetProgress;
        currentProgressVelocity = 0;
      } else {
        currentProgress = THREE.MathUtils.clamp(nextProgress, 0.001, 0.995);
      }
      const progressVelocity = currentProgressVelocity;
      const livePanelProgress = THREE.MathUtils.clamp(
        (currentProgress - 0.958) / 0.034,
        0,
        1,
      );
      root.style.setProperty("--journey-progress", currentProgress.toFixed(5));
      root.style.setProperty("--panel-progress", livePanelProgress.toFixed(5));
      const point = curve.getPointAt(currentProgress);
      const tangent = curve.getTangentAt(currentProgress).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const routeSway = Math.sin(currentProgress * Math.PI * 7) * 0.12;
      vehicleGroundPosition.copy(point).addScaledVector(side, routeSway);
      vehicle.position.copy(vehicleGroundPosition);

      const driveStart = driveStartedAt.current;
      const introTime = driveStart === null
        ? 0
        : Math.max(0, (performance.now() - driveStart) / 1000);
      let dropHeight = 0;
      if (introTime < 0.78) {
        const dropProgress = introTime / 0.78;
        dropHeight = 11 * (1 - dropProgress * dropProgress);
      } else if (introTime < 2.1) {
        const bounceTime = introTime - 0.78;
        dropHeight = Math.abs(Math.sin(bounceTime * 7.6)) * 2.35 * Math.exp(-bounceTime * 2.45);
      }
      vehicle.position.y = 0.12 + dropHeight;
      vehicle.rotation.y = Math.atan2(tangent.x, tangent.z);
      vehicle.rotation.x = -0.22 * Math.exp(-introTime * 1.7) * Math.cos(introTime * 5.5);
      vehicle.rotation.z = Math.sin(currentProgress * Math.PI * 14) * -0.035
        + 0.18 * Math.exp(-introTime * 1.8) * Math.sin(introTime * 6.4);

      const landingLife = (introTime - 0.7) / 1.05;
      landingRing.visible = landingLife >= 0 && landingLife <= 1;
      if (landingRing.visible) {
        const landingScale = 1 + landingLife * 5.2;
        landingRing.scale.setScalar(landingScale);
        landingRingMaterial.opacity = (1 - landingLife) * 0.82;
      }

      if (currentProgress > 0.04) hasLeftStart = true;
      if (routePhysics && hasLeftStart && currentProgress < 0.025) {
        routePhysics.resetAll();
        hasLeftStart = false;
      }

      let physicsImpacts: ReturnType<RoutePhysics["step"]> = [];
      if (routePhysics) {
        routePhysics.moveVehicle(
          vehicleGroundPosition,
          Math.atan2(tangent.x, tangent.z),
          dropHeight,
        );
        physicsImpacts = routePhysics.step(delta);
      }

      physicsImpacts.forEach((impact, impactOrder) => {
        const actorIndex = miniAlgaeIndexes.get(impact.actor.object) ?? 0;
        const separation = impact.position.clone().sub(vehicleGroundPosition);
        separation.y = 0;
        const hitSide = Math.sign(separation.dot(side)) || (actorIndex % 2 === 0 ? -1 : 1);
        const pushDirection = separation.lengthSq() > 0.001
          ? separation.normalize()
          : side.clone().multiplyScalar(hitSide);
        const forceRatio = THREE.MathUtils.clamp(impact.force / 120, 0.7, 1.3);

        collisionFeedback = Math.min(
          1.35,
          Math.max(collisionFeedback, 0.82 + forceRatio * 0.22),
        );
        collisionSide = THREE.MathUtils.clamp(
          collisionSide * 0.35 + hitSide * forceRatio,
          -1,
          1,
        );
        // Folio 2025 View.js uses a damped roll spring with collision kicks.
        cameraRollVelocity += hitSide * forceRatio * 0.9;

        // Four nearby cells can contact in the same frame. Their rigid-body
        // response remains individual, while VFX are capped to avoid a burst
        // of short-lived geometries and draw calls stalling that frame.
        if (impactOrder >= 2) return;

        const burstMaterial = new THREE.MeshBasicMaterial({
          color: actorIndex % 2 === 0 ? 0xcaff61 : 0xff9b42,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const burst = new THREE.Mesh(impactBurstGeometry, burstMaterial);
        burst.position.copy(impact.position);
        burst.position.y += 0.18;
        burst.renderOrder = 4;
        scene.add(burst);
        impactBursts.push({ mesh: burst, life: 0 });

        for (let particleIndex = 0; particleIndex < 4; particleIndex += 1) {
          const angle = (particleIndex / 4) * Math.PI * 2 + actorIndex * 0.41;
          const particle = new THREE.Mesh(
            impactParticleGeometry,
            new THREE.MeshBasicMaterial({
              color: particleIndex % 2 === 0 ? 0xcaff61 : 0xff9b42,
              transparent: true,
              opacity: 1,
              depthWrite: false,
            }),
          );
          particle.position.copy(impact.position);
          particle.scale.setScalar((0.09 + (particleIndex % 3) * 0.025) / 0.11);
          particle.renderOrder = 3;
          scene.add(particle);
          impactParticles.push({
            mesh: particle,
            velocity: pushDirection
              .clone()
              .multiplyScalar((1.7 + (particleIndex % 3) * 0.35) * forceRatio)
              .addScaledVector(side, Math.cos(angle) * 1.8)
              .addScaledVector(tangent, Math.sin(angle) * 1.15)
              .add(new THREE.Vector3(0, 2.2 + (particleIndex % 4) * 0.42, 0)),
            life: 0,
          });
        }
      });

      const impactPulse = Math.min(1.2, collisionFeedback);
      if (impactPulse > 0.002) {
        vehicle.position
          .addScaledVector(tangent, -impactPulse * 0.32)
          .addScaledVector(side, -collisionSide * impactPulse * 0.14);
        vehicle.position.y += Math.abs(Math.sin(introTime * 48)) * impactPulse * 0.13;
        vehicle.rotation.x += impactPulse * 0.085;
        vehicle.rotation.z += collisionSide * impactPulse * 0.17;
      }

      for (let burstIndex = impactBursts.length - 1; burstIndex >= 0; burstIndex -= 1) {
        const burst = impactBursts[burstIndex];
        burst.life += delta;
        const burstProgress = burst.life / 0.62;
        burst.mesh.quaternion.copy(camera.quaternion);
        burst.mesh.scale.setScalar(1 + burstProgress * 5.5);
        burst.mesh.material.opacity = Math.max(0, 1 - burstProgress) * 0.9;
        if (burstProgress >= 1) {
          scene.remove(burst.mesh);
          burst.mesh.material.dispose();
          impactBursts.splice(burstIndex, 1);
        }
      }

      for (let particleIndex = impactParticles.length - 1; particleIndex >= 0; particleIndex -= 1) {
        const particle = impactParticles[particleIndex];
        particle.life += delta;
        const particleProgress = particle.life / 0.7;
        particle.velocity.y -= 7.8 * delta;
        particle.mesh.position.addScaledVector(particle.velocity, delta);
        particle.mesh.rotation.x += delta * 9;
        particle.mesh.rotation.y += delta * 12;
        particle.mesh.scale.setScalar(Math.max(0.01, 1 - particleProgress * 0.72));
        particle.mesh.material.opacity = Math.max(0, 1 - particleProgress);
        if (particleProgress >= 1) {
          scene.remove(particle.mesh);
          particle.mesh.material.dispose();
          impactParticles.splice(particleIndex, 1);
        }
      }

      const arriving = THREE.MathUtils.smoothstep(currentProgress, 0.9, 0.995);
      const shotPhase = currentProgress * Math.PI * 4;
      const speedRatio = THREE.MathUtils.clamp(
        Math.abs(progressVelocity) / MAX_FOLLOW_SPEED,
        0,
        1,
      );
      const sideOffset = Math.sin(shotPhase * 0.82) * 0.72;
      const cameraHeight = 5.5 + Math.cos(shotPhase * 0.72) * 0.45 + speedRatio * 0.2;
      const cameraTrail = 8.8 + Math.sin(shotPhase * 0.55) * 0.45 + speedRatio * 1.15;
      const cellReveal = THREE.MathUtils.smoothstep(currentProgress, 0.17, 0.23)
        * (1 - THREE.MathUtils.smoothstep(currentProgress, 0.3, 0.36));
      travelTarget
        .copy(vehicleGroundPosition)
        .addScaledVector(tangent, 4.2)
        .add(new THREE.Vector3(0, 0.75 + dropHeight * 0.28, 0));
      travelTarget.lerp(cell.position, cellReveal * 0.3);
      travelCamera
        .copy(vehicleGroundPosition)
        .addScaledVector(tangent, -cameraTrail)
        .addScaledVector(side, sideOffset)
        .add(new THREE.Vector3(0, cameraHeight, 0));
      desiredCameraTarget.lerpVectors(travelTarget, terminalTarget, arriving);
      desiredCameraPosition.lerpVectors(travelCamera, terminalCamera, arriving);
      // Delta-aware focus and position easing follows Folio 2025's smoothed
      // focus-point pattern while keeping the camera behind the route vehicle.
      cameraTarget.lerp(desiredCameraTarget, 1 - Math.exp(-8.5 * delta));
      cameraPosition.lerp(desiredCameraPosition, 1 - Math.exp(-5.2 * delta));
      camera.position.copy(cameraPosition);
      cameraImpactOffset.set(
        Math.sin(introTime * 91) * impactPulse * impactPulse * 0.2,
        Math.cos(introTime * 73) * impactPulse * impactPulse * 0.13,
        Math.sin(introTime * 61) * impactPulse * impactPulse * 0.11,
      );
      camera.position
        .addScaledVector(side, cameraImpactOffset.x)
        .addScaledVector(tangent, cameraImpactOffset.z);
      camera.position.y += cameraImpactOffset.y;
      camera.fov = THREE.MathUtils.lerp(48 + speedRatio * 2.2, 40, arriving) + impactPulse * 3.2;
      camera.updateProjectionMatrix();
      camera.lookAt(cameraTarget);
      cameraRollVelocity += (-cameraRoll * 100 - cameraRollVelocity * 11) * delta;
      cameraRoll += cameraRollVelocity * delta;
      camera.rotation.z += cameraRoll;

      cell.rotation.y += delta * 0.28;
      helix.rotation.y += delta * 0.42;
      network.rotation.y -= delta * 0.18;
      products.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.12;
      collisionFeedback *= Math.exp(-8.2 * delta);
      collisionSide *= Math.exp(-6.4 * delta);

      frameCount += 1;
      const nextStage = currentProgress > 0.982
        ? 3
        : currentProgress > 0.9
          ? 2
          : currentProgress > 0.025
            ? 1
            : 0;
      if (nextStage !== stageRef.current) {
        stageRef.current = nextStage;
        setStage(nextStage);
      }
      if (frameCount % 12 === 0) {
        routeBar.current?.setAttribute("aria-valuenow", String(Math.round(currentProgress * 100)));
      }
      if (frameCount % 2 === 0) sun.shadow.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      physicsCancelled = true;
      routePhysics?.dispose();
      impactBurstGeometry.dispose();
      impactParticleGeometry.dispose();
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", resize);
      releaseSceneResources(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (quality === "fallback") {
    return (
      <main id="main-content" tabIndex={-1} className="webgl-fallback">
        <Header />
        <h1>Interactive world unavailable</h1>
        <p>This device cannot start WebGL. The complete Wiki remains available through the standard page map.</p>
        <Link to="/wiki-map">Open Wiki map</Link>
      </main>
    );
  }

  const beginJourney = () => {
    const top = journey.current?.offsetTop ?? 0;
    window.scrollTo({ top: top + window.innerHeight * 0.92, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      ref={journey}
      className={`duna-world${openingComplete ? " is-opening-complete" : ""}${stage >= 1 ? " is-started" : ""}${stage >= 2 ? " is-arriving" : ""}${stage >= 3 ? " is-panel-ready" : ""}`}
    >
      {!openingComplete && (
        <div className="duna-opening" role="status" aria-label="DunaTerp opening sequence">
          <div className="duna-opening-mark" aria-hidden="true">
            <span className="duna-opening-chloroplast" />
            <span className="duna-opening-pyrenoid" />
            <span className="duna-opening-eyespot" />
            <i className="duna-opening-flagellum duna-opening-flagellum--left" />
            <i className="duna-opening-flagellum duna-opening-flagellum--right" />
          </div>
          <p className="duna-opening-word duna-opening-word--one">One salt-adapted cell.</p>
          <p className="duna-opening-word duna-opening-word--two">One shared β-carotene hub.</p>
          <p className="duna-opening-word duna-opening-word--three">Four routes into color.</p>
          <p className="duna-opening-signature">DUNATERP · FROM SALT TO CAROTENOIDS</p>
          <button type="button" className="duna-opening-skip" onClick={finishOpening}>Skip</button>
        </div>
      )}

      <Header light />

      <div className="duna-sticky">
        <div ref={mount} className="duna-stage" aria-label="A scroll-driven 3D journey through the DunaTerp project" />

        <section className="world-intro" inert={!openingComplete || stage >= 1}>
          <div className="intro-coordinate" aria-hidden="true">
            <span>SCU–CHINA / CHENGDU</span>
            <span>iGEM 2026 / DUNATERP</span>
          </div>
          <div className="intro-lockup">
            <p><span /> DUNALIELLA · SYNTHETIC BIOLOGY</p>
            <h1><span>Duna</span><i>Terp.</i></h1>
            <p>One salt-adapted cell. One shared metabolic hub. Four routes into color.</p>
          </div>
          <div className="intro-data" aria-label="Project overview">
            <div><strong>01</strong><span>Halophilic chassis</span></div>
            <div><strong>04</strong><span>Product routes</span></div>
            <div><strong>β-C</strong><span>Shared hub</span></div>
          </div>
          <div className="intro-start">
            <div className="intro-actions"><button type="button" onClick={beginJourney}>Enter the salt route <span aria-hidden="true">↓</span></button><Link to="/project-description">Read the project <span aria-hidden="true">↗</span></Link></div>
            <span>Scroll to drive</span>
          </div>
        </section>

        <div
          ref={routeBar}
          className="world-route"
          role="progressbar"
          aria-label="Journey progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <span style={{ width: "calc(var(--journey-progress, 0) * 100%)" }} />
          {chapters.map((chapter) => (
            <i key={chapter.n} style={{ left: `${chapter.t * 100}%`, background: chapter.c }} />
          ))}
        </div>

        <WikiTerminal ready={stage >= 3} />

        <button
          className="restart-drive"
          type="button"
          onClick={() => window.scrollTo({ top: journey.current?.offsetTop ?? 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
          aria-label="Return to the beginning"
        >
          ↑
        </button>
      </div>

      <div className="duna-scroll-story">
        <div className="duna-scroll-lead" aria-hidden="true" />
        {chapters.map((chapter, index) => (
          <section
            key={chapter.n}
            className={`duna-scroll-segment duna-scroll-chapter${index % 2 ? " is-right" : ""}`}
            style={{ "--chapter-accent": chapter.c } as CSSProperties}
            aria-labelledby={`chapter-${chapter.n}`}
          ><div><p><span>{chapter.n} / 06</span>{chapter.kicker}</p><h2 id={`chapter-${chapter.n}`}>{chapter.title}</h2><p>{chapter.body}</p><Link to={chapter.link}>Explore this chapter <span aria-hidden="true">↗</span></Link></div></section>
        ))}
        <div className="duna-terminal-space" aria-hidden="true" />
      </div>
    </main>
  );
}
