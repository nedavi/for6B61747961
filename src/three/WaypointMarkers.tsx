import { useRef, type RefObject } from 'react';
import type { Mesh } from 'three';
import { journey } from '../data/journey';
import { buildTimeline } from '../data/timeline';
import { WaypointMarker } from './WaypointMarker';

interface WaypointMarkersProps {
  earthMeshRef: RefObject<Mesh | null>;
}

// Thin wrapper — journey.ts + timeline.ts decide WHAT/WHERE and WHEN; each
// WaypointMarker owns its own presentation/choreography independently (see
// three/WaypointMarker.tsx). No route lines between them (removed per
// instruction) — each destination is an isolated geographic marker.
export function WaypointMarkers({ earthMeshRef }: WaypointMarkersProps) {
  const timeline = useRef(buildTimeline(journey)).current;

  return (
    <>
      {journey.map((waypoint) => {
        const segment = timeline.find((s) => s.waypoint?.id === waypoint.id);
        if (!segment) return null;
        return (
          <WaypointMarker key={waypoint.id} waypoint={waypoint} arrivalAt={segment.end} earthMeshRef={earthMeshRef} />
        );
      })}
    </>
  );
}
