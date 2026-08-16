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

// Minimal monochrome pin, v2 — filled body (not a bare outline) with a soft
// tonal bloom and a lens-like aperture at its center. Still deliberately not
// the filled red Google Maps teardrop, and still not tinted with any accent
// color ("no colored UI" — a direct earlier decision, see ARCHITECTURE.md
// §K8) — the added quality comes from craft (gradient fill, baked-in glow,
// a more considered inner detail, a larger canvas for crisper edges at any
// zoom), not from color.
function PinGlyph() {
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="waypoint-pin-bloom" cx="50%" cy="34%" r="62%">
          <stop offset="0%" stopColor="#f3ede4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f3ede4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="waypoint-pin-body" x1="13" y1="2.5" x2="13" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffdfa" />
          <stop offset="100%" stopColor="#d9d3c9" />
        </linearGradient>
      </defs>
      <circle cx="13" cy="13" r="13" fill="url(#waypoint-pin-bloom)" />
      <path
        d="M13 2.5C7.20101 2.5 2.5 7.20101 2.5 13C2.5 20.5 13 31.5 13 31.5C13 31.5 23.5 20.5 23.5 13C23.5 7.20101 18.799 2.5 13 2.5Z"
        fill="url(#waypoint-pin-body)"
        stroke="#050508"
        strokeOpacity="0.18"
        strokeWidth="0.6"
      />
      <circle cx="13" cy="12.6" r="3.5" fill="#050508" fillOpacity="0.26" />
      <circle cx="13" cy="12.6" r="2.6" fill="#fffdfa" />
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
