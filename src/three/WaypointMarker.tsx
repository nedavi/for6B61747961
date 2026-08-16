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
// thresholds against the same scroll-driven envelope.
const ENTER_THRESHOLD = 0.14;
const EXIT_THRESHOLD = 0.07;

const FADE_IN = 0.07;
const HOLD = 0.045;
const FADE_OUT = 0.09;

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function arrivalEnvelope(progress: number, arrivalAt: number): number {
  if (progress < arrivalAt - FADE_IN) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - FADE_IN)) / FADE_IN);
  if (progress < arrivalAt + HOLD) return 1;
  if (progress < arrivalAt + HOLD + FADE_OUT) return 1 - smoothstep((progress - (arrivalAt + HOLD)) / FADE_OUT);
  return 0;
}

// Minimal monochrome marker, v3 — a slim beacon (thin stem + small ring),
// not a filled pin shape. v2's filled teardrop read as too large/blocky
// ("low-poly") against Earth's own level of detail — direct feedback. This
// version is deliberately small and thin: a soft glow, a fine stem rising
// from the surface point, a hairline ring, and a bright center dot — closer
// to a radar/target glyph than a map pin. Still not tinted with any accent
// color ("no colored UI" — a direct earlier decision, see ARCHITECTURE.md §K8).
function PinGlyph() {
  return (
    <svg width="14" height="28" viewBox="0 0 14 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="waypoint-pin-bloom" cx="50%" cy="21%" r="65%">
          <stop offset="0%" stopColor="#f3ede4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f3ede4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="7" cy="6" r="8" fill="url(#waypoint-pin-bloom)" />
      <line x1="7" y1="11.4" x2="7" y2="27" stroke="#f3ede4" strokeWidth="1.1" strokeOpacity="0.8" strokeLinecap="round" />
      <circle cx="7" cy="6" r="5" fill="none" stroke="#f3ede4" strokeWidth="1.2" strokeOpacity="0.9" />
      <circle cx="7" cy="6" r="1.6" fill="#f3ede4" />
    </svg>
  );
}

interface WaypointMarkerProps {
  waypoint: Waypoint;
  arrivalAt: number;
  earthMeshRef: RefObject<Mesh | null>;
}

// One marker's full presentation + choreography, split out of WaypointMarkers
// so each can own its own GSAP timeline and entrance/exit state machine
// independently (ARCHITECTURE.md §6). The scroll-driven envelope only decides
// WHEN to cross the enter/exit threshold; the animation itself, once
// triggered, is a authored GSAP sequence (overshoot entrance, staggered
// exit) rather than a raw scroll-scrubbed opacity value — a discrete event,
// not a continuous scrub, matching the requested choreography.
export function WaypointMarker({ waypoint, arrivalAt, earthMeshRef }: WaypointMarkerProps) {
  const pinRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isVisibleRef = useRef(false);
  const frameCounter = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const position = latLngToVector3(waypoint.lat, waypoint.lng, MARKER_RADIUS);

  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 5 !== 0) return; // ~12Hz — plenty for this

    const pin = pinRef.current;
    const label = labelRef.current;
    if (!pin || !label) return;

    const envelope = arrivalEnvelope(progressStore.progress, arrivalAt);

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
        zIndexRange={[2, 0]}
        distanceFactor={4.2}
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
