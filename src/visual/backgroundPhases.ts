import type { StoryPhase } from '../state/ExperienceContext';
import type { StoryStep } from '../data/story';

export type BackgroundPhase = 'intro' | 'early' | 'middle' | 'physical-task' | 'late' | 'space-transition';

export interface BackgroundPhaseConfig {
  /** Overall star field visibility/density, 0..1. */
  starOpacity: number;
  /** Violet nebula glow opacity, 0..1. */
  nebulaViolet: number;
  /** Atmospheric blue nebula glow opacity, 0..1. */
  nebulaBlue: number;
  /** Multiplier on twinkle/drift speed — lower feels slower, more still. */
  motionSpeed: number;
}

export const PHASE_CONFIG: Record<BackgroundPhase, BackgroundPhaseConfig> = {
  intro: { starOpacity: 0.3, nebulaViolet: 0.2, nebulaBlue: 0.0, motionSpeed: 0.35 },
  early: { starOpacity: 0.4, nebulaViolet: 0.26, nebulaBlue: 0.02, motionSpeed: 0.45 },
  middle: { starOpacity: 0.5, nebulaViolet: 0.24, nebulaBlue: 0.07, motionSpeed: 0.55 },
  'physical-task': { starOpacity: 0.35, nebulaViolet: 0.16, nebulaBlue: 0.05, motionSpeed: 0.2 },
  late: { starOpacity: 0.6, nebulaViolet: 0.15, nebulaBlue: 0.14, motionSpeed: 0.6 },
  'space-transition': { starOpacity: 0.85, nebulaViolet: 0.0, nebulaBlue: 0.1, motionSpeed: 0.8 },
};

/**
 * Background phase is derived from narrative position rather than tracked as
 * its own reducer state, so it can never disagree with story progress
 * (ARCHITECTURE.md §15/§17). Task and Code steps both read as 'physical-task'
 * since in this story they're one continuous clue-solving beat.
 */
export function getBackgroundPhase(
  storyPhase: StoryPhase,
  currentStep: StoryStep | undefined,
  stepIndex: number,
  totalSteps: number,
): BackgroundPhase {
  if (storyPhase === 'intro') return 'intro';
  if (storyPhase === 'space-transition' || storyPhase === 'earth-placeholder') return 'space-transition';
  if (storyPhase === 'empty-beat') return 'late';

  if (currentStep && (currentStep.type === 'task' || currentStep.type === 'code')) return 'physical-task';

  const fraction = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
  if (fraction < 0.34) return 'early';
  if (fraction < 0.67) return 'middle';
  return 'late';
}
