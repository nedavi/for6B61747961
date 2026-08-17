import type { Waypoint } from './journey';

export interface TimelineSegment {
  id: string;
  start: number; // 0..1
  end: number; // 0..1
  waypoint?: Waypoint; // absent only for the leading 'earth-reveal' segment
}

// Fixed leading band reserved for the auto Earth reveal + a held "just Earth"
// beat before the first waypoint's approach begins (§K19 — exported so
// CameraRig can hold a static camera frame across this whole band instead of
// already easing toward the first waypoint from progress 0, see there) — a
// constant, never derived from journey.length (ARCHITECTURE.md §8 rule 1).
export const REVEAL_END = 0.16;

/**
 * journey.ts describes WHAT/WHERE; this is the only place that decides WHEN,
 * in scroll terms, each waypoint's arrival happens. The remaining range after
 * the reveal band is divided across waypoints proportionally to durationWeight
 * (default 1) — changing pacing means editing a waypoint's durationWeight,
 * never touching CameraRig or EarthJourneyScene.
 */
export function buildTimeline(
  journeyData: Waypoint[],
  overrides?: Record<string, { start?: number; end?: number }>,
): TimelineSegment[] {
  const segments: TimelineSegment[] = [{ id: 'earth-reveal', start: 0, end: REVEAL_END }];

  const totalWeight = journeyData.reduce((sum, w) => sum + (w.durationWeight ?? 1), 0) || 1;
  const remaining = 1 - REVEAL_END;
  let cursor = REVEAL_END;

  journeyData.forEach((waypoint, index) => {
    const weight = waypoint.durationWeight ?? 1;
    const slice = (weight / totalWeight) * remaining;
    const isLast = index === journeyData.length - 1;
    const override = overrides?.[waypoint.id];
    const start = override?.start ?? cursor;
    // The last waypoint's segment always reaches exactly 1 — this is what
    // gives the final approach its "hold/settle" (§ Part K2 0.95-1.00): no
    // separate trailing band, just the last segment's own eased tail.
    const end = override?.end ?? (isLast ? 1 : cursor + slice);
    segments.push({ id: waypoint.id, start, end, waypoint });
    cursor = end;
  });

  return segments;
}

export interface ActiveSegment {
  segment: TimelineSegment;
  /** Eased-free local progress within the segment, 0..1. */
  localT: number;
  index: number;
}

/** Finds which segment a normalized global progress value currently falls in. */
export function getActiveSegment(timeline: TimelineSegment[], progress: number): ActiveSegment {
  const clamped = Math.min(1, Math.max(0, progress));
  for (let i = 0; i < timeline.length; i += 1) {
    const segment = timeline[i];
    if (clamped <= segment.end || i === timeline.length - 1) {
      const span = segment.end - segment.start;
      const localT = span > 0 ? (clamped - segment.start) / span : 1;
      return { segment, localT: Math.min(1, Math.max(0, localT)), index: i };
    }
  }
  const last = timeline[timeline.length - 1];
  return { segment: last, localT: 1, index: timeline.length - 1 };
}
