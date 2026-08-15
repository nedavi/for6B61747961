import { Stars } from '@react-three/drei';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// The WebGL layer's own star field — visually blends with AmbientBackground's
// Canvas2D stars during the crossfade (Part D/M). Deliberately restrained:
// no hyperspace movement, stars never fly toward the camera. drei's `speed`
// only drives a slow whole-field rotation/twinkle, not translation toward
// the viewer, which is what keeps this consistent with DESIGN.md's Ambient
// Star Field ("supporting imagery, never the primary content").
export function StarField() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Stars
      radius={220}
      depth={90}
      count={3200}
      factor={2.4}
      saturation={0}
      fade
      speed={prefersReducedMotion ? 0 : 0.25}
    />
  );
}
