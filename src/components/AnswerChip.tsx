import type { Ref } from 'react';

interface AnswerChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  ref?: Ref<HTMLButtonElement>;
}

// DESIGN.md "Answer Button / Answer Chip" — a real button, never a styled <div>.
export function AnswerChip({ label, selected = false, disabled = false, onSelect, ref }: AnswerChipProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={`answer-chip${selected ? ' answer-chip--selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
