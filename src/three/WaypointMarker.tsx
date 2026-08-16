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

// Minimal monochrome pin — thin outline + small center dot. Deliberately not
// the filled red Google Maps teardrop: no fill, no color, just a restrained
// line-art glyph that reads as "location" without competing with the planet.
function PinGlyph() {
  return (
    <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 0.75C3.996 0.75 0.75 3.996 0.75 8C0.75 13.25 8 20.25 8 20.25C8 20.25 15.25 13.25 15.25 8C15.25 3.996 12.004 0.75 8 0.75Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="8" cy="8" r="2.25" fill="currentColor" />
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
