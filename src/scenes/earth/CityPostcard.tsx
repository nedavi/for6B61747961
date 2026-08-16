import { useEffect, useRef } from 'react';
import type { CityPostcard as CityPostcardData } from '../../data/journey';
import { progressStore } from '../../three/progressStore';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// §K15: converted to fractions of the waypoint's own segment width rather
// than fixed absolute values — with 9 waypoints (up from the original 3) a
// fixed-width envelope could spill into a neighboring waypoint's segment.
// Not currently exercised by any live waypoint (no `postcard` is set yet,
// §K4), but kept consistent with WaypointMarker/DestinationSidebar's fix for
// whenever one is added.
function computeEnvelope(segmentWidth: number) {
  return {
    fadeIn: segmentWidth * 0.25,
    hold: segmentWidth * 0.25,
    fadeOut: segmentWidth * 0.27,
  };
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function proximity(progress: number, arrivalAt: number, fadeIn: number, hold: number, fadeOut: number): number {
  if (progress < arrivalAt - fadeIn) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - fadeIn)) / fadeIn);
  if (progress < arrivalAt + hold) return 1;
  if (progress < arrivalAt + hold + fadeOut) return 1 - smoothstep((progress - (arrivalAt + hold)) / fadeOut);
  return 0;
}

interface CityPostcardProps {
  postcard: CityPostcardData;
  arrivalAt: number;
  segmentWidth: number;
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
export function CityPostcard({ postcard, arrivalAt, segmentWidth, label }: CityPostcardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut } = computeEnvelope(segmentWidth);

  useEffect(() => {
    const tick = () => {
      const container = containerRef.current;
      if (container) {
        const opacity = proximity(progressStore.progress, arrivalAt, fadeIn, hold, fadeOut);
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
  }, [arrivalAt, fadeIn, hold, fadeOut, prefersReducedMotion]);

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
