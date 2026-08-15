import { gsap } from 'gsap';

// Single registration point for GSAP plugins, called once at app entry (ARCHITECTURE.md §7).
// Milestone 1 has no scroll-linked motion yet, so there is nothing to register beyond
// GSAP core — ScrollTrigger is added here in Milestone 2 when EarthJourneyScene is built.
export function registerGsap(): void {
  gsap.defaults({ ease: 'power2.out' });
}
