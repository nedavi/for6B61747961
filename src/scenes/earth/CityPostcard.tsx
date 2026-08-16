import { useEffect, useRef } from 'react';
import type { CityPostcard as CityPostcardData } from '../../data/journey';
import { progressStore } from '../../three/progressStore';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// Deliberately wider than WaypointMarker's own arrival envelope (§6, ~0.07/
// 0.045/0.09) — the postcard should reach full opacity only once the marker
// has already settled in, hold through the part of the approach where
// CameraRig's smoothstep easing is naturally near-static (no new scroll
// distance budgeted for this; it rides the existing "arrival slows down"
// window rather than reworking timeline.ts's pacing), and clear before the
// camera starts moving toward the next waypoint.
const FADE_IN = 0.05;
const HOLD = 0.05;
const FADE_OUT = 0.055;

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

interface CityPostcardProps {
  postcard: CityPostcardData;
  arrivalAt: number;
  label: string;
}

// Full-screen takeover at closest approach — the globe fades out entirely
// behind this and a short establishing-shot video fills the frame, like a
// postcard from the destination, then releases back to the globe as scroll
// carries on toward the next waypoint. Opacity is set imperatively via a
// rAF loop reading progressStore directly (§6/§G's "never React state for
// 60fps values" rule) rather than React state — this component lives
// outside the R3F <Canvas>, so it can't use useFrame the way WaypointMarker
// does; a plain rAF loop is the DOM equivalent.
export function CityPostcard({ postcard, arrivalAt, label }: CityPostcardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const tick = () => {
      const container = containerRef.current;
      if (container) {
        const opacity = proximity(progressStore.progress, arrivalAt);
        container.style.opacity = String(opacity);
        container.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';

        const video = videoRef.current;
        if (video && !prefersReducedMotion) {
          if (opacity > 0.01 && !isPlayingRef.current) {
            isPlayingRef.current = true;
            video.play().catch(() => {
              // Autoplay can be rejected before the first user gesture —
              // the poster frame still shows, and play() is retried on the
              // next tick since isPlayingRef only flips once it resolves.
              isPlayingRef.current = false;
            });
          } else if (opacity <= 0.01 && isPlayingRef.current) {
            isPlayingRef.current = false;
            video.pause();
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arrivalAt, prefersReducedMotion]);

  return (
    <div ref={containerRef} className="city-postcard" style={{ opacity: 0 }} aria-hidden="true">
      {prefersReducedMotion ? (
        <img className="city-postcard__media" src={postcard.poster} alt="" />
      ) : (
        <video
          ref={videoRef}
          className="city-postcard__media"
          src={postcard.video}
          poster={postcard.poster}
          muted
          loop
          playsInline
          preload="none"
        />
      )}
      <div className="city-postcard__scrim" />
      <p className="city-postcard__label">{label}</p>
    </div>
  );
}
