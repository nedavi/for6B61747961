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

// Real content for Katya's 21st birthday — 21 steps total (3 choice, 18
// validated code/riddle), built in batches of 5 per direct instruction.
// `isFinal` moves to whichever step actually ends up last once all 21 exist —
// none of the steps below are final yet, more batches are still coming.
export const story: StoryStep[] = [
  {
    id: 'school-desk',
    type: 'code',
    text: 'Где мы с тобой в детстве сидели за одной партой?',
    placeholder: 'Напиши одним словом...',
    acceptedAnswers: ['школа', 'в школе', 'школе'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'years-together',
    type: 'code',
    text: 'Сколько лет мы уже вместе?',
    placeholder: 'Введи число...',
    acceptedAnswers: ['6', 'шесть', '6 лет', 'шесть лет'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'highheels-teacher',
    type: 'code',
    text: 'Как зовут твою преподавательницу по хайхилзу?',
    placeholder: 'Введи имя...',
    acceptedAnswers: ['маша', 'мария'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'english-teacher',
    type: 'code',
    text: 'Как зовут твою преподавательницу по английскому?',
    placeholder: 'Введи имя...',
    acceptedAnswers: ['даша', 'дарья'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'riddle-map',
    type: 'code',
    text: 'Города есть, а домов нет. Леса есть, а деревьев нет. Реки есть, а воды нет. Что это?',
    placeholder: 'Введи слово...',
    acceptedAnswers: ['карта'],
    incorrectMessage: 'Не совсем.',
    hint: 'То, чем пользуются перед путешествием.',
    submitLabel: 'Проверить',
  },
];
