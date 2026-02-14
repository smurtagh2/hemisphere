/**
 * Sequencing Interaction Component
 *
 * An Analysis-stage interaction that asks the learner to arrange a list of
 * items into the correct order:
 *
 * 1. Items are presented in a shuffled order.
 * 2. Learner uses Up / Down buttons to reorder items.
 * 3. Learner submits their ordering.
 * 4. Each position is evaluated: green if the item is in the correct position,
 *    red if it is in the wrong position.
 * 5. The explanation is revealed and the learner may continue.
 *
 * MVP: click-based reordering (no drag-and-drop).
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, precise
 * motion. Follows the same CSS-variable conventions as ActiveRecall and MCQ.
 *
 * Telemetry:
 *   { type: 'sequencing:submitted', correct, accuracy, positions, timeMs }
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single item in the sequence. */
export interface SequencingItem {
  /** Stable unique identifier. */
  id: string;
  /** The text shown to the learner. */
  label: string;
}

/**
 * Per-position feedback after submission.
 * `itemId` is the id of the item the learner placed at this position.
 * `correct` is true when that matches the expected item at that position.
 */
export interface SequencingPosition {
  position: number;
  itemId: string;
  correct: boolean;
}

/** The single telemetry event emitted by this component. */
export interface SequencingTelemetryEvent {
  type: 'sequencing:submitted';
  /** Stable identifier of this interaction instance. */
  interactionId: string;
  /** True only when every position is correct. */
  correct: boolean;
  /** Fraction of positions in the correct place (0–1). */
  accuracy: number;
  /** Per-position breakdown. */
  positions: SequencingPosition[];
  /** Milliseconds from component mount to submit click. */
  timeMs: number;
}

/** Summary passed to onComplete. */
export interface SequencingResult {
  correct: boolean;
  accuracy: number;
  positions: SequencingPosition[];
  timeMs: number;
}

/** Props for the Sequencing component. */
export interface SequencingProps {
  /** Stable identifier for this interaction — included in all telemetry events. */
  id: string;
  /** The question or task prompt shown to the learner. */
  prompt: string;
  /**
   * Optional context label shown above the prompt (e.g. topic name).
   */
  context?: string;
  /**
   * Items in their CORRECT order.
   * The component will shuffle them before presenting to the learner.
   */
  items: SequencingItem[];
  /**
   * High-level explanation revealed after the learner submits.
   * Should explain the reasoning behind the correct order.
   */
  explanation: string;
  /**
   * Called whenever a telemetry event is emitted.
   */
  onTelemetry?: (event: SequencingTelemetryEvent) => void;
  /**
   * Called when the learner clicks "Continue" after reviewing feedback.
   */
  onComplete?: (result: SequencingResult) => void;
  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

type Phase = 'ordering' | 'feedback';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle — returns a new array, does not mutate the original. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Evaluate each position against the expected order. */
function evaluate(
  currentOrder: SequencingItem[],
  correctOrder: SequencingItem[],
): SequencingPosition[] {
  return currentOrder.map((item, index) => ({
    position: index,
    itemId: item.id,
    correct: item.id === correctOrder[index]?.id,
  }));
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

function IconChevronUp({ className = '' }: { className?: string }) {
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
        d="M3 9L7 5L11 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown({ className = '' }: { className?: string }) {
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
        d="M3 5L7 9L11 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SequenceRow sub-component
// ---------------------------------------------------------------------------

interface SequenceRowProps {
  item: SequencingItem;
  index: number;
  total: number;
  phase: Phase;
  /** Feedback for this row; only present when phase === 'feedback'. */
  feedback: SequencingPosition | null;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function SequenceRow({
  item,
  index,
  total,
  phase,
  feedback,
  onMoveUp,
  onMoveDown,
}: SequenceRowProps) {
  const isOrdering = phase === 'ordering';
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Compute border/background based on feedback state
  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;
  let positionNumberColor: string;
  let stateIcon: React.ReactNode = null;

  if (isOrdering) {
    borderColor = 'var(--analysis-border)';
    backgroundColor = 'var(--analysis-bg-secondary)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-text-secondary)';
  } else if (feedback?.correct) {
    borderColor = 'var(--analysis-correct)';
    backgroundColor = 'rgba(76,175,130,0.08)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-correct)';
    stateIcon = <IconCheck />;
  } else {
    borderColor = 'var(--analysis-incorrect)';
    backgroundColor = 'rgba(212,132,90,0.08)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-incorrect)';
    stateIcon = <IconCross />;
  }

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
        backgroundColor,
        color: textColor,
        transition:
          'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
          'background-color var(--duration-analysis-short) var(--ease-analysis)',
      }}
    >
      {/* Position number badge */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full)',
          border: `1px solid ${borderColor}`,
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          color: positionNumberColor,
          fontVariantNumeric: 'tabular-nums',
          transition: 'color var(--duration-analysis-short) var(--ease-analysis)',
        }}
      >
        {index + 1}
      </span>

      {/* Item label */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          fontWeight: 'var(--font-medium)',
        }}
      >
        {item.label}
      </span>

      {/* Feedback icon (check / cross) */}
      {phase === 'feedback' && stateIcon && (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: feedback?.correct
              ? 'var(--analysis-correct)'
              : 'var(--analysis-incorrect)',
          }}
        >
          {stateIcon}
        </span>
      )}

      {/* Up / Down reorder buttons — only shown during ordering phase */}
      {isOrdering && (
        <span
          style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}
          aria-label={`Reorder "${item.label}"`}
        >
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMoveUp(index)}
            aria-label={`Move "${item.label}" up`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: '1px solid var(--analysis-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isFirst ? 'transparent' : 'var(--analysis-bg-secondary)',
              color: isFirst ? 'var(--analysis-text-secondary)' : 'var(--analysis-text-primary)',
              opacity: isFirst ? 0.35 : 1,
              cursor: isFirst ? 'default' : 'pointer',
              transition:
                'background-color var(--duration-analysis-short) var(--ease-analysis)',
            }}
          >
            <IconChevronUp />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMoveDown(index)}
            aria-label={`Move "${item.label}" down`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: '1px solid var(--analysis-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isLast ? 'transparent' : 'var(--analysis-bg-secondary)',
              color: isLast ? 'var(--analysis-text-secondary)' : 'var(--analysis-text-primary)',
              opacity: isLast ? 0.35 : 1,
              cursor: isLast ? 'default' : 'pointer',
              transition:
                'background-color var(--duration-analysis-short) var(--ease-analysis)',
            }}
          >
            <IconChevronDown />
          </button>
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main Sequencing Component
// ---------------------------------------------------------------------------

export function Sequencing({
  id,
  prompt,
  context,
  items,
  explanation,
  onTelemetry,
  onComplete,
  className = '',
}: SequencingProps) {
  // Shuffle once on mount — stable ref so a re-render won't re-shuffle
  const initialOrderRef = useRef<SequencingItem[]>(shuffle(items));

  const [order, setOrder] = useState<SequencingItem[]>(initialOrderRef.current);
  const [phase, setPhase] = useState<Phase>('ordering');
  const [positions, setPositions] = useState<SequencingPosition[]>([]);
  const [result, setResult] = useState<{ correct: boolean; accuracy: number } | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // If the question identity changes (new `id`) reset everything
  useEffect(() => {
    const freshShuffle = shuffle(items);
    initialOrderRef.current = freshShuffle;
    setOrder(freshShuffle);
    setPhase('ordering');
    setPositions([]);
    setResult(null);
    startTimeRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Move an item one position up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  // Move an item one position down
  const handleMoveDown = useCallback((index: number) => {
    setOrder((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  }, []);

  // Submit the current ordering for evaluation
  const handleSubmit = useCallback(() => {
    const evaluated = evaluate(order, items);
    const correctCount = evaluated.filter((p) => p.correct).length;
    const accuracy = evaluated.length > 0 ? correctCount / evaluated.length : 0;
    const allCorrect = correctCount === evaluated.length;
    const timeMs = Date.now() - startTimeRef.current;

    setPositions(evaluated);
    setResult({ correct: allCorrect, accuracy });
    setPhase('feedback');

    onTelemetry?.({
      type: 'sequencing:submitted',
      interactionId: id,
      correct: allCorrect,
      accuracy,
      positions: evaluated,
      timeMs,
    });
  }, [order, items, id, onTelemetry]);

  // Continue after reviewing feedback
  const handleContinue = useCallback(() => {
    if (!result) return;
    const timeMs = Date.now() - startTimeRef.current;
    const finalResult: SequencingResult = {
      correct: result.correct,
      accuracy: result.accuracy,
      positions,
      timeMs,
    };
    onComplete?.(finalResult);
  }, [result, positions, onComplete]);

  // Build a lookup from itemId → position feedback for the current order
  const feedbackByItemId = React.useMemo(() => {
    const map = new Map<string, SequencingPosition>();
    for (const pos of positions) {
      map.set(pos.itemId, pos);
    }
    return map;
  }, [positions]);

  // Accuracy display string (e.g. "3 / 5 correct")
  const accuracyLabel =
    result !== null
      ? `${positions.filter((p) => p.correct).length} / ${positions.length} in correct position`
      : null;

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
            Sequencing
          </p>

          <CardTitle
            as="h2"
            className="leading-snug"
            style={{ color: 'var(--analysis-text-primary)', fontFamily: 'var(--font-analysis)' }}
          >
            {prompt}
          </CardTitle>

          {phase === 'ordering' && (
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--analysis-text-secondary)' }}
            >
              Arrange the items in the correct order, then submit.
            </p>
          )}
        </CardHeader>

        {/* ---- Sequence list ---- */}
        <CardContent>
          <ol
            aria-label="Items to sequence"
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {order.map((item, index) => (
              <SequenceRow
                key={item.id}
                item={item}
                index={index}
                total={order.length}
                phase={phase}
                feedback={feedbackByItemId.get(item.id) ?? null}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </ol>

          {/* ---- Feedback panel (post-submission) ---- */}
          {phase === 'feedback' && result && (
            <div
              className="mt-6 space-y-4"
              role="region"
              aria-label="Sequencing feedback"
              aria-live="polite"
            >
              {/* Result banner */}
              <div
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  border: `1px solid ${result.correct ? 'var(--analysis-correct)' : 'var(--analysis-incorrect)'}`,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: result.correct
                    ? 'rgba(76,175,130,0.1)'
                    : 'rgba(212,132,90,0.1)',
                  color: result.correct
                    ? 'var(--analysis-correct)'
                    : 'var(--analysis-incorrect)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                }}
              >
                {result.correct ? <IconCheck /> : <IconCross />}
                <span>
                  {result.correct ? 'Correct order' : `Incorrect — ${accuracyLabel}`}
                </span>
              </div>

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
          {phase === 'ordering' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSubmit}
              aria-label="Submit ordering"
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
