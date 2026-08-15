import { ExperienceProvider, useExperience } from '../state/ExperienceContext';
import { ExperienceRouter } from './ExperienceRouter';
import { AmbientBackground } from '../visual/AmbientBackground';
import { PersistentVisualLayer } from '../visual/PersistentVisualLayer';
import { getBackgroundPhase } from '../visual/backgroundPhases';
import { story } from '../data/story';

// AmbientBackground sits behind ExperienceRouter and stays mounted across every
// Interactive-mode scene change, so the environment evolves continuously instead
// of cutting between scenes (ARCHITECTURE.md §17). PersistentVisualLayer mounts
// alongside it from 'space-transition' onward and crossfades in as
// AmbientBackground crossfades out — see ARCHITECTURE.md §6a/§D for why these
// are two deliberately separate systems rather than one.
function AppShell() {
  const { state } = useExperience();
  const currentStep = story[state.currentStepIndex];
  const backgroundPhase = getBackgroundPhase(state.storyPhase, currentStep, state.currentStepIndex, story.length);
  const ambientVisible = state.storyPhase !== 'space-transition' && state.storyPhase !== 'earth';
  // Drives the constellation reveal (visual/constellations.ts) — 0 through
  // intro, ramps across the six story.ts steps, holds at 1 from empty-beat
  // onward (the network stays fully drawn until space-transition dissolves
  // its connections, handled internally by AmbientBackground via `phase`).
  const storyProgress =
    state.storyPhase === 'story' ? state.currentStepIndex / Math.max(1, story.length - 1) : state.storyPhase === 'intro' ? 0 : 1;

  return (
    <>
      <AmbientBackground phase={backgroundPhase} visible={ambientVisible} storyProgress={storyProgress} />
      <PersistentVisualLayer />
      <ExperienceRouter />
    </>
  );
}

export function App() {
  return (
    <ExperienceProvider>
      <AppShell />
    </ExperienceProvider>
  );
}
