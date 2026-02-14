/**
 * ActiveRecall Interaction Component
 *
 * An Analysis-stage interaction that implements the free-recall learning technique:
 * 1. Learner reads the prompt/question
 * 2. Learner writes a free-response answer from memory
 * 3. Learner reveals the expected answer and compares
 * 4. Learner self-rates their recall quality (1–5)
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, precise motion.
 * Telemetry: Emits `response`, `rating`, and `time_spent` events via onTelemetry.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { TextArea } from '../ui/TextArea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Telemetry event names emitted by this component */
export type ActiveRecallEventName = 'response' | 'rating' | 'time_spent';

/** Payload shape for each telemetry event */
export interface ActiveRecallTelemetryEvent {
  /** Identifier of the interaction (matches the `id` prop) */
  interactionId: string;
  /** Event type */
  event: ActiveRecallEventName;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Event-specific payload */
  payload: ActiveRecallResponsePayload | ActiveRecallRatingPayload | ActiveRecallTimePayload;
}

export interface ActiveRecallResponsePayload {
  /** The learner's written response */
  response: string;
  /** Character count of the response */
  responseLength: number;
}

export interface ActiveRecallRatingPayload {
  /** Self-rated recall quality, 1 (forgot) to 5 (perfect) */
  rating: ActiveRecallRating;
}

export interface ActiveRecallTimePayload {
  /** Time in milliseconds from component mount to final rating submission */
  totalMs: number;
  /** Time in milliseconds spent writing the response */
  writingMs: number;
}

/** Self-rating scale: 1 = complete blackout, 5 = perfect recall */
export type ActiveRecallRating = 1 | 2 | 3 | 4 | 5;

/** Descriptor labels shown beside each rating button */
const RATING_LABELS: Record<ActiveRecallRating, string> = {
  1: 'Forgot completely',
  2: 'Barely recalled',
  3: 'Recalled with effort',
  4: 'Mostly correct',
  5: 'Perfect recall',
};

/** Colour class applied to a rating button when selected */
const RATING_SELECTED_STYLES: Record<ActiveRecallRating, string> = {
  1: 'border-[var(--analysis-incorrect)] bg-[var(--analysis-incorrect)]/20 text-[var(--analysis-incorrect)]',
  2: 'border-[var(--analysis-partial)] bg-[var(--analysis-partial)]/20 text-[var(--analysis-partial)]',
  3: 'border-[var(--analysis-partial)] bg-[var(--analysis-partial)]/20 text-[var(--analysis-partial)]',
  4: 'border-[var(--analysis-correct)] bg-[var(--analysis-correct)]/20 text-[var(--analysis-correct)]',
  5: 'border-[var(--analysis-correct)] bg-[var(--analysis-correct)]/20 text-[var(--analysis-correct)]',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActiveRecallProps {
  /**
   * Stable identifier for this interaction — included in all telemetry events.
   */
  id: string;

  /**
   * The question or prompt shown to the learner.
   */
  prompt: string;

  /**
   * Optional context or preamble shown above the prompt (e.g. topic name).
   */
  context?: string;

  /**
   * The expected / model answer revealed after the learner submits their response.
   */
  expectedAnswer: string;

  /**
   * Optional hint displayed beneath the textarea before reveal.
   */
  hint?: string;

  /**
   * Placeholder text for the response textarea.
   * @default "Write your answer from memory…"
   */
  placeholder?: string;

  /**
   * Maximum character length for the learner's response.
   * @default 2000
   */
  maxLength?: number;

  /**
   * Called whenever a telemetry event is emitted.
   */
  onTelemetry?: (event: ActiveRecallTelemetryEvent) => void;

  /**
   * Called when the learner submits their final self-rating.
   * Receives the rating value for convenience.
   */
  onComplete?: (rating: ActiveRecallRating) => void;

  /**
   * Additional className applied to the root Card element.
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Phase = 'input' | 'revealed' | 'rated';

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveRecall({
  id,
  prompt,
  context,
  expectedAnswer,
  hint,
  placeholder = 'Write your answer from memory…',
  maxLength = 2000,
  onTelemetry,
  onComplete,
  className = '',
}: ActiveRecallProps) {
  const [phase, setPhase] = useState<Phase>('input');
  const [response, setResponse] = useState('');
  const [selectedRating, setSelectedRating] = useState<ActiveRecallRating | null>(null);

  // Time-tracking refs — not state, we never want re-renders from them
  const mountedAt = useRef<number>(Date.now());
  const writingStartedAt = useRef<number | null>(null);
  const writingMs = useRef<number>(0);
  const revealedAt = useRef<number | null>(null);

  // Emit a telemetry event
  const emit = useCallback(
    (eventName: ActiveRecallEventName, payload: ActiveRecallTelemetryEvent['payload']) => {
      onTelemetry?.({
        interactionId: id,
        event: eventName,
        timestamp: nowIso(),
        payload,
      });
    },
    [id, onTelemetry]
  );

  // Track writing start time on first keystroke
  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (writingStartedAt.current === null) {
        writingStartedAt.current = Date.now();
      }
      setResponse(e.target.value);
    },
    []
  );

  // Reveal the expected answer
  const handleReveal = useCallback(() => {
    // Accumulate writing time
    if (writingStartedAt.current !== null) {
      writingMs.current += Date.now() - writingStartedAt.current;
      writingStartedAt.current = null;
    }
    revealedAt.current = Date.now();

    emit('response', {
      response,
      responseLength: response.length,
    } satisfies ActiveRecallResponsePayload);

    setPhase('revealed');
  }, [emit, response]);

  // Handle self-rating selection
  const handleRating = useCallback(
    (rating: ActiveRecallRating) => {
      setSelectedRating(rating);
    },
    []
  );

  // Submit the rating and complete the interaction
  const handleSubmitRating = useCallback(() => {
    if (selectedRating === null) return;

    const totalMs = Date.now() - mountedAt.current;

    emit('rating', { rating: selectedRating } satisfies ActiveRecallRatingPayload);
    emit('time_spent', {
      totalMs,
      writingMs: writingMs.current,
    } satisfies ActiveRecallTimePayload);

    setPhase('rated');
    onComplete?.(selectedRating);
  }, [emit, onComplete, selectedRating]);

  // Keyboard shortcut: Ctrl/Cmd+Enter to reveal (when in input phase)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'input' && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleReveal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleReveal]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-stage="analysis"
      className={`font-[var(--font-analysis)] ${className}`}
    >
      <Card padding="lg" className="border border-[var(--analysis-border)]">
        {/* ---- Header ---- */}
        <CardHeader>
          {context && (
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--analysis-text-secondary)] mb-2">
              {context}
            </p>
          )}
          <CardTitle as="h2" className="text-[var(--analysis-text-primary)] font-[var(--font-analysis)] leading-snug">
            {prompt}
          </CardTitle>
        </CardHeader>

        {/* ---- Input phase: free-response textarea ---- */}
        <CardContent>
          {phase === 'input' && (
            <div className="space-y-4">
              <TextArea
                label="Your answer"
                placeholder={placeholder}
                value={response}
                onChange={handleResponseChange}
                autoResize
                minRows={4}
                maxRows={12}
                maxLength={maxLength}
                showCount
                helperText={hint}
                aria-label="Free recall response"
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--analysis-text-secondary)]">
                  <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--analysis-border)] text-[10px] font-mono bg-[var(--analysis-bg-secondary)]">
                    ⌘ Enter
                  </kbd>
                  {' '}or click the button to reveal
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleReveal}
                  disabled={response.trim().length === 0}
                  aria-label="Reveal expected answer"
                >
                  Reveal Answer
                </Button>
              </div>
            </div>
          )}

          {/* ---- Revealed / Rated phases: show learner response + expected answer ---- */}
          {(phase === 'revealed' || phase === 'rated') && (
            <div className="space-y-6">
              {/* Learner's response */}
              <section aria-label="Your response">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--analysis-text-secondary)] mb-2">
                  Your response
                </h3>
                <div
                  className="
                    px-4 py-3 rounded-[var(--radius-md)]
                    bg-[var(--analysis-bg-secondary)]
                    border border-[var(--analysis-border)]
                    text-[var(--analysis-text-primary)] text-sm leading-relaxed
                    whitespace-pre-wrap
                  "
                >
                  {response.trim().length > 0 ? (
                    response
                  ) : (
                    <span className="italic text-[var(--analysis-text-secondary)]">
                      No response entered
                    </span>
                  )}
                </div>
              </section>

              {/* Expected answer */}
              <section aria-label="Expected answer">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--analysis-correct)] mb-2">
                  Expected answer
                </h3>
                <div
                  className="
                    px-4 py-3 rounded-[var(--radius-md)]
                    bg-[var(--analysis-correct)]/10
                    border border-[var(--analysis-correct)]/40
                    text-[var(--analysis-text-primary)] text-sm leading-relaxed
                    whitespace-pre-wrap
                  "
                  role="region"
                  aria-live="polite"
                >
                  {expectedAnswer}
                </div>
              </section>

              {/* Self-rating */}
              {phase === 'revealed' && (
                <section aria-label="Self-rating">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--analysis-text-secondary)] mb-3">
                    How well did you recall it?
                  </h3>

                  {/* Rating buttons 1–5 */}
                  <div
                    role="radiogroup"
                    aria-label="Recall quality rating"
                    className="flex flex-wrap gap-2 mb-4"
                  >
                    {([1, 2, 3, 4, 5] as ActiveRecallRating[]).map((n) => {
                      const isSelected = selectedRating === n;
                      return (
                        <button
                          key={n}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`${n} — ${RATING_LABELS[n]}`}
                          onClick={() => handleRating(n)}
                          className={`
                            flex items-center justify-center
                            w-10 h-10 rounded-[var(--radius-md)]
                            border text-sm font-semibold
                            transition-all duration-[var(--duration-analysis-short)] ease-[var(--ease-analysis)]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus-ring)]
                            cursor-pointer
                            ${
                              isSelected
                                ? RATING_SELECTED_STYLES[n]
                                : `
                                    border-[var(--analysis-border)]
                                    bg-[var(--analysis-bg-secondary)]
                                    text-[var(--analysis-text-secondary)]
                                    hover:border-[var(--analysis-accent-primary)]
                                    hover:text-[var(--analysis-text-primary)]
                                  `
                            }
                          `.trim().replace(/\s+/g, ' ')}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating label */}
                  {selectedRating !== null && (
                    <p
                      className="text-sm text-[var(--analysis-text-secondary)] mb-4 transition-opacity duration-[var(--duration-analysis-medium)]"
                      aria-live="polite"
                    >
                      {RATING_LABELS[selectedRating]}
                    </p>
                  )}

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSubmitRating}
                    disabled={selectedRating === null}
                    aria-label="Submit self-rating"
                  >
                    Submit Rating
                  </Button>
                </section>
              )}

              {/* Rated: completion state */}
              {phase === 'rated' && selectedRating !== null && (
                <section
                  className="
                    flex items-center gap-3
                    px-4 py-3 rounded-[var(--radius-md)]
                    bg-[var(--analysis-accent-primary)]/10
                    border border-[var(--analysis-accent-primary)]/30
                  "
                  aria-live="polite"
                  aria-label="Completion message"
                >
                  {/* Checkmark icon */}
                  <svg
                    className="w-5 h-5 shrink-0 text-[var(--analysis-accent-primary)]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-[var(--analysis-text-primary)]">
                    Recalled — rated{' '}
                    <strong className="font-semibold">{selectedRating}/5</strong>:{' '}
                    {RATING_LABELS[selectedRating]}
                  </p>
                </section>
              )}
            </div>
          )}
        </CardContent>

        {/* ---- Footer: progress indicator ---- */}
        <CardFooter>
          <div className="flex items-center gap-2" aria-label="Interaction progress">
            {(['input', 'revealed', 'rated'] as Phase[]).map((p, i) => (
              <React.Fragment key={p}>
                <div
                  className={`
                    flex items-center justify-center
                    w-6 h-6 rounded-full text-xs font-semibold
                    transition-all duration-[var(--duration-analysis-medium)]
                    ${
                      phase === p
                        ? 'bg-[var(--analysis-accent-primary)] text-white'
                        : (['input', 'revealed', 'rated'] as Phase[]).indexOf(phase) > i
                        ? 'bg-[var(--analysis-correct)] text-white'
                        : 'bg-[var(--analysis-bg-secondary)] text-[var(--analysis-text-secondary)] border border-[var(--analysis-border)]'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                  aria-current={phase === p ? 'step' : undefined}
                >
                  {(['input', 'revealed', 'rated'] as Phase[]).indexOf(phase) > i ? (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`
                      flex-1 h-px
                      transition-colors duration-[var(--duration-analysis-long)]
                      ${
                        (['input', 'revealed', 'rated'] as Phase[]).indexOf(phase) > i
                          ? 'bg-[var(--analysis-correct)]'
                          : 'bg-[var(--analysis-border)]'
                      }
                    `.trim().replace(/\s+/g, ' ')}
                  />
                )}
              </React.Fragment>
            ))}
            <span className="ml-2 text-xs text-[var(--analysis-text-secondary)] capitalize">
              {phase === 'input' && 'Write your response'}
              {phase === 'revealed' && 'Rate your recall'}
              {phase === 'rated' && 'Complete'}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
