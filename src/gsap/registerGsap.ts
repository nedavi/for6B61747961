import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Single registration point for GSAP plugins, called once at app entry (ARCHITECTURE.md §7).
// ScrollTrigger drives EarthJourneyScene's pinned scroll timeline (Milestone 2) — every
// other scene still uses plain imperative GSAP timelines, not scroll.
export function registerGsap(): void {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power2.out' });
}
