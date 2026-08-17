import { useEffect, useMemo, useRef } from 'react';
import type { CityInfo } from '../../data/journey';
import { progressStore } from '../../three/progressStore';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

// §K15: fade-in/hold/fade-out used to be fixed fractions of the whole scroll
// range (0.05/0.09/0.06 ≈ 0.2 total) — sized for the original 3 widely-spaced
// waypoints. With 9, the average segment is only ~0.08 wide, so that fixed
// envelope spilled well past this waypoint's own segment and into the next
// one's — a previous waypoint's sidebar staying visible after scrolling well
// into the next waypoint's territory was exactly this. Scaling by the
// waypoint's own segment width keeps the envelope inside its own segment
// regardless of how many waypoints exist or how their durationWeights compare.
// §K22: cut hard again (0.22/0.44/0.2 → 0.05/0.08/0.04), same reasoning and
// same new fractions as WaypointMarker.tsx's `envelopeDurations` — direct
// instruction that the sidebar should appear only once the camera has
// settled on this waypoint and disappear as soon as it's left, not stay
// visible across most of the segment. Kept identical to the marker's
// envelope on purpose so both appear/disappear together.
function computeEnvelope(segmentWidth: number) {
  return {
    fadeIn: segmentWidth * 0.05,
    hold: segmentWidth * 0.08,
    fadeOut: segmentWidth * 0.04,
  };
}

function proximity(progress: number, arrivalAt: number, fadeIn: number, hold: number, fadeOut: number): number {
  if (progress < arrivalAt - fadeIn) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - fadeIn)) / fadeIn);
  if (progress < arrivalAt + hold) return 1;
  if (progress < arrivalAt + hold + fadeOut) return 1 - smoothstep((progress - (arrivalAt + hold)) / fadeOut);
  return 0;
}

interface DestinationSidebarProps {
  info: CityInfo;
  arrivalAt: number;
  segmentWidth: number;
  label: string;
  /** Which edge of the screen the panel docks to. Derived by the caller from
   *  this waypoint's own `camera.lookAtOffset.x` sign (§K15) — that value is
   *  what actually decides which side of the frame Earth (and therefore the
   *  marker) lands on, so the sidebar can reliably dock to the *other* side
   *  instead of guessing or always defaulting to left. */
  side: 'left' | 'right';
}

// Edge panel revealed once the camera has settled on a waypoint — the same
// deliberate "one exceptional panel" allowance DESIGN.md gives Gift Reveal,
// extended here since a description + a landmark photo gallery is genuinely
// more than a caption can carry. Docks to whichever side (left/right) K2's
// camera composition leaves empty for *this specific* waypoint (see `side`
// above) rather than always the left — half of this journey's camera poses
// weight Earth toward the left of frame instead of the right, and a
// fixed-left sidebar was landing directly over the marker/label for those.
// Opacity/position are driven imperatively from progressStore via rAF, same
// pattern as CityPostcard — this lives outside the R3F <Canvas>, so it can't
// useFrame the way WaypointMarker does.
export function DestinationSidebar({ info, arrivalAt, segmentWidth, label, side }: DestinationSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut } = useMemo(() => computeEnvelope(segmentWidth), [segmentWidth]);

  useEffect(() => {
    const tick = () => {
      const el = panelRef.current;
      if (el) {
        const t = proximity(progressStore.progress, arrivalAt, fadeIn, hold, fadeOut);
        el.style.opacity = String(t);
        el.style.transform = prefersReducedMotion ? 'none' : `translateY(${(1 - t) * 10}px)`;
        el.setAttribute('aria-hidden', t > 0.5 ? 'false' : 'true');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arrivalAt, fadeIn, hold, fadeOut, prefersReducedMotion]);

  return (
    <aside className={`destination-sidebar${side === 'right' ? ' destination-sidebar--right' : ''}`}>
      <div ref={panelRef} className="destination-sidebar__panel" style={{ opacity: 0 }} aria-hidden="true">
        <p className="destination-sidebar__label">{label}</p>
        <p className="destination-sidebar__description">{info.description}</p>
        {info.landmarks.length > 0 ? (
          <div className="destination-sidebar__landmarks">
            {info.landmarks.map((landmark) => (
              <figure key={landmark.name} className="destination-sidebar__landmark">
                {landmark.photo ? (
                  <img className="destination-sidebar__landmark-photo" src={landmark.photo} alt="" loading="lazy" />
                ) : null}
                <figcaption>{landmark.name}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
