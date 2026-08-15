import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useExperience } from '../../state/ExperienceContext';
import { story, getProgress, normalizeAnswer } from '../../data/story';
import { AnswerChip } from '../../components/AnswerChip';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { TextAnswerInput } from '../../components/TextAnswerInput';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const HOLD_MS = 400;
const HOLD_MS_REDUCED = 150;
const HINT_ATTEMPT_THRESHOLD = 2;

// One shell for every step type in story.ts (choice / text / task / code) so the
// entrance/exit choreography and progress bookkeeping never diverge between them
// (ARCHITECTURE.md §3/§17). The total is always story.length, never a fixed count.
export function StoryStepScene() {
  const { state, dispatch } = useExperience();
  const step = story[state.currentStepIndex];
  const progress = getProgress(story, state.currentStepIndex);
  const isFinalStep = Boolean(step.isFinal);
  const prefersReducedMotion = usePrefersReducedMotion();

  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [taskConfirmed, setTaskConfirmed] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'incorrect' | 'correct'>('idle');
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Reset local per-step state whenever a new step is shown.
  useEffect(() => {
    setSelectedAnswerId(null);
    setTaskConfirmed(false);
    setTextValue('');
    setCodeStatus('idle');
    setCodeAttempts(0);
    setIsExiting(false);
  }, [step.id]);

  // Entrance: headline lands first, then the interactive body follows with a
  // short stagger. The container is reset to identity first, since the exit
  // tween (below) leaves it faded/blurred out when advancing between steps.
  useGSAP(
    () => {
      const container = contentRef.current;
      if (!container) return;

      gsap.set(container, { opacity: 1, y: 0, filter: 'blur(0px)' });

      const headlineEl = container.querySelector<HTMLElement>('.story-step-scene__text');
      const bodyEls = container.querySelectorAll<HTMLElement>('.answer-chip, .story-step-scene__body-item');

      if (prefersReducedMotion) {
        gsap.fromTo(
          [headlineEl, ...Array.from(bodyEls)],
          { opacity: 0 },
          { opacity: 1, duration: 0.15, stagger: 0.04, ease: 'power1.out' },
        );
        return;
      }

      const tl = gsap.timeline();
      if (headlineEl) {
        tl.fromTo(
          headlineEl,
          { opacity: 0, y: 10, filter: 'blur(6px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' },
        );
      }
      tl.fromTo(
        bodyEls,
        { opacity: 0, y: 8, filter: 'blur(4px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out', stagger: 0.08 },
        '-=0.35',
      );
    },
    { scope: contentRef, dependencies: [step.id, prefersReducedMotion] },
  );

  // Focus the first interactive element once it has entered, without scrolling.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const target = contentRef.current?.querySelector<HTMLElement>('input, button:not(:disabled)');
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [step.id]);

  function resolve(value?: string) {
    if (isExiting) return;
    setIsExiting(true);
    if (value !== undefined) {
      dispatch({ type: 'ANSWER_STEP', stepId: step.id, value });
    }

    const holdMs = prefersReducedMotion ? HOLD_MS_REDUCED : HOLD_MS;
    window.setTimeout(() => {
      const advance = () => {
        dispatch(isFinalStep ? { type: 'STEPS_DONE' } : { type: 'ADVANCE_STEP' });
      };

      const container = contentRef.current;
      if (!container) {
        advance();
        return;
      }

      if (prefersReducedMotion) {
        gsap.to(container, { opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: advance });
      } else {
        gsap.to(container, {
          opacity: 0,
          y: -8,
          filter: 'blur(6px)',
          duration: 0.35,
          ease: 'power2.in',
          onComplete: advance,
        });
      }
    }, holdMs);
  }

  function handleChoiceSelect(answerId: string) {
    if (selectedAnswerId || isExiting) return;
    setSelectedAnswerId(answerId);
    resolve(answerId);
  }

  function handleTextSubmit() {
    if (isExiting) return;
    const trimmed = textValue.trim();
    if (!trimmed) return;
    resolve(trimmed);
  }

  function handleTaskConfirm() {
    if (isExiting) return;
    setTaskConfirmed(true);
    resolve('confirmed');
  }

  function handleCodeSubmit() {
    if (isExiting || step.type !== 'code' || codeStatus === 'correct') return;
    const normalized = normalizeAnswer(textValue);
    if (!normalized) return;

    const isCorrect = step.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalized);
    if (isCorrect) {
      setCodeStatus('correct');
      resolve(normalized);
    } else {
      setCodeStatus('incorrect');
      setCodeAttempts((n) => n + 1);
    }
  }

  return (
    <section className="story-step-scene" aria-label={`Step ${progress.current} of ${progress.total}`}>
      <ProgressIndicator current={progress.current} total={progress.total} />
      <div className="story-step-scene__content" ref={contentRef}>
        {step.eyebrow ? <p className="story-step-scene__eyebrow">{step.eyebrow}</p> : null}
        <h1 className="story-step-scene__text">{step.text}</h1>

        {step.type === 'choice' ? (
          <div className="story-step-scene__answers" role="group" aria-label="Answers">
            {step.answers.map((answer) => (
              <AnswerChip
                key={answer.id}
                label={answer.label}
                selected={selectedAnswerId === answer.id}
                disabled={isExiting || (selectedAnswerId !== null && selectedAnswerId !== answer.id)}
                onSelect={() => handleChoiceSelect(answer.id)}
              />
            ))}
          </div>
        ) : null}

        {step.type === 'text' ? (
          <div className="story-step-scene__body-item">
            <TextAnswerInput
              value={textValue}
              onChange={setTextValue}
              onSubmit={handleTextSubmit}
              placeholder={step.placeholder}
              submitLabel={step.submitLabel ?? 'Continue'}
              disabled={isExiting}
            />
          </div>
        ) : null}

        {step.type === 'task' ? (
          <>
            <p className="story-step-scene__instruction story-step-scene__body-item">{step.instruction}</p>
            <div className="story-step-scene__body-item">
              <AnswerChip
                label={step.continueLabel ?? 'Continue'}
                selected={taskConfirmed}
                disabled={isExiting}
                onSelect={handleTaskConfirm}
              />
            </div>
          </>
        ) : null}

        {step.type === 'code' ? (
          <>
            <div className="story-step-scene__body-item">
              <TextAnswerInput
                value={textValue}
                onChange={(next) => {
                  setTextValue(next);
                  if (codeStatus === 'incorrect') setCodeStatus('idle');
                }}
                onSubmit={handleCodeSubmit}
                placeholder={step.placeholder}
                submitLabel={step.submitLabel ?? 'Submit'}
                disabled={isExiting}
                status={codeStatus === 'correct' ? 'correct' : 'idle'}
              />
            </div>
            {codeStatus === 'incorrect' ? (
              <p className="story-step-scene__feedback" role="status">
                {step.incorrectMessage ?? 'Not quite.'}
              </p>
            ) : null}
            {step.hint && codeAttempts >= HINT_ATTEMPT_THRESHOLD && codeStatus !== 'correct' ? (
              <p className="story-step-scene__hint">{step.hint}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
