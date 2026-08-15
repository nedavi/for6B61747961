import { useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import { journey } from '../data/journey';
import { buildTimeline } from '../data/timeline';
import { latLngToVector3 } from './latLng';
import { progressStore } from './progressStore';

const MARKER_RADIUS = 1.005; // fractionally above the surface, avoids z-fighting

// Only the currently-arriving destination should ever read strongly — Earth
// is the hero, not a cluster of simultaneous city labels (Part 6). Each
// waypoint's own timeline-segment END is its "arrival" moment; the label
// fades in just before it, holds briefly, then fades out — never all three
// visible together.
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

interface WaypointMarkersProps {
  earthMeshRef: RefObject<Mesh | null>;
}

// DOM-overlay labels/markers (ARCHITECTURE.md §6 "Markers are DOM, not WebGL
// text") — each <Html> is mounted as a child of the same rotating Earth group
// as the sphere itself, so it inherits the group's rotation every frame for
// free and stays visually pinned to its geographic point. `occlude` hides a
// label automatically when its point is on the far side of the globe.
export function WaypointMarkers({ earthMeshRef }: WaypointMarkersProps) {
  const timeline = useRef(buildTimeline(journey)).current;
  const [activeness, setActiveness] = useState<number[]>(() => journey.map(() => 0));
  const frameCounter = useRef(0);

  // Throttled to ~12Hz — label opacity doesn't need 60fps precision, and this
  // keeps the DOM-overlay layer from re-rendering every animation frame.
  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 5 !== 0) return;

    const progress = progressStore.progress;
    const next = journey.map((waypoint) => {
      const segment = timeline.find((s) => s.waypoint?.id === waypoint.id);
      if (!segment) return 0;
      return arrivalEnvelope(progress, segment.end);
    });

    setActiveness((prev) => (prev.some((v, i) => Math.abs(v - next[i]) > 0.005) ? next : prev));
  });

  return (
    <>
      {journey.map((waypoint, index) => {
        const position = latLngToVector3(waypoint.lat, waypoint.lng, MARKER_RADIUS);
        const opacity = activeness[index];
        return (
          <group key={waypoint.id} position={position}>
            {opacity > 0.02 ? (
              <mesh>
                <sphereGeometry args={[0.012, 12, 12]} />
                <meshBasicMaterial color="#5fc9e8" transparent opacity={opacity} />
              </mesh>
            ) : null}
            <Html
              center
              occlude={earthMeshRef.current ? [earthMeshRef as RefObject<Mesh>] : undefined}
              zIndexRange={[2, 0]}
              distanceFactor={4.2}
              style={{ opacity, transition: 'opacity 0.5s ease', pointerEvents: 'none' }}
            >
              <div className="waypoint-marker">
                <p className="waypoint-marker__label">{waypoint.label}</p>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
