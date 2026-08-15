interface ProgressIndicatorProps {
  current: number;
  total: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// DESIGN.md "Progress Indicator" — decorative only; the real count is exposed via
// aria-label on the StoryStepScene container, so this is hidden from assistive tech.
export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <div className="progress-indicator" aria-hidden="true">
      {pad(current)} / {pad(total)}
    </div>
  );
}
