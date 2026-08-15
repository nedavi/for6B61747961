import { ExperienceProvider, useExperience } from '../state/ExperienceContext';
import { ExperienceRouter } from './ExperienceRouter';
import { AmbientBackground } from '../visual/AmbientBackground';
import { getBackgroundPhase } from '../visual/backgroundPhases';
import { story } from '../data/story';

// AmbientBackground sits behind ExperienceRouter and stays mounted across every
// Interactive-mode scene change, so the environment evolves continuously instead
// of cutting between scenes (ARCHITECTURE.md §17).
function AppShell() {
  const { state } = useExperience();
  const currentStep = story[state.currentStepIndex];
  const backgroundPhase = getBackgroundPhase(state.storyPhase, currentStep, state.currentStepIndex, story.length);

  return (
    <>
      <AmbientBackground phase={backgroundPhase} />
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
