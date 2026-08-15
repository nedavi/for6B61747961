import { useExperience } from '../state/ExperienceContext';
import { IntroScene } from '../scenes/intro/IntroScene';
import { StoryStepScene } from '../scenes/story/StoryStepScene';
import { EmptyBeatScene } from '../scenes/story/EmptyBeatScene';
import { TransitionScene } from '../scenes/transition/TransitionScene';
import { EarthPlaceholderScene } from '../scenes/earth/EarthPlaceholderScene';

// Renders exactly one Interactive-mode scene at a time, keyed off storyPhase
// (ARCHITECTURE.md §1, §5). The Cinematic-mode document (Earth journey onward)
// arrives in Milestone 2 — 'earth-placeholder' is this milestone's stand-in stop.
export function ExperienceRouter() {
  const { state } = useExperience();

  switch (state.storyPhase) {
    case 'intro':
      return <IntroScene />;
    case 'story':
      return <StoryStepScene />;
    case 'empty-beat':
      return <EmptyBeatScene />;
    case 'space-transition':
      return <TransitionScene />;
    case 'earth-placeholder':
      return <EarthPlaceholderScene />;
    default:
      return null;
  }
}
