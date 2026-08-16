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

/** A short establishing-shot clip shown as a full-screen takeover at this
 *  waypoint's closest approach (scenes/earth/CityPostcard.tsx) — the globe
 *  fades out entirely, the video plays, then the globe fades back in as
 *  scroll carries the camera onward. Optional: a waypoint with no `postcard`
 *  behaves exactly as before (no takeover). */
export interface CityPostcard {
  /** Muted, looping video — no audio track expected (autoplay requires it
   *  muted anyway). */
  video: string;
  /** Shown immediately while the video loads/decodes, and as the static
   *  frame under `prefers-reduced-motion` (no autoplaying video then). */
  poster: string;
}

/** Supplementary destination info shown in the left-side DestinationSidebar
 *  (scenes/earth/DestinationSidebar.tsx) once the camera has settled on this
 *  waypoint — description, day/night photos, and the main landmarks. Optional,
 *  same no-op pattern as `postcard`: a waypoint with no `info` simply shows no
 *  sidebar. `photos` is itself optional within `info` — a description-only
 *  entry (no photos yet) still renders correctly, just without the photo row. */
export interface CityInfo {
  description: string;
  photos?: { day: string; night: string };
  landmarks?: string[];
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
  postcard?: CityPostcard;
  info?: CityInfo;
}

// TEST DATA — validates the scroll → rotation → camera mechanic with real
// geography, but is still NOT the real trip destination (per instructions,
// that reveal is a later milestone). Real Russian city names, not
// transliterations — matches how Moscow/Paris were localized.
export const journey: Waypoint[] = [
  {
    id: 'beijing',
    label: 'ПЕКИН',
    lat: 39.9042,
    lng: 116.4074,
    // The first arrival — this is the pose meant to most closely match the
    // K2 reference composition: Earth large, weighted lower-right, big empty
    // upper-left, camera looking past the limb rather than at dead-center.
    camera: {
      distance: 2.35,
      positionOffset: { x: -0.22, y: 0.14 },
      lookAtOffset: { x: 0.24, y: 0.16, z: 0 },
      fov: 42,
    },
    // postcard: intentionally unset — no real Higgsfield video exists yet
    // (see ARCHITECTURE.md §K4). Add `{ video, poster }` here once the
    // credit top-up + generation pass happens; CityPostcard.tsx already
    // no-ops cleanly for any waypoint without one.
    info: {
      description:
        'Столица, где императорские дворцы соседствуют с небоскрёбами, а древние хутуны прячутся в паре шагов от неоновых проспектов.',
      // Real photographs (Wikimedia Commons, CC-licensed — see credits below),
      // not generated, per direct instruction while Higgsfield is unavailable.
      // ?v=2 cache-busts the landmark-photo swap (§K11) in case a CDN/browser
      // had cached the original skyline photos at these same URLs.
      photos: { day: '/assets/destinations/beijing/day.webp?v=2', night: '/assets/destinations/beijing/night.webp?v=2' },
      landmarks: ['Запретный город', 'Великая Китайская стена', 'Площадь Тяньаньмэнь'],
    },
  },
  {
    id: 'tokyo',
    label: 'ТОКИО',
    lat: 35.6762,
    lng: 139.6503,
    // A different orbital angle — weighted the other way, slightly higher
    // camera elevation, so the journey doesn't repeat the same framing twice.
    camera: {
      distance: 2.25,
      positionOffset: { x: 0.2, y: 0.12 },
      lookAtOffset: { x: -0.19, y: 0.13, z: 0 },
      fov: 40,
    },
    info: {
      description:
        'Город, где всё одновременно: храмы XVII века, самый плотный неон в мире и тишина садов в двух шагах от станции метро.',
      photos: { day: '/assets/destinations/tokyo/day.webp?v=2', night: '/assets/destinations/tokyo/night.webp?v=2' },
      landmarks: ['Токийская башня', 'Храм Сэнсо-дзи', 'Перекрёсток Сибуя'],
    },
  },
  {
    id: 'cairo',
    label: 'КАИР',
    lat: 30.0444,
    lng: 31.2357,
    durationWeight: 1.4,
    // Closest approach of this test journey — Earth fills more of the frame.
    camera: {
      distance: 1.95,
      positionOffset: { x: -0.18, y: 0.08 },
      lookAtOffset: { x: 0.2, y: 0.1, z: 0 },
      fov: 38,
    },
    info: {
      description:
        'Мегаполис на Ниле, где пирамидам уже четыре с половиной тысячи лет, а рынок Хан-эль-Халили торгуется точно так же, как и века назад.',
      photos: { day: '/assets/destinations/cairo/day.webp?v=2', night: '/assets/destinations/cairo/night.webp?v=2' },
      landmarks: ['Пирамиды Гизы', 'Сфинкс', 'Каирский музей'],
    },
  },
];

// Photo credits (Wikimedia Commons, all CC-licensed — required by Commons'
// hosting policy regardless of category). Landmarks, not generic skylines —
// swapped in on direct feedback that the first pass (city skyline photos)
// wasn't the ask, see ARCHITECTURE.md §K11. Beijing day — "20130903-Beijing-
// Forbidden City(Gugong) 故宫 1.JPG" (Forbidden City); Beijing night —
// "天安门夜景.jpg" (Tiananmen Gate, illuminated); Tokyo day — "Tokyo Tower and
// around Skyscrapers.jpg"; Tokyo night — "Tokyo Tower at night (1).jpg"
// (CC BY-SA 2.0); Cairo day — "All Gizah Pyramids.jpg" (a former Wikipedia
// Picture of the Day); Cairo night — "Son et lumière sound and light show at
// Giza.JPG" (Pyramids + Sphinx, illuminated). Sourced directly, not
// Higgsfield-generated, per direct instruction while the Higgsfield MCP
// connection is unavailable.

/** Far, distant framing for the very start of the journey (progress 0) — see
 *  EarthJourneyScene's auto-reveal beat and timeline.ts's leading band. */
export const EARTH_REVEAL_CAMERA: CameraPose = {
  distance: 7.5,
  positionOffset: { x: 0, y: 0 },
  lookAtOffset: { x: 0, y: 0, z: 0 },
  fov: 45,
};
