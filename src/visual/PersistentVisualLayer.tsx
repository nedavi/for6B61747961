import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useExperience } from '../state/ExperienceContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// Code-split behind the Interactive-mode bundle (ARCHITECTURE.md §10) — Intro/
// Questions become interactive without paying for three/R3F until the journey
// actually needs it.
const EarthCanvas = lazy(() => import('../three/EarthCanvas').then((m) => ({ default: m.EarthCanvas })));

// Owns the WebGL layer's mount lifecycle, kept deliberately separate from
// AmbientBackground (visual/AmbientBackground.tsx) — see ARCHITECTURE.md §6a.
// Mounts once, the first time storyPhase reaches 'space-transition', and never
// unmounts again for the rest of the session (no WebGL context is ever
// recreated). Its own container crossfades in from opacity 0 while
// AmbientBackground crossfades out (driven from App.tsx), so the handoff reads
// as one continuous darkening/deepening rather than a cut to a black canvas.
export function PersistentVisualLayer() {
  const { state, dispatch } = useExperience();
  const [hasMounted, setHasMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const shouldMount = state.storyPhase === 'space-transition' || state.storyPhase === 'earth';

  useEffect(() => {
    if (shouldMount && !hasMounted) setHasMounted(true);
  }, [shouldMount, hasMounted]);

  useEffect(() => {
    if (!hasMounted || !containerRef.current) return;
    // Mirrors AmbientBackground's delayed, slower crossfade-out (Part 11) —
    // the WebGL star field visibly establishes itself over the same staged
    // window rather than popping in the instant the phase changes.
    gsap.to(containerRef.current, {
      opacity: 1,
      duration: prefersReducedMotion ? 0.4 : 4.2,
      delay: prefersReducedMotion ? 0 : 1.3,
      ease: 'power2.out',
    });
  }, [hasMounted, prefersReducedMotion]);

  if (!hasMounted) return null;

  return (
    <div ref={containerRef} className="persistent-visual-layer" style={{ opacity: 0 }} aria-hidden="true">
      <Suspense fallback={null}>
        <EarthCanvas revealed={state.storyPhase === 'earth'} onRevealed={() => dispatch({ type: 'EARTH_REVEALED' })} />
      </Suspense>
    </div>
  );
}
