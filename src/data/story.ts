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

// Prototype copy, Russian — temporary content, will be replaced with the real
// apartment clue and final copy before launch. See ARCHITECTURE.md §4.
export const story: StoryStep[] = [
  {
    id: 'disappear',
    type: 'choice',
    text: 'Если бы можно было исчезнуть на несколько дней — что бы ты выбрала?',
    answers: [
      { id: 'warm', label: 'Туда, где тепло' },
      { id: 'alive', label: 'Туда, где всё кипит' },
      { id: 'quiet', label: 'Туда, где тихо' },
    ],
  },
  {
    id: 'anywhere',
    type: 'text',
    text: 'Если бы прямо сейчас можно было оказаться где угодно — куда бы ты отправилась?',
    placeholder: 'Напиши любое место...',
    submitLabel: 'Продолжить',
  },
  {
    id: 'matters-more',
    type: 'choice',
    text: 'Что для тебя важнее?',
    answers: [
      { id: 'place', label: 'Само место' },
      { id: 'people', label: 'Люди рядом' },
      { id: 'story', label: 'История, которая останется' },
    ],
  },
  {
    id: 'physical-clue',
    type: 'task',
    eyebrow: 'НЕ ВСЕ ОТВЕТЫ ЕСТЬ НА ЭТОМ ЭКРАНЕ',
    text: 'Для следующего придётся встать.',
    instruction: 'Найди место, где ты видишь себя каждый день.',
    continueLabel: 'Я нашла',
  },
  {
    id: 'clue-code',
    type: 'code',
    text: 'Что ты там нашла?',
    placeholder: 'Введи слово...',
    // Accept both the Latin word and its Russian transliteration — kept
    // internal only, never rendered (see normalizeAnswer() below).
    acceptedAnswers: ['orbit', 'орбит'],
    incorrectMessage: 'Не совсем.',
    hint: 'Посмотри внимательнее на то, что ты нашла.',
    submitLabel: 'Проверить',
    continuesProgress: true,
  },
  {
    id: 'trust',
    type: 'choice',
    text: 'Последний вопрос. Ты мне доверяешь?',
    isFinal: true,
    answers: [
      { id: 'yes', label: 'Да' },
      { id: 'think-so', label: 'Кажется, да' },
    ],
  },
];
