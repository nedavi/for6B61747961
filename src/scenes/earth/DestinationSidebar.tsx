import { useEffect, useRef } from 'react';
import type { CityInfo } from '../../data/journey';
import { progressStore } from '../../three/progressStore';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// Deliberately close to WaypointMarker's own arrival envelope (§6) but with a
// longer HOLD — there's a paragraph and a landmark list to read here, not
// just a label, so it needs to sit still on screen longer than the pin does.
const FADE_IN = 0.05;
const HOLD = 0.09;
const FADE_OUT = 0.06;

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function proximity(progress: number, arrivalAt: number): number {
  if (progress < arrivalAt - FADE_IN) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - FADE_IN)) / FADE_IN);
  if (progress < arrivalAt + HOLD) return 1;
  if (progress < arrivalAt + HOLD + FADE_OUT) return 1 - smoothstep((progress - (arrivalAt + HOLD)) / FADE_OUT);
  return 0;
}

interface DestinationSidebarProps {
  info: CityInfo;
  arrivalAt: number;
  label: string;
}

// Left-edge panel revealed once the camera has settled on a waypoint — the
// same deliberate "one exceptional panel" allowance DESIGN.md gives Gift
// Reveal, extended here since a description + photos + landmark list is
// genuinely more than a caption can carry. Sits in the negative space K2's
// camera composition already reserves on the left (Earth is weighted
// lower-right at every waypoint), so it doesn't compete with the globe or the
// on-globe marker/label. Opacity/position are driven imperatively from
// progressStore via rAF, same pattern as CityPostcard — this lives outside
// the R3F <Canvas>, so it can't useFrame the way WaypointMarker does.
export function DestinationSidebar({ info, arrivalAt, label }: DestinationSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const tick = () => {
      const el = panelRef.current;
      if (el) {
        const t = proximity(progressStore.progress, arrivalAt);
        el.style.opacity = String(t);
        el.style.transform = prefersReducedMotion ? 'none' : `translateY(${(1 - t) * 10}px)`;
        el.setAttribute('aria-hidden', t > 0.5 ? 'false' : 'true');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arrivalAt, prefersReducedMotion]);

  return (
    <aside className="destination-sidebar">
      <div ref={panelRef} className="destination-sidebar__panel" style={{ opacity: 0 }} aria-hidden="true">
        <p className="destination-sidebar__label">{label}</p>
        <p className="destination-sidebar__description">{info.description}</p>
        {info.photos ? (
          <div className="destination-sidebar__photos">
            <figure className="destination-sidebar__photo">
              <img src={info.photos.day} alt="" loading="lazy" />
              <figcaption>День</figcaption>
            </figure>
            <figure className="destination-sidebar__photo">
              <img src={info.photos.night} alt="" loading="lazy" />
              <figcaption>Ночь</figcaption>
            </figure>
          </div>
        ) : null}
        {info.landmarks && info.landmarks.length > 0 ? (
          <ul className="destination-sidebar__landmarks">
            {info.landmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
