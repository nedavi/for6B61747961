import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

// Current subset of the StoryPhase enum from ARCHITECTURE.md §5. 'earth' now
// mounts the real PersistentVisualLayer/EarthJourneyScene (Milestone 2) —
// 'destination-reveal' / 'gift-reveal' / 'final' are still future work.
export type StoryPhase =
  | 'intro'
  | 'story'
  | 'empty-beat'
  | 'space-transition'
  | 'earth';

export interface ExperienceState {
  storyPhase: StoryPhase;
  currentStepIndex: number;
  /** stepId -> the value that resolved that step: a choice's answer id, a free-text
   *  answer, a task's confirmation marker, or a validated code's normalized value. */
  answers: Record<string, string>;
  /** Flips once PersistentVisualLayer's auto Earth-opacity reveal (Part F) has
   *  finished — this is what EarthJourneyScene waits for before showing the
   *  "Листай дальше" scroll hint and handing control to scroll. A single one-shot
   *  flip like this belongs in narrative state; 60fps scroll progress does not
   *  (see three/progressStore.ts) — that distinction is deliberate. */
  earthRevealed: boolean;
}

export type ExperienceAction =
  | { type: 'START' }
  | { type: 'ANSWER_STEP'; stepId: string; value: string }
  | { type: 'ADVANCE_STEP' }
  | { type: 'STEPS_DONE' }
  | { type: 'ENTER_SPACE_TRANSITION' }
  | { type: 'ENTER_EARTH' }
  | { type: 'EARTH_REVEALED' }
  | { type: 'RESET' };

const initialState: ExperienceState = {
  storyPhase: 'intro',
  currentStepIndex: 0,
  answers: {},
  earthRevealed: false,
};

function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case 'START':
      return { ...state, storyPhase: 'story', currentStepIndex: 0 };
    case 'ANSWER_STEP':
      return {
        ...state,
        answers: { ...state.answers, [action.stepId]: action.value },
      };
    case 'ADVANCE_STEP':
      return { ...state, currentStepIndex: state.currentStepIndex + 1 };
    case 'STEPS_DONE':
      return { ...state, storyPhase: 'empty-beat' };
    case 'ENTER_SPACE_TRANSITION':
      return { ...state, storyPhase: 'space-transition' };
    case 'ENTER_EARTH':
      return { ...state, storyPhase: 'earth' };
    case 'EARTH_REVEALED':
      return { ...state, earthRevealed: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface ExperienceContextValue {
  state: ExperienceState;
  dispatch: Dispatch<ExperienceAction>;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(experienceReducer, initialState);
  return (
    <ExperienceContext.Provider value={{ state, dispatch }}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) {
    throw new Error('useExperience must be used within an ExperienceProvider');
  }
  return ctx;
}
