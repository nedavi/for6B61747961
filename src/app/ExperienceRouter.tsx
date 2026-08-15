import { useExperience } from '../state/ExperienceContext';
import { IntroScene } from '../scenes/intro/IntroScene';
import { StoryStepScene } from '../scenes/story/StoryStepScene';
import { EmptyBeatScene } from '../scenes/story/EmptyBeatScene';
import { TransitionScene } from '../scenes/transition/TransitionScene';
import { EarthJourneyScene } from '../scenes/earth/EarthJourneyScene';

// Renders exactly one Interactive-mode scene at a time, keyed off storyPhase
// (ARCHITECTURE.md §1, §5). 'earth' now mounts the real scroll-driven journey —
// the WebGL Earth itself lives in PersistentVisualLayer (mounted separately in
// App.tsx), not here; this only renders the DOM half (pin/scroll-hint/markers).
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
    case 'earth':
      return <EarthJourneyScene />;
    default:
      return null;
  }
}
