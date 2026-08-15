import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useExperience } from '../../state/ExperienceContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// DESIGN.md Scene 05 — Space Transition. The darkening/star-reveal itself is
// entirely AmbientBackground's job now (its 'space-transition' phase config) —
// this scene only paces the two narrative lines and hands off to the Earth
// placeholder once they've played out (ARCHITECTURE.md §13/§17).
export function TransitionScene() {
  const { dispatch } = useExperience();
  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const settleHold = prefersReducedMotion ? 0.2 : 1.1;
      const lineFadeIn = prefersReducedMotion ? 0.15 : 0.8;
      const lineHold = prefersReducedMotion ? 0.3 : 1.2;
      const lineFadeOut = prefersReducedMotion ? 0.15 : 0.6;

      const tl = gsap.timeline({
        onComplete: () => dispatch({ type: 'ENTER_EARTH' }),
      });

      tl.to({}, { duration: settleHold });

      tl.to(line1Ref.current, { opacity: 1, duration: lineFadeIn, ease: 'power2.out' });
      tl.to(line1Ref.current, { opacity: 0, duration: lineFadeOut, ease: 'power2.in' }, `+=${lineHold}`);

      tl.to(line2Ref.current, { opacity: 1, duration: lineFadeIn, ease: 'power2.out' });
      tl.to(line2Ref.current, { opacity: 0, duration: lineFadeOut, ease: 'power2.in' }, `+=${lineHold}`);
    },
    { scope: containerRef, dependencies: [prefersReducedMotion] },
  );

  return (
    <section className="transition-scene" ref={containerRef} aria-hidden="true">
      <p className="transition-scene__line" ref={line1Ref}>
        Okay.
      </p>
      <p className="transition-scene__line" ref={line2Ref}>
        There&rsquo;s one more thing.
      </p>
    </section>
  );
}
