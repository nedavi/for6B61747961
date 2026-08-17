import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Mesh } from 'three';
import type { Waypoint } from '../data/journey';
import { latLngToVector3 } from './latLng';
import { progressStore } from './progressStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const MARKER_RADIUS = 1.005; // fractionally above the surface, avoids z-fighting

// Hysteresis gap so the marker doesn't flicker in/out if the user scrolls
// back and forth right at the boundary — enter and exit use different
// thresholds against the same scroll-driven envelope. These stay fixed
// (unlike the fade/hold durations below) since they're fractions of the
// envelope's own height (0..1), not the scroll axis.
const ENTER_THRESHOLD = 0.14;
const EXIT_THRESHOLD = 0.07;

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

// §K15: fade-in/hold/fade-out used to be fixed fractions of the *whole*
// scroll range (0.07/0.045/0.09 ≈ 0.2 total). That was fine when there were
// 3 widely-spaced waypoints, but with 9 the average segment is only ~0.08
// wide — a fixed 0.2-wide envelope spilled well into neighboring waypoints'
// segments, so two markers could be visible/fading at once. Scaling by the
// waypoint's own segment width keeps the envelope inside its own segment
// regardless of how many waypoints exist or how their durationWeights compare.
// §K22: fractions cut hard again (0.22/0.4/0.2 → 0.05/0.08/0.04) — direct
// instruction that the marker/label should read as tied to the camera having
// actually settled on this waypoint, not visible across most of the segment
// surrounding it. The old fractions summed to 0.82 of the segment's own
// width (visible almost the entire time this waypoint was "current"); the
// new ones sum to 0.17 — a short approach fade-in, a brief hold right at
// arrival, and a fast fade-out the moment departure begins.
function envelopeDurations(segmentWidth: number) {
  return {
    fadeIn: segmentWidth * 0.05,
    hold: segmentWidth * 0.08,
    fadeOut: segmentWidth * 0.04,
  };
}

function arrivalEnvelope(progress: number, arrivalAt: number, fadeIn: number, hold: number, fadeOut: number): number {
  if (progress < arrivalAt - fadeIn) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - fadeIn)) / fadeIn);
  if (progress < arrivalAt + hold) return 1;
  if (progress < arrivalAt + hold + fadeOut) return 1 - smoothstep((progress - (arrivalAt + hold)) / fadeOut);
  return 0;
}

// Minimal monochrome marker, v3 — a slim beacon (thin stem + small ring),
// not a filled pin shape. v2's filled teardrop read as too large/blocky
// ("low-poly") against Earth's own level of detail — direct feedback. This
// version is deliberately small and thin: a soft glow, a fine stem rising
// from the surface point, a hairline ring, and a bright center dot — closer
// to a radar/target glyph than a map pin. Still not tinted with any accent
// color ("no colored UI" — a direct earlier decision, see ARCHITECTURE.md §K8).
// §K21: enlarged again, 20×40 → 30×60 (another real coordinate scale, same
// reasoning as §K20 — direct feedback that the §K20 size still wasn't big
// enough to read comfortably).
function PinGlyph() {
  return (
    <svg width="30" height="60" viewBox="0 0 30 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="waypoint-pin-bloom" cx="50%" cy="21%" r="65%">
          <stop offset="0%" stopColor="#f3ede4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f3ede4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="15" cy="12.9" r="17.1" fill="url(#waypoint-pin-bloom)" />
      <line x1="15" y1="24.5" x2="15" y2="57.9" stroke="#f3ede4" strokeWidth="2.4" strokeOpacity="0.8" strokeLinecap="round" />
      <circle cx="15" cy="12.9" r="10.7" fill="none" stroke="#f3ede4" strokeWidth="2.6" strokeOpacity="0.9" />
      <circle cx="15" cy="12.9" r="3.5" fill="#f3ede4" />
    </svg>
  );
}

interface WaypointMarkerProps {
  waypoint: Waypoint;
  arrivalAt: number;
  segmentWidth: number;
  earthMeshRef: RefObject<Mesh | null>;
}

// One marker's full presentation + choreography, split out of WaypointMarkers
// so each can own its own GSAP timeline and entrance/exit state machine
// independently (ARCHITECTURE.md §6). The scroll-driven envelope only decides
// WHEN to cross the enter/exit threshold; the animation itself, once
// triggered, is a authored GSAP sequence (overshoot entrance, staggered
// exit) rather than a raw scroll-scrubbed opacity value — a discrete event,
// not a continuous scrub, matching the requested choreography.
export function WaypointMarker({ waypoint, arrivalAt, segmentWidth, earthMeshRef }: WaypointMarkerProps) {
  const pinRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isVisibleRef = useRef(false);
  const frameCounter = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut } = envelopeDurations(segmentWidth);

  const position = latLngToVector3(waypoint.lat, waypoint.lng, MARKER_RADIUS);

  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 5 !== 0) return; // ~12Hz — plenty for this

    const pin = pinRef.current;
    const label = labelRef.current;
    if (!pin || !label) return;

    const envelope = arrivalEnvelope(progressStore.progress, arrivalAt, fadeIn, hold, fadeOut);

    if (!isVisibleRef.current && envelope >= ENTER_THRESHOLD) {
      isVisibleRef.current = true;
      timelineRef.current?.kill();
      const tl = gsap.timeline();
      if (prefersReducedMotion) {
        tl.to(pin, { opacity: 1, scale: 1, duration: 0.25, ease: 'power1.out' });
        tl.to(label, { opacity: 1, duration: 0.2, ease: 'power1.out' }, '+=0.05');
      } else {
        // Opacity 0 / scale 0.75 → fade in with a slight overshoot → settle
        // at scale 1 (back.out overshoots past 1 and eases back on its own).
        tl.fromTo(pin, { opacity: 0, scale: 0.75 }, { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.8)' });
        tl.to(label, { opacity: 1, duration: 0.45, ease: 'power2.out' }, '-=0.15');
      }
      timelineRef.current = tl;
    } else if (isVisibleRef.current && envelope <= EXIT_THRESHOLD) {
      isVisibleRef.current = false;
      timelineRef.current?.kill();
      const tl = gsap.timeline();
      const labelDuration = prefersReducedMotion ? 0.15 : 0.3;
      const pinDuration = prefersReducedMotion ? 0.15 : 0.35;
      // Label fades out first, marker fades out second (Part destination
      // marker choreography) — never together.
      tl.to(label, { opacity: 0, duration: labelDuration, ease: 'power1.in' });
      tl.to(pin, { opacity: 0, duration: pinDuration, ease: 'power1.in' }, prefersReducedMotion ? '-=0.05' : '+=0.05');
      timelineRef.current = tl;
    }
  });

  return (
    <group position={position}>
      <Html
        center
        occlude={earthMeshRef.current ? [earthMeshRef as RefObject<Mesh>] : undefined}
        // §K19: raised above DestinationSidebar's z-index (2) — the marker/
        // label must stay legible even where a waypoint's camera framing
        // happens to place it under the sidebar's screen region (mostly
        // solved by DestinationSidebar now flipping sides per-waypoint, but
        // this is the safety net for whatever it doesn't catch).
        zIndexRange={[3, 1]}
        // §K19: distanceFactor removed — it scaled this element via a CSS 3D
        // matrix transform based on camera distance, which at this project's
        // close orbital range produced a large scale-up of an already-small
        // (14px) rasterized layer, reading as blocky/pixelated text (direct
        // feedback, an Istanbul screenshot). Html without distanceFactor
        // renders at a fixed CSS pixel size instead — always native-crisp
        // regardless of camera distance, and as a side effect no longer
        // oversized on closer waypoints either.
        style={{ pointerEvents: 'none' }}
      >
        <div className="waypoint-marker">
          <span className="waypoint-marker__pin" ref={pinRef}>
            <PinGlyph />
          </span>
          <p className="waypoint-marker__label" ref={labelRef}>
            {waypoint.label}
          </p>
        </div>
      </Html>
    </group>
  );
}
