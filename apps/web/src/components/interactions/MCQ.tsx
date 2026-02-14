/**
 * MCQ (Multiple Choice Question) Interaction Component
 *
 * Analysis-stage interaction for active recall via multiple-choice questions.
 * Displays a question with 2–5 answer options, highlights the selection,
 * then reveals correct/incorrect feedback with per-option distractor rationale
 * (why wrong answers are wrong) and an overall explanation.
 *
 * Supports single-select (one correct answer) and multi-select (multiple
 * correct answers). Mode is inferred automatically from the data or can be
 * forced via the `forceSingleSelect` prop.
 *
 * Telemetry events emitted (via onTelemetry):
 *   - mcq:option_selected  — user selects or deselects an option
 *   - mcq:submitted        — user submits their answer(s)
 *   - mcq:completed        — user reads feedback and clicks "Continue"
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, geometric
 * shapes, precise motion. Follows the same CSS-variable reference conventions
 * as the ActiveRecall component.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single answer option in the MCQ. */
export interface MCQOption {
  /** Unique identifier for this option within the question. */
  id: string;
  /** The visible label / answer text. */
  label: string;
  /** Whether this option is a correct answer. */
  correct: boolean;
  /**
   * Distractor feedback shown after submission.
   *
   * For correct options: positive reinforcement or a brief explanation of
   * why this option is right.
   * For incorrect options: a concise explanation of why this option is wrong
   * (the distractor rationale).
   */
  rationale: string;
}

/** Discriminated union of all telemetry events emitted by MCQ. */
export type MCQTelemetryEvent =
  | {
      type: 'mcq:option_selected';
      questionId: string;
      optionId: string;
      /** True if the option was just selected; false if deselected. */
      selected: boolean;
      /** The full set of currently selected option ids after this interaction. */
      currentSelection: string[];
      /** Milliseconds since the question was first rendered. */
      elapsedMs: number;
    }
  | {
      type: 'mcq:submitted';
      questionId: string;
      selectedOptionIds: string[];
      /** True only when every correct option was chosen and no incorrect ones. */
      correct: boolean;
      /** True when at least one correct option was chosen but the answer is not fully correct. */
      partial: boolean;
      elapsedMs: number;
    }
  | {
      type: 'mcq:completed';
      questionId: string;
      selectedOptionIds: string[];
      correct: boolean;
      partial: boolean;
      /** Total milliseconds from question render to "Continue" click. */
      totalTimeMs: number;
    };

/** Summary passed to onComplete when the learner dismisses the feedback. */
export interface MCQResult {
  questionId: string;
  selectedOptionIds: string[];
  correct: boolean;
  partial: boolean;
  totalTimeMs: number;
}

/** Props for the MCQ component. */
export interface MCQProps {
  /** Stable identifier for this question — included in all telemetry events. */
  questionId: string;
  /** The question stem shown to the learner. */
  question: string;
  /**
   * Optional context label shown above the question stem (e.g. topic name).
   */
  context?: string;
  /**
   * Instruction line shown below the question stem.
   * Inferred automatically when omitted:
   *   single-answer → "Select one answer."
   *   multi-select  → "Select all that apply."
   */
  instruction?: string;
  /**
   * Answer options (2–5 items).
   * More than one option may be marked correct for multi-select questions.
   */
  options: MCQOption[];
  /**
   * High-level explanation of the correct answer shown in the feedback panel.
   * Complements per-option rationale with broader context.
   */
  explanation: string;
  /**
   * When true the component operates in single-select mode even if multiple
   * options are marked correct. Defaults to false (auto-detect from data).
   */
  forceSingleSelect?: boolean;
  /**
   * Called whenever a telemetry event is emitted.
   * Implementations may forward to an analytics service or learning record store.
   */
  onTelemetry?: (event: MCQTelemetryEvent) => void;
  /**
   * Called when the learner has reviewed feedback and clicked "Continue".
   * Receives the final result summary.
   */
  onComplete?: (result: MCQResult) => void;
  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal state machine
// ---------------------------------------------------------------------------

type Phase = 'answering' | 'feedback';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evaluate(
  options: MCQOption[],
  selectedIds: string[],
): { correct: boolean; partial: boolean } {
  const correctIds = options.filter((o) => o.correct).map((o) => o.id);
  const allCorrectSelected = correctIds.every((id) => selectedIds.includes(id));
  const noIncorrectSelected = selectedIds.every((id) => correctIds.includes(id));
  const correct = allCorrectSelected && noIncorrectSelected;
  const partial =
    !correct && selectedIds.some((id) => correctIds.includes(id));
  return { correct, partial };
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 7L5.5 10L11.5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCross({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMinus({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 7H10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// OptionButton
// ---------------------------------------------------------------------------

interface OptionButtonProps {
  option: MCQOption;
  multiSelect: boolean;
  phase: Phase;
  selected: boolean;
  onToggle: (id: string) => void;
}

function OptionButton({
  option,
  multiSelect,
  phase,
  selected,
  onToggle,
}: OptionButtonProps) {
  const isAnswering = phase === 'answering';
  const isCorrect = option.correct;

  // Classify this option's post-submission state
  const selectedCorrectly = selected && isCorrect;
  const selectedIncorrectly = selected && !isCorrect;
  const missedCorrect = !selected && isCorrect && phase === 'feedback';

  // Compute dynamic inline styles rather than relying on Tailwind arbitrary
  // values, so they always resolve to the CSS custom properties correctly.
  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;
  let rationaleColor: string;
  let stateIconElement: React.ReactNode = null;

  if (isAnswering) {
    if (selected) {
      borderColor = 'var(--analysis-accent-primary)';
      backgroundColor = 'rgba(74,158,222,0.08)';
      textColor = 'var(--analysis-text-primary)';
    } else {
      borderColor = 'var(--analysis-border)';
      backgroundColor = 'var(--analysis-bg-secondary)';
      textColor = 'var(--analysis-text-primary)';
    }
    rationaleColor = 'var(--analysis-text-secondary)';
  } else {
    if (selectedCorrectly) {
      borderColor = 'var(--analysis-correct)';
      backgroundColor = 'rgba(76,175,130,0.08)';
      textColor = 'var(--analysis-text-primary)';
      rationaleColor = 'var(--analysis-correct)';
      stateIconElement = <IconCheck />;
    } else if (selectedIncorrectly) {
      borderColor = 'var(--analysis-incorrect)';
      backgroundColor = 'rgba(212,132,90,0.08)';
      textColor = 'var(--analysis-text-primary)';
      rationaleColor = 'var(--analysis-incorrect)';
      stateIconElement = <IconCross />;
    } else if (missedCorrect) {
      borderColor = 'rgba(76,175,130,0.4)';
      backgroundColor = 'rgba(76,175,130,0.04)';
      textColor = 'var(--analysis-text-primary)';
      rationaleColor = 'var(--analysis-correct)';
      stateIconElement = <IconMinus />;
    } else {
      // unselected incorrect — dim
      borderColor = 'var(--analysis-border)';
      backgroundColor = 'rgba(26,35,50,0.4)';
      textColor = 'var(--analysis-text-secondary)';
      rationaleColor = 'var(--analysis-text-secondary)';
    }
  }

  // Selection indicator (checkbox / radio) inner fill
  let indicatorBorderColor: string;
  let indicatorBgColor: string;
  if (isAnswering) {
    indicatorBorderColor = selected
      ? 'var(--analysis-accent-primary)'
      : 'var(--analysis-border)';
    indicatorBgColor = selected ? 'var(--analysis-accent-primary)' : 'transparent';
  } else {
    indicatorBorderColor = isCorrect ? 'var(--analysis-correct)' : 'var(--analysis-border)';
    indicatorBgColor = isCorrect ? 'rgba(76,175,130,0.2)' : 'transparent';
  }

  return (
    <li>
      <button
        type="button"
        role={multiSelect ? 'checkbox' : 'radio'}
        aria-checked={selected}
        disabled={phase === 'feedback'}
        onClick={() => isAnswering && onToggle(option.id)}
        style={{
          borderColor,
          backgroundColor,
          color: textColor,
          transition:
            'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
            'background-color var(--duration-analysis-short) var(--ease-analysis)',
        }}
        className="
          w-full text-left
          flex items-start gap-3
          px-4 py-3
          border rounded-[var(--radius-sm)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)]
          disabled:cursor-default
        "
      >
        {/* Selection indicator: checkbox or radio */}
        <span
          aria-hidden="true"
          style={{
            borderColor: indicatorBorderColor,
            backgroundColor: indicatorBgColor,
            transition:
              'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
              'background-color var(--duration-analysis-short) var(--ease-analysis)',
            flexShrink: 0,
            marginTop: '2px',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderRadius: multiSelect ? 'var(--radius-sm)' : 'var(--radius-full)',
          }}
        >
          {isAnswering && selected && (
            multiSelect ? (
              <IconCheck className="text-white" />
            ) : (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'block',
                }}
              />
            )
          )}
        </span>

        {/* Label + distractor rationale */}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontWeight: 'var(--font-medium)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            {option.label}
          </span>

          {/* Rationale — only for selected options and missed-correct options */}
          {phase === 'feedback' && (selected || missedCorrect) && (
            <span
              style={{
                display: 'block',
                marginTop: '6px',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-relaxed)',
                color: rationaleColor,
              }}
            >
              {option.rationale}
            </span>
          )}
        </span>

        {/* State icon (check / cross / minus) after feedback */}
        {phase === 'feedback' && stateIconElement && (
          <span
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: '2px', color: rationaleColor }}
          >
            {stateIconElement}
          </span>
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// FeedbackBanner
// ---------------------------------------------------------------------------

interface FeedbackBannerProps {
  correct: boolean;
  partial: boolean;
}

function FeedbackBanner({ correct, partial }: FeedbackBannerProps) {
  let borderColor: string;
  let backgroundColor: string;
  let color: string;
  let label: string;
  let icon: React.ReactNode;

  if (correct) {
    borderColor = 'var(--analysis-correct)';
    backgroundColor = 'rgba(76,175,130,0.1)';
    color = 'var(--analysis-correct)';
    label = 'Correct';
    icon = <IconCheck />;
  } else if (partial) {
    borderColor = 'var(--analysis-partial)';
    backgroundColor = 'rgba(212,184,90,0.1)';
    color = 'var(--analysis-partial)';
    label = 'Partially correct';
    icon = <IconMinus />;
  } else {
    borderColor = 'var(--analysis-incorrect)';
    backgroundColor = 'rgba(212,132,90,0.1)';
    color = 'var(--analysis-incorrect)';
    label = 'Incorrect';
    icon = <IconCross />;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
        backgroundColor,
        color,
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MCQ Component
// ---------------------------------------------------------------------------

export function MCQ({
  questionId,
  question,
  context,
  instruction,
  options,
  explanation,
  forceSingleSelect = false,
  onTelemetry,
  onComplete,
  className = '',
}: MCQProps) {
  // Auto-detect mode: multi-select when more than one option is correct
  const correctCount = options.filter((o) => o.correct).length;
  const multiSelect = !forceSingleSelect && correctCount > 1;
  const resolvedInstruction =
    instruction ?? (multiSelect ? 'Select all that apply.' : 'Select one answer.');

  // State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');
  const [result, setResult] = useState<{ correct: boolean; partial: boolean } | null>(null);

  // Timing — wall-clock ms since first render
  const startTimeRef = useRef<number>(Date.now());
  const elapsed = useCallback(() => Date.now() - startTimeRef.current, []);

  // Reset when the question changes
  useEffect(() => {
    setSelectedIds([]);
    setPhase('answering');
    setResult(null);
    startTimeRef.current = Date.now();
  }, [questionId]);

  // Toggle an option
  const handleToggle = useCallback(
    (id: string) => {
      if (phase !== 'answering') return;

      setSelectedIds((prev) => {
        let next: string[];
        if (multiSelect) {
          next = prev.includes(id)
            ? prev.filter((sid) => sid !== id)
            : [...prev, id];
        } else {
          // Single-select: clicking the already-selected option deselects it
          next = prev.includes(id) ? [] : [id];
        }

        onTelemetry?.({
          type: 'mcq:option_selected',
          questionId,
          optionId: id,
          selected: next.includes(id),
          currentSelection: next,
          elapsedMs: elapsed(),
        });

        return next;
      });
    },
    [phase, multiSelect, questionId, onTelemetry, elapsed],
  );

  // Submit answer
  const handleSubmit = useCallback(() => {
    if (selectedIds.length === 0) return;

    const evalResult = evaluate(options, selectedIds);
    setResult(evalResult);
    setPhase('feedback');

    onTelemetry?.({
      type: 'mcq:submitted',
      questionId,
      selectedOptionIds: selectedIds,
      ...evalResult,
      elapsedMs: elapsed(),
    });
  }, [selectedIds, options, questionId, onTelemetry, elapsed]);

  // Dismiss feedback and continue
  const handleContinue = useCallback(() => {
    const totalTimeMs = elapsed();
    const finalResult: MCQResult = {
      questionId,
      selectedOptionIds: selectedIds,
      correct: result?.correct ?? false,
      partial: result?.partial ?? false,
      totalTimeMs,
    };

    onTelemetry?.({
      type: 'mcq:completed',
      questionId,
      selectedOptionIds: selectedIds,
      correct: finalResult.correct,
      partial: finalResult.partial,
      totalTimeMs,
    });

    onComplete?.(finalResult);
  }, [questionId, selectedIds, result, onTelemetry, onComplete, elapsed]);

  const canSubmit = selectedIds.length > 0;

  return (
    <div
      data-stage="analysis"
      className={`font-[var(--font-analysis)] ${className}`}
    >
      <Card padding="lg" className="border border-[var(--analysis-border)]">

        {/* ---- Header ---- */}
        <CardHeader>
          {context && (
            <p
              className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: 'var(--analysis-text-secondary)' }}
            >
              {context}
            </p>
          )}

          {/* Stage label */}
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--analysis-accent-primary)' }}
          >
            {multiSelect ? 'Multiple Select' : 'Multiple Choice'}
          </p>

          <CardTitle
            as="h2"
            className="leading-snug"
            style={{ color: 'var(--analysis-text-primary)', fontFamily: 'var(--font-analysis)' }}
          >
            {question}
          </CardTitle>

          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--analysis-text-secondary)' }}
          >
            {resolvedInstruction}
          </p>
        </CardHeader>

        {/* ---- Options ---- */}
        <CardContent>
          <ul
            role="group"
            aria-label="Answer options"
            className="space-y-2"
          >
            {options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                multiSelect={multiSelect}
                phase={phase}
                selected={selectedIds.includes(option.id)}
                onToggle={handleToggle}
              />
            ))}
          </ul>

          {/* ---- Feedback panel (post-submission) ---- */}
          {phase === 'feedback' && result && (
            <div
              className="mt-6 space-y-4"
              role="region"
              aria-label="Answer feedback"
            >
              {/* Result banner */}
              <FeedbackBanner correct={result.correct} partial={result.partial} />

              {/* Explanation */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--analysis-border)',
                  backgroundColor: 'var(--analysis-bg-secondary)',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--analysis-accent-secondary)' }}
                >
                  Explanation
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--analysis-text-primary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {explanation}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ---- Footer ---- */}
        <CardFooter>
          {phase === 'answering' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!canSubmit}
              onClick={handleSubmit}
              aria-label="Submit answer"
            >
              Submit
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleContinue}
              aria-label="Continue to next item"
            >
              Continue
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
