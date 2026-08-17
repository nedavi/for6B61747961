import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useExperience } from '../../state/ExperienceContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { journey } from '../../data/journey';
import { buildTimeline } from '../../data/timeline';
import { progressStore } from '../../three/progressStore';
import { CityPostcard } from './CityPostcard';
import { DestinationSidebar } from './DestinationSidebar';

// One viewport-height of scroll per journey stop, plus a little extra for the
// reveal/settle bands — grows with journey.length rather than a fixed number.
const VIEWPORT_HEIGHTS_PER_STOP = 1.3;

// DOM half of the real Earth journey (ARCHITECTURE.md §6/§7/§G). Owns exactly
// one ScrollTrigger, pinned, whose onUpdate is the single write point into
// progressStore — CameraRig and WaypointMarkers both read that same
// value every frame rather than each owning their own trigger (Part G). This
// component renders no Earth itself; PersistentVisualLayer (mounted once,
// separately, in App.tsx) owns the WebGL canvas underneath it.
export function EarthJourneyScene() {
  const { state } = useExperience();
  const sectionRef = useRef<HTMLElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const timeline = useRef(buildTimeline(journey)).current;
  // §K21: snap targets — waypoint arrival points only (`segment.end`), the
  // same value CameraRig treats as "closest approach" and CityPostcard/
  // DestinationSidebar treat as `arrivalAt`. §K17 re-added snap after §K15
  // removed it; §K20 tried patching the opening leg by adding early snap
  // targets, but that only widened the dead zone before the eventual jump —
  // still not "смooth." The actual fix is below, in `snapTo`: the opening
  // reveal→Beijing leg is excluded from snapping entirely now, not given
  // more snap targets to land on.
  const waypointArrivals = useRef(timeline.filter((segment) => segment.waypoint).map((segment) => segment.end)).current;

  // The scroll hint appears only once Earth's own auto-reveal has finished,
  // and only after 2s of no scroll input — direct feedback that the previous
  // 500ms delay fired too early, effectively overlapping the tail of the
  // non-scroll auto-reveal dolly-in rather than reading as a distinct "now
  // scroll" beat.
  useEffect(() => {
    if (!state.earthRevealed) return;
    const timer = window.setTimeout(() => setShowScrollHint(true), 2000);
    return () => window.clearTimeout(timer);
  }, [state.earthRevealed]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const scrollLength = Math.max(2, journey.length) * VIEWPORT_HEIGHTS_PER_STOP * window.innerHeight;

      // §K17: snap re-added, tuned differently than the version §K15 removed.
      // That version's `delay: 0.12` was short enough to engage after almost
      // any brief pause in an actively-in-progress scroll gesture — inertial
      // trackpad scrolling pauses between "flicks" constantly — yanking
      // progress mid-gesture, which is what read as "jerky." This version:
      // a longer `delay` so it only engages once scrolling has genuinely
      // stopped, and a slower, eased `duration` range so the snap itself
      // reads as a smooth glide to the nearest city rather than a jump.
      //
      // §K21: `snapTo` is a function, not the plain array §K17/§K20 used —
      // direct feedback ("резкий рывок к Пекину", "нужно чтобы плавно") is
      // that the reveal→Beijing leg specifically should never snap at all,
      // only scrub continuously; snapping only makes sense from one
      // waypoint's arrival to the next, where "throw me to the nearest
      // city" (the original ask that brought snap back in §K17) actually
      // applies. Below `waypointArrivals[0]` (Beijing's own arrival), this
      // returns the value unchanged — a no-op snap — so that whole leg is
      // pure 1:1 scroll with no artificial hold or jump; at or beyond it,
      // ordinary nearest-neighbor snapping among waypoint arrivals resumes.
      const snapTo = (value: number) => {
        if (value < waypointArrivals[0]) return value;
        let nearest = waypointArrivals[0];
        let minDist = Math.abs(value - nearest);
        for (const point of waypointArrivals) {
          const dist = Math.abs(value - point);
          if (dist < minDist) {
            minDist = dist;
            nearest = point;
          }
        }
        return nearest;
      };

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: `+=${scrollLength}`,
        pin: true,
        anticipatePin: 1,
        // Reduced motion still scrubs (progress must stay usable and keyboard/
        // wheel-scrollable), but without the smoothing lag, so nothing keeps
        // drifting once the user stops scrolling (Part T). Snap is skipped
        // entirely under reduced motion — an eased auto-glide is itself a
        // form of motion the user has asked to avoid.
        scrub: prefersReducedMotion ? true : 1,
        snap: prefersReducedMotion
          ? undefined
          : {
              snapTo,
              duration: { min: 0.5, max: 1.3 },
              delay: 0.25,
              ease: 'power2.inOut',
            },
        onUpdate: (self) => {
          progressStore.progress = self.progress;
          if (self.progress > 0.002 && !hasScrolled) setHasScrolled(true);
        },
      });

      return () => {
        trigger.kill();
        progressStore.progress = 0;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  );

  useGSAP(
    () => {
      if (!scrollHintRef.current) return;
      gsap.to(scrollHintRef.current, {
        opacity: showScrollHint && !hasScrolled ? 1 : 0,
        duration: prefersReducedMotion ? 0.15 : 0.8,
        ease: 'power2.out',
      });
    },
    { dependencies: [showScrollHint, hasScrolled, prefersReducedMotion] },
  );

  return (
    <section ref={sectionRef} className="earth-journey-scene" aria-label="Путешествие по Земле">
      <div ref={scrollHintRef} className="scroll-hint" style={{ opacity: 0 }} aria-hidden="true">
        <span className="scroll-hint__line" />
        <p className="scroll-hint__label">Листай дальше</p>
      </div>
      {journey.map((waypoint) => {
        if (!waypoint.postcard) return null;
        const segment = timeline.find((s) => s.waypoint?.id === waypoint.id);
        if (!segment) return null;
        return (
          <CityPostcard
            key={waypoint.id}
            postcard={waypoint.postcard}
            arrivalAt={segment.end}
            segmentWidth={segment.end - segment.start}
            label={waypoint.label}
          />
        );
      })}
      {journey.map((waypoint) => {
        if (!waypoint.info) return null;
        const segment = timeline.find((s) => s.waypoint?.id === waypoint.id);
        if (!segment) return null;
        // §K15: the sidebar docks to whichever side this waypoint's own
        // camera framing leaves empty. lookAtOffset.x > 0 shifts Earth toward
        // the right of frame (journey.ts's own doc comment on CameraPose) —
        // that's the "sidebar on the left" case this journey started with.
        // Roughly half of this journey's waypoints use a negative x for
        // orbital variety, which shifts Earth (and its marker) toward the
        // LEFT instead — for those, a fixed-left sidebar was landing right on
        // top of the marker/label. Docking to the opposite side is a direct
        // consequence of data already on the waypoint, not a guess.
        const side: 'left' | 'right' = (waypoint.camera.lookAtOffset?.x ?? 0) < 0 ? 'right' : 'left';
        return (
          <DestinationSidebar
            key={waypoint.id}
            info={waypoint.info}
            arrivalAt={segment.end}
            segmentWidth={segment.end - segment.start}
            label={waypoint.label}
            side={side}
          />
        );
      })}
    </section>
  );
}
