import { mulberry32 } from './seededRandom';

// An authored, abstract celestial map — not a zodiac. A small fixed set of
// "anchor" stars (brighter, deterministic positions) and a handful of thin
// connections between them, each tagged with the normalized story progress
// (0..1 across the six story.ts steps) at which it starts becoming visible.
// Nothing here is randomized per-render; the seed only decides *where* the
// anchors sit once, at module load — same as visual/seededRandom.ts's STARS.

export interface AnchorStar {
  id: string;
  x: number; // 0..1, fraction of viewport width
  y: number; // 0..1, fraction of viewport height
  radius: number;
  /** Story progress (0..1) at which this anchor starts brightening. */
  revealAt: number;
  /** Final target opacity once fully revealed, before any twinkle. */
  targetOpacity: number;
}

export interface Connection {
  id: string;
  a: string; // AnchorStar id
  b: string; // AnchorStar id
  /** Story progress (0..1) at which this line starts drawing. */
  revealAt: number;
}

const SEED = 9001;
const random = mulberry32(SEED);

function pick(xMin: number, xMax: number, yMin: number, yMax: number) {
  return {
    x: xMin + random() * (xMax - xMin),
    y: yMin + random() * (yMax - yMin),
  };
}

// Three loose clusters, kept mostly out of the dead-center content column so
// they read as atmosphere behind the question text rather than competing
// with it. Revealed in order across the six story steps (index / 5 = 0, 0.2,
// 0.4, 0.6, 0.8, 1.0) — see the per-anchor/connection comments below.
const a0 = { id: 'a0', ...pick(0.06, 0.22, 0.12, 0.32), radius: 1.6, revealAt: 0.0, targetOpacity: 0.85 };
const a1 = { id: 'a1', ...pick(0.1, 0.28, 0.4, 0.62), radius: 1.4, revealAt: 0.02, targetOpacity: 0.8 };
const a2 = { id: 'a2', ...pick(0.18, 0.34, 0.68, 0.86), radius: 1.5, revealAt: 0.2, targetOpacity: 0.82 };

const b0 = { id: 'b0', ...pick(0.78, 0.94, 0.1, 0.3), radius: 1.5, revealAt: 0.4, targetOpacity: 0.8 };
const b1 = { id: 'b1', ...pick(0.82, 0.96, 0.34, 0.52), radius: 1.3, revealAt: 0.42, targetOpacity: 0.78 };
const b2 = { id: 'b2', ...pick(0.74, 0.9, 0.56, 0.76), radius: 1.5, revealAt: 0.6, targetOpacity: 0.82 };
const b3 = { id: 'b3', ...pick(0.8, 0.95, 0.78, 0.92), radius: 1.3, revealAt: 0.8, targetOpacity: 0.78 };

const c0 = { id: 'c0', ...pick(0.42, 0.58, 0.06, 0.18), radius: 1.7, revealAt: 0.6, targetOpacity: 0.9 };
const c1 = { id: 'c1', ...pick(0.4, 0.6, 0.88, 0.96), radius: 1.6, revealAt: 1.0, targetOpacity: 0.85 };

export const ANCHOR_STARS: AnchorStar[] = [a0, a1, a2, b0, b1, b2, b3, c0, c1];

export const CONNECTIONS: Connection[] = [
  // Cluster A draws first, across steps 1–3 (choice → text → choice).
  { id: 'a0-a1', a: 'a0', b: 'a1', revealAt: 0.18 },
  { id: 'a1-a2', a: 'a1', b: 'a2', revealAt: 0.38 },
  // Cluster B begins at the physical task/code beat — "a different cluster
  // quietly lights" while the rest of the network holds still.
  { id: 'b0-b1', a: 'b0', b: 'b1', revealAt: 0.58 },
  // Code success — a connection completes.
  { id: 'b1-b2', a: 'b1', b: 'b2', revealAt: 0.8 },
  // Final question — separate groups subtly align via one long bridge.
  { id: 'a2-c0', a: 'a2', b: 'c0', revealAt: 0.96 },
  { id: 'b2-c1', a: 'b2', b: 'c1', revealAt: 1.0 },
];

/** Smoothstep-eased reveal fraction (0..1) for a given threshold and window width. */
export function revealProgress(storyProgress: number, revealAt: number, window = 0.16): number {
  const t = (storyProgress - revealAt) / window;
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
