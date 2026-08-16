// Regional detail inserts — a second, higher-density crop of the SAME
// legitimate 8K day-map source (Solar System Scope, see ARCHITECTURE.md
// §Earth Textures) blended into the sphere only in the small UV window
// around each destination, once the camera is close. NOT a separate mesh,
// NOT synthetic/AI geography, NOT a full LOD streaming system — one static
// texture per destination, native-cropped (no upscaling) at ~2x the pixel
// density of the in-app global map (public/assets/earth/earth-day.webp is
// 4096x2048 resampled from the same 8192x4096 source; these crops are
// untouched native pixels from it).
//
// UV bounds were computed, not eyeballed — see three/latLng.ts's sibling
// formula for the actual convention SphereGeometry (and therefore this
// shader's vUv) uses: u = (lng + 180) / 360, v = (90 - lat) / 180 (v=0 at
// the north pole, increasing toward the south — verified by cropping
// public/assets/earth/earth-day.webp at these exact bounds and confirming
// real geography: Beijing -> Bohai Bay/North China Plain, Tokyo -> the
// Japanese archipelago, Cairo -> the Nile Delta/Sinai). An earlier version
// of this file used v = (lat + 90) / 180 — the mirror-image convention —
// which silently placed every regional insert at the wrong hemisphere
// (e.g. Beijing's crop over Australia) with no visible seam anywhere near
// the actual destinations, since regionalBlend only ever activates close to
// a real waypoint. Caught by cropping the live asset with both formulas and
// comparing against known geography, not by reading the shader math. Each
// crop is an 18-degree half-width window (36 degrees square) centered on
// the waypoint.
export interface RegionalTexture {
  /** Matches a Waypoint.id in data/journey.ts. */
  id: string;
  path: string;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

export const REGIONAL_TEXTURES: RegionalTexture[] = [
  {
    id: 'beijing',
    path: '/assets/earth/regions/beijing.webp',
    uMin: 0.7733538888888888,
    uMax: 0.8733538888888889,
    vMin: 0.17831,
    vMax: 0.37831,
  },
  {
    id: 'tokyo',
    path: '/assets/earth/regions/tokyo.webp',
    uMin: 0.8379175,
    uMax: 0.9379175000000001,
    vMin: 0.20179888888888888,
    vMax: 0.4017988888888889,
  },
  {
    id: 'cairo',
    path: '/assets/earth/regions/cairo.webp',
    uMin: 0.5367658333333333,
    uMax: 0.6367658333333334,
    vMin: 0.23308666666666665,
    vMax: 0.43308666666666667,
  },
];
