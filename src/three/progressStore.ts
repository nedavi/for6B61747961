// Scroll progress is written once per ScrollTrigger tick (EarthJourneyScene)
// and read every animation frame (CameraRig, WaypointMarkers, RouteLine).
// A plain mutable object — not React state/Context — because pushing 60fps
// updates through React would mean 60fps re-renders (ARCHITECTURE.md §6/§7).
export const progressStore = {
  /** Normalized journey progress, 0..1. */
  progress: 0,
};
