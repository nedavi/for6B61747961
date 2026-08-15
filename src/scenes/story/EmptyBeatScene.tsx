import { useEffect } from 'react';
import { useExperience } from '../../state/ExperienceContext';

const EMPTY_BEAT_MS = 1000;

// DESIGN.md Scene 04 — a deliberate near-empty pause, not a loading state.
// Progression is time-based, not animation-based, so it advances the same
// way regardless of prefers-reduced-motion.
export function EmptyBeatScene() {
  const { dispatch } = useExperience();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dispatch({ type: 'ENTER_SPACE_TRANSITION' });
    }, EMPTY_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [dispatch]);

  return <section className="empty-beat-scene" aria-hidden="true" />;
}
