// Shared mobile breakpoint for the Earth journey — texture tier selection
// (Earth.tsx/CloudLayer.tsx) and camera framing (CameraRig.tsx) both key off
// this so they never disagree about what counts as "mobile".
export const EARTH_MOBILE_BREAKPOINT = 640;

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < EARTH_MOBILE_BREAKPOINT;
}
