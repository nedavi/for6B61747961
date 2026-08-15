import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useExperience } from '../../state/ExperienceContext';
import { AnswerChip } from '../../components/AnswerChip';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// DESIGN.md "Intro Title Block" — temporary prototype copy, replaced later.
export function IntroScene() {
  const { dispatch } = useExperience();
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const targets = containerRef.current?.querySelectorAll<HTMLElement>('.intro-scene__animate');
      if (!targets || targets.length === 0) return;

      if (prefersReducedMotion) {
        gsap.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.05, ease: 'power1.out' });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y: 10, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out', stagger: 0.12 },
      );
    },
    { scope: containerRef, dependencies: [prefersReducedMotion] },
  );

  return (
    <section className="intro-scene" ref={containerRef}>
      <div className="intro-scene__content">
        <p className="intro-scene__kicker intro-scene__animate">FOR YOU</p>
        <h1 className="intro-scene__title intro-scene__animate">I have a few questions.</h1>
        <p className="intro-scene__supporting intro-scene__animate">Don&rsquo;t think too much.</p>
        <div className="intro-scene__action intro-scene__animate">
          <AnswerChip label="Begin" onSelect={() => dispatch({ type: 'START' })} />
        </div>
      </div>
    </section>
  );
}
