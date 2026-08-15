export interface AnswerOption {
  id: string;
  label: string;
}

interface StoryStepBase {
  id: string;
  eyebrow?: string;
  text: string;
  isFinal?: boolean;
  /**
   * When true, this step shares its progress beat with the step immediately
   * before it instead of incrementing the count — e.g. a Task + Code pair
   * that together represent one physical clue. See getProgress() below.
   */
  continuesProgress?: boolean;
}

export interface ChoiceStep extends StoryStepBase {
  type: 'choice';
  answers: AnswerOption[];
}

export interface TextStep extends StoryStepBase {
  type: 'text';
  placeholder?: string;
  submitLabel?: string;
}

export interface TaskStep extends StoryStepBase {
  type: 'task';
  instruction: string;
  continueLabel?: string;
}

export interface CodeStep extends StoryStepBase {
  type: 'code';
  placeholder?: string;
  acceptedAnswers: string[];
  incorrectMessage?: string;
  hint?: string;
  submitLabel?: string;
}

export type StoryStep = ChoiceStep | TextStep | TaskStep | CodeStep;

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Progress display collapses any step marked `continuesProgress` into the
 * beat of the step before it, so a Task + Code pair reads as one number
 * (e.g. "04 / 05") instead of counting as two separate steps.
 */
export function getProgress(steps: StoryStep[], index: number): { current: number; total: number } {
  let beat = 0;
  let current = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (!steps[i].continuesProgress) beat += 1;
    if (i === index) current = beat;
  }
  return { current, total: beat };
}

// Prototype copy for Milestone 1 — placeholder content, will be replaced.
export const story: StoryStep[] = [
  {
    id: 'disappear',
    type: 'choice',
    text: 'If you could disappear for a few days, what would you choose?',
    answers: [
      { id: 'warm', label: 'Somewhere warm' },
      { id: 'alive', label: 'Somewhere alive' },
      { id: 'quiet', label: 'Somewhere quiet' },
    ],
  },
  {
    id: 'anywhere',
    type: 'text',
    text: "Where would you go if you didn't have to think about it?",
    placeholder: 'Anywhere...',
    submitLabel: 'Continue',
  },
  {
    id: 'matters-more',
    type: 'choice',
    text: 'What matters more?',
    answers: [
      { id: 'place', label: 'The place' },
      { id: 'people', label: 'The people' },
      { id: 'story', label: 'The story' },
    ],
  },
  {
    id: 'physical-clue',
    type: 'task',
    eyebrow: 'NOT EVERYTHING IS ON THIS SCREEN',
    text: 'Stand up for this one.',
    instruction: 'Find the place where you see yourself every day.',
    continueLabel: 'I found it',
  },
  {
    id: 'clue-code',
    type: 'code',
    text: 'What did you find?',
    placeholder: 'Type the word...',
    acceptedAnswers: ['orbit'],
    incorrectMessage: 'Not quite.',
    hint: 'Look closer at the clue.',
    submitLabel: 'Submit',
    continuesProgress: true,
  },
  {
    id: 'trust',
    type: 'choice',
    text: 'One last thing. Do you trust me?',
    isFinal: true,
    answers: [
      { id: 'yes', label: 'Yes' },
      { id: 'think-so', label: 'I think so' },
    ],
  },
];
