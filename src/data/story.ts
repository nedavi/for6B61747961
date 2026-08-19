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
    id: 'banner-letters',
    type: 'code',
    text: 'Сосчитай, сколько букв в надписи на растяжке «Happy Birthday» — без пробела.',
    placeholder: 'Введи число...',
    acceptedAnswers: ['13', 'тринадцать'],
    incorrectMessage: 'Не совсем.',
    hint: 'H-A-P-P-Y-B-I-R-T-H-D-A-Y.',
    submitLabel: 'Проверить',
  },
  {
    id: 'dubai-hotel',
    type: 'code',
    text: 'В каком отеле в Дубае мы с тобой отдыхали?',
    placeholder: 'Введи название...',
    acceptedAnswers: ['шератон', 'sheraton'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'kabinet-task',
    type: 'task',
    eyebrow: 'НЕ ВСЕ ОТВЕТЫ ЕСТЬ НА ЭТОМ ЭКРАНЕ',
    text: 'Для следующего придётся встать.',
    instruction: 'Зайди в кабинет и найди маленьких обитателей своего рабочего стола.',
    continueLabel: 'Я нашла',
  },
  {
    id: 'kabinet-code',
    type: 'code',
    text: 'Сколько их?',
    placeholder: 'Введи число...',
    acceptedAnswers: ['3', 'три'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
    continuesProgress: true,
  },
  {
    id: 'minion-kevin',
    type: 'code',
    text: 'В «Миньонах» именно этот высокий миньон с двумя глазами придумал отправиться искать нового хозяина. Как его зовут?',
    placeholder: 'Введи имя...',
    acceptedAnswers: ['кевин'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'minion-scarlet',
    type: 'code',
    text: 'Кому миньоны служили прямо перед тем, как нашли Грю?',
    placeholder: 'Введи имя...',
    acceptedAnswers: ['скарлет оверкилл', 'оверкилл', 'скарлет'],
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
  {
    id: 'today-feeling',
    type: 'choice',
    text: 'Что из этого — прямо про тебя сегодня?',
    answers: [
      { id: 'love-surprises', label: 'Обожаю сюрпризы' },
      { id: 'love-nervous', label: 'Обожаю, но уже нервничаю' },
      { id: 'love-suspect', label: 'Обожаю и уже что-то подозреваю' },
    ],
  },
  {
    id: 'blind-direction',
    type: 'choice',
    text: 'Не глядя: куда бы полетела дальше?',
    answers: [
      { id: 'east', label: 'Восток' },
      { id: 'south', label: 'Юг' },
      { id: 'you-choose', label: 'Куда скажешь' },
    ],
  },
  {
    id: 'riddle-pit',
    type: 'code',
    text: 'Чем больше из неё берёшь, тем больше она становится. Что это?',
    placeholder: 'Введи слово...',
    acceptedAnswers: ['яма'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'riddle-grandkids',
    type: 'code',
    text: 'У бабушки Иры пять внучек, и у каждой из них — один и тот же брат. Сколько всего внуков у бабушки?',
    placeholder: 'Введи число...',
    acceptedAnswers: ['6', 'шесть'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
  {
    id: 'riddle-cold',
    type: 'code',
    text: 'Что можно поймать, но нельзя бросить?',
    placeholder: 'Введи слово...',
    acceptedAnswers: ['простуда'],
    incorrectMessage: 'Не совсем.',
    submitLabel: 'Проверить',
  },
];
