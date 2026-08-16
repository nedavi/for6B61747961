import { mulberry32 } from './seededRandom';

// An authored, abstract celestial background — deliberately NOT connected by
// lines (removed per instruction: no visible constellation-line geometry).
// Instead, a small fixed set of stars is grouped into loose clusters; each
// group has a per-story-step target { brightness, sizeScale, drift }, and
// every star eases toward its group's current target continuously (see
// AmbientBackground.tsx) rather than snapping when the step changes. The
// viewer should read this as "the sky is quietly reorganizing itself," not
// as a diagram.

export interface ConstellationStar {
  id: string;
  groupId: string;
  x: number; // 0..1, base anchor position, fraction of viewport width
  y: number; // 0..1
  baseRadius: number;
  /** Pointer-parallax depth, same convention as seededRandom.ts's STARS. */
  parallax: number;
}

export interface GroupState {
  /** Target opacity multiplier for every star in this group, 0..1. */
  brightness: number;
  /** Target radius multiplier relative to baseRadius. */
  sizeScale: number;
  /** Tiny target positional offset (fraction of viewport), so stars drift
   *  rather than sit dead still — kept small enough to read as alive, not
   *  as a screensaver. */
  drift: { x: number; y: number };
}

const SEED = 4471;
const random = mulberry32(SEED);

function starsInRegion(groupId: string, count: number, xMin: number, xMax: number, yMin: number, yMax: number): ConstellationStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${groupId}-${i}`,
    groupId,
    x: xMin + random() * (xMax - xMin),
    y: yMin + random() * (yMax - yMin),
    baseRadius: 1.3 + random() * 0.9,
    parallax: 1.6 + random() * 1.4,
  }));
}

// Four loose, unconnected clusters, kept mostly out of the dead-center
// column so they read as atmosphere behind the question text.
export const CONSTELLATION_STARS: ConstellationStar[] = [
  ...starsInRegion('north', 3, 0.06, 0.24, 0.1, 0.34),
  ...starsInRegion('east', 4, 0.78, 0.95, 0.12, 0.5),
  ...starsInRegion('south', 3, 0.42, 0.6, 0.76, 0.94),
  ...starsInRegion('west', 3, 0.08, 0.26, 0.62, 0.88),
];

export const GROUP_IDS = ['north', 'east', 'south', 'west'] as const;
export type GroupId = (typeof GROUP_IDS)[number];

const DIM: GroupState = { brightness: 0.16, sizeScale: 0.85, drift: { x: 0, y: 0 } };

/**
 * One state per story.ts step (indices 0..5) — the six story steps map
 * directly to these, so no separate progress-bucket math is needed. Named
 * loosely after the brief's A/B/C/D/Final language in comments:
 *  - disappear (A): first group dominant.
 *  - anywhere (B): second group slowly emerges.
 *  - matters-more (C): first group fades, a third becomes brighter.
 *  - physical-clue (task, C-hold): motion settles, a different cluster
 *    quietly lights (physical-task background phase already slows motionSpeed).
 *  - clue-code (D): code success — a new group brightens.
 *  - trust (Final): groups slowly align toward a shared, even brightness.
 */
export const CONSTELLATION_STATES: Record<GroupId, GroupState>[] = [
  // 0 — disappear: north dominant
  { north: { brightness: 0.95, sizeScale: 1.3, drift: { x: 0, y: -0.004 } }, east: DIM, south: DIM, west: DIM },
  // 1 — anywhere: east emerges, north still present
  {
    north: { brightness: 0.55, sizeScale: 1.05, drift: { x: -0.003, y: 0 } },
    east: { brightness: 0.85, sizeScale: 1.2, drift: { x: 0.004, y: 0.003 } },
    south: DIM,
    west: DIM,
  },
  // 2 — matters-more: north fades, south brightens
  {
    north: { brightness: 0.2, sizeScale: 0.9, drift: { x: -0.005, y: 0.004 } },
    east: { brightness: 0.5, sizeScale: 1.0, drift: { x: 0.002, y: -0.002 } },
    south: { brightness: 0.9, sizeScale: 1.25, drift: { x: 0, y: -0.003 } },
    west: DIM,
  },
  // 3 — physical-clue (task): motion settles, west quietly lights
  {
    north: { brightness: 0.15, sizeScale: 0.85, drift: { x: -0.006, y: 0.005 } },
    east: { brightness: 0.4, sizeScale: 0.95, drift: { x: 0.003, y: -0.001 } },
    south: { brightness: 0.55, sizeScale: 1.05, drift: { x: 0.001, y: -0.004 } },
    west: { brightness: 0.75, sizeScale: 1.2, drift: { x: -0.002, y: 0.003 } },
  },
  // 4 — clue-code: code success, west brightens further
  {
    north: { brightness: 0.15, sizeScale: 0.85, drift: { x: -0.007, y: 0.006 } },
    east: { brightness: 0.3, sizeScale: 0.9, drift: { x: 0.004, y: 0.001 } },
    south: { brightness: 0.5, sizeScale: 1.0, drift: { x: 0.002, y: -0.005 } },
    west: { brightness: 0.95, sizeScale: 1.3, drift: { x: -0.003, y: 0.004 } },
  },
  // 5 — trust (final question): groups slowly align to a shared brightness
  {
    north: { brightness: 0.68, sizeScale: 1.1, drift: { x: -0.004, y: 0.003 } },
    east: { brightness: 0.72, sizeScale: 1.1, drift: { x: 0.003, y: 0.002 } },
    south: { brightness: 0.7, sizeScale: 1.1, drift: { x: 0.001, y: -0.003 } },
    west: { brightness: 0.74, sizeScale: 1.1, drift: { x: -0.002, y: 0.002 } },
  },
];

// Once space-transition begins, every group eases toward this shared,
// unremarkable-field state — the groups stop reading as distinct clusters
// and quietly become indistinguishable from the rest of the star field,
// which is what lets the handoff into the WebGL star field feel continuous
// (the brighter members simply persist as slightly-above-average stars).
export const DISSOLVED_STATE: GroupState = { brightness: 0.55, sizeScale: 1.0, drift: { x: 0, y: 0 } };
