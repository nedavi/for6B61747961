import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { journey } from '../data/journey';
import { buildTimeline } from '../data/timeline';
import { latLngToVector3, slerpOnSphere } from './latLng';
import { progressStore } from './progressStore';

const ROUTE_RADIUS = 1.015;
const ARC_SAMPLES = 48;

interface Route {
  id: string;
  points: Vector3[];
  /** progress span this route travels across — same span as the destination
   *  waypoint's own timeline segment, since arrival and travel share one window. */
  start: number;
  end: number;
}

// Simple curved arcs following the sphere surface (Part O) — only the route
// currently being traveled draws on progressively and reads at full strength;
// completed routes fade rather than disappearing, so the journey still reads
// as one continuous path rather than airline-map clutter.
export function RouteLine() {
  const timeline = useRef(buildTimeline(journey)).current;

  const routes = useMemo<Route[]>(() => {
    const list: Route[] = [];
    for (let i = 0; i < journey.length - 1; i += 1) {
      const from = journey[i];
      const to = journey[i + 1];
      const a = latLngToVector3(from.lat, from.lng, ROUTE_RADIUS);
      const b = latLngToVector3(to.lat, to.lng, ROUTE_RADIUS);
      const points = Array.from({ length: ARC_SAMPLES }, (_, idx) => slerpOnSphere(a, b, idx / (ARC_SAMPLES - 1)));
      const segment = timeline.find((s) => s.waypoint?.id === to.id);
      list.push({ id: `${from.id}-${to.id}`, points, start: segment?.start ?? 0, end: segment?.end ?? 1 });
    }
    return list;
  }, [timeline]);

  const [reveal, setReveal] = useState<number[]>(() => routes.map(() => 0));
  const [opacity, setOpacity] = useState<number[]>(() => routes.map(() => 0));
  const frameCounter = useRef(0);

  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 5 !== 0) return;

    const progress = progressStore.progress;
    const nextReveal = routes.map((route) => {
      const span = route.end - route.start;
      if (span <= 0) return 1;
      return Math.min(1, Math.max(0, (progress - route.start) / span));
    });
    const nextOpacity = routes.map((route, index) => {
      const isActive = progress >= route.start && progress <= route.end;
      if (isActive) return 0.85;
      if (progress > route.end) return 0.25;
      return nextReveal[index] > 0 ? 0.25 : 0;
    });

    setReveal((prev) => (prev.some((v, i) => v !== nextReveal[i]) ? nextReveal : prev));
    setOpacity((prev) => (prev.some((v, i) => v !== nextOpacity[i]) ? nextOpacity : prev));
  });

  return (
    <>
      {routes.map((route, index) => {
        const count = Math.max(2, Math.round(route.points.length * reveal[index]));
        if (count < 2 || opacity[index] <= 0.01) return null;
        return (
          <Line
            key={route.id}
            points={route.points.slice(0, count)}
            color="#5fc9e8"
            transparent
            opacity={opacity[index]}
            lineWidth={1.4}
          />
        );
      })}
    </>
  );
}
