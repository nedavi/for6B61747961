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

  // The scroll hint appears only once Earth's own auto-reveal has finished —
  // before that, scroll may already work (progress just starts at 0), but the
  // hint shouldn't invite scrolling before there's anything to scroll toward.
  useEffect(() => {
    if (!state.earthRevealed) return;
    const timer = window.setTimeout(() => setShowScrollHint(true), 500);
    return () => window.clearTimeout(timer);
  }, [state.earthRevealed]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const scrollLength = Math.max(2, journey.length) * VIEWPORT_HEIGHTS_PER_STOP * window.innerHeight;

      // Snap targets: the very start, plus each waypoint's own arrival
      // progress (timeline.ts's segment.end) — "concrete states at the
      // cities," not an arbitrary grid. Scroll itself stays continuous while
      // the user is actively scrolling (scrub keeps it a live scrub, not a
      // slideshow); snap only takes over once they stop, easing progress the
      // rest of the way to whichever state is nearest. Disabled under
      // reduced motion — an automatic post-release scroll is itself a motion
      // effect, and every other reduced-motion path in this project drops
      // the extra movement rather than keeping a softened version of it.
      const snapTargets = [0, ...timeline.filter((segment) => segment.waypoint).map((segment) => segment.end)];

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: `+=${scrollLength}`,
        pin: true,
        anticipatePin: 1,
        // Reduced motion still scrubs (progress must stay usable and keyboard/
        // wheel-scrollable), but without the smoothing lag, so nothing keeps
        // drifting once the user stops scrolling (Part T).
        scrub: prefersReducedMotion ? true : 1,
        snap: prefersReducedMotion
          ? undefined
          : {
              snapTo: snapTargets,
              duration: { min: 0.35, max: 1.1 },
              delay: 0.12,
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
            label={waypoint.label}
          />
        );
      })}
      {journey.map((waypoint) => {
        if (!waypoint.info) return null;
        const segment = timeline.find((s) => s.waypoint?.id === waypoint.id);
        if (!segment) return null;
        return (
          <DestinationSidebar key={waypoint.id} info={waypoint.info} arrivalAt={segment.end} label={waypoint.label} />
        );
      })}
    </section>
  );
}
