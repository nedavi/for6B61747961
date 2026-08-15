// Geography/narrative content only — no scroll-progress numbers live here.
// See data/timeline.ts for the separate "when in scroll" system that consumes
// this file's waypoint order (ARCHITECTURE.md §8).

/**
 * Cinematic camera framing for one waypoint's "arrived" state. Two separate
 * concerns are deliberately kept apart (see three/CameraRig.tsx):
 *  - WHERE the camera points, geographically, is decided by rotating the
 *    Earth group so the waypoint's lat/lng faces the camera (three/latLng.ts).
 *  - HOW that already-correctly-oriented Earth is framed cinematically is
 *    this CameraPose — distance, off-center position/lookAt offsets, FOV.
 * CameraRig interpolates every field of this smoothly between adjacent
 * waypoints; nothing here is a per-frame value.
 */
export interface CameraPose {
  /** Camera distance from Earth's center, in Earth-radius units (radius = 1). */
  distance: number;
  /** Shifts the camera's orbital position slightly off-axis — changes which
   *  edge of the sphere grazes the horizon. Roughly -0.5..0.5. */
  positionOffset?: { x: number; y: number };
  /**
   * Small angular nudges, in RADIANS, applied to the camera's rotation AFTER
   * it looks dead-on at Earth's center (see three/CameraRig.tsx). This is
   * deliberately NOT a world-space point to aim at — `camera.lookAt(target)`
   * always centers whatever `target` is, so a near-origin point can never
   * produce off-center framing. Rotating the camera slightly away from center
   * instead leaves Earth at the world origin while the *view* tilts, which is
   * what pushes Earth toward one side of the frame.
   *   x (yaw):   positive → Earth shifts toward the RIGHT of frame
   *   y (pitch): positive → Earth shifts toward the BOTTOM of frame
   * Roughly -0.3..0.3 (≈ -17°..17°).
   */
  lookAtOffset?: { x: number; y: number; z?: number };
  /** Vertical field of view in degrees. Defaults to a restrained ~40 if omitted. */
  fov?: number;
}

export interface Waypoint {
  id: string;
  /** Russian display label rendered in the DOM marker (WaypointMarkers), e.g. "МОСКВА". */
  label: string;
  lat: number;
  lng: number;
  camera: CameraPose;
  /** Relative scroll "screen time" vs. other waypoints, default 1 — a pacing
   *  hint consumed by timeline.ts, NOT a normalized progress value. */
  durationWeight?: number;
}

// TEST DATA ONLY — purely to validate the scroll → rotation → camera mechanic.
// Not the real trip destination. Coordinates are standard city-center approximations.
export const journey: Waypoint[] = [
  {
    id: 'moscow',
    label: 'МОСКВА',
    lat: 55.7558,
    lng: 37.6173,
    // The first arrival — this is the pose meant to most closely match the
    // K2 reference composition: Earth large, weighted lower-right, big empty
    // upper-left, camera looking past the limb rather than at dead-center.
    camera: {
      distance: 2.35,
      positionOffset: { x: -0.22, y: 0.14 },
      lookAtOffset: { x: 0.24, y: 0.16, z: 0 },
      fov: 42,
    },
  },
  {
    id: 'paris',
    label: 'ПАРИЖ',
    lat: 48.8566,
    lng: 2.3522,
    // A different orbital angle — weighted the other way, slightly higher
    // camera elevation, so the journey doesn't repeat the same framing twice.
    camera: {
      distance: 2.25,
      positionOffset: { x: 0.2, y: 0.12 },
      lookAtOffset: { x: -0.19, y: 0.13, z: 0 },
      fov: 40,
    },
  },
  {
    id: 'tokyo',
    label: 'ТОКИО',
    lat: 35.6762,
    lng: 139.6503,
    durationWeight: 1.4,
    // Closest approach of this test journey — Earth fills more of the frame.
    camera: {
      distance: 1.95,
      positionOffset: { x: -0.18, y: 0.13 },
      lookAtOffset: { x: 0.2, y: 0.17, z: 0 },
      fov: 38,
    },
  },
];

/** Far, distant framing for the very start of the journey (progress 0) — see
 *  EarthJourneyScene's auto-reveal beat and timeline.ts's leading band. */
export const EARTH_REVEAL_CAMERA: CameraPose = {
  distance: 7.5,
  positionOffset: { x: 0, y: 0 },
  lookAtOffset: { x: 0, y: 0, z: 0 },
  fov: 45,
};
