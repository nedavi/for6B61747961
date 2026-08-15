import type { KeyboardEvent, Ref } from 'react';

interface TextAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  status?: 'idle' | 'correct';
  ref?: Ref<HTMLInputElement>;
}

// Shared visual language for free-text and code answers: a bottom-line field,
// never a boxed form control (DESIGN.md Answer Chip principles carried over).
export function TextAnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel = 'Продолжить',
  disabled = false,
  status = 'idle',
  ref,
}: TextAnswerInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className={`text-answer-input${status === 'correct' ? ' text-answer-input--correct' : ''}`}>
      <input
        ref={ref}
        type="text"
        className="text-answer-input__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button
        type="button"
        className="text-answer-input__submit"
        onClick={onSubmit}
        disabled={disabled || value.trim().length === 0}
      >
        {submitLabel}
      </button>
    </div>
  );
}
