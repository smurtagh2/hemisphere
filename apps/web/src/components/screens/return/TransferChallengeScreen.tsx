/**
 * TransferChallengeScreen
 *
 * Return stage interaction — "Apply the concept to a new / unexpected context."
 *
 * Transfer is the hallmark of deep learning: can the learner carry a concept
 * beyond its original frame and make it work somewhere new? This screen poses
 * a novel scenario and asks for an open-ended written application.
 *
 * Unlike Analysis-stage MCQs, there is no objectively correct answer. The
 * learner self-assesses their own application quality after reading a model
 * example (the "transfer hint"), which is revealed on demand.
 *
 * Phases:
 *   1. challenge  — present the new scenario; learner writes their application
 *   2. revealed   — learner's answer shown alongside the model example; self-rate
 *   3. complete   — affirming summary
 *
 * Telemetry events:
 *   - transfer:started
 *   - transfer:hint_revealed
 *   - transfer:response
 *   - transfer:self_rated
 *   - transfer:completed
 *
 * Design: Return stage (RH-Primary, Enriched) — deep coral/mauve palette,
 * serif fonts, slowest motion.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { TextArea } from '../../ui/TextArea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransferSelfRating = 1 | 2 | 3 | 4 | 5;

const TRANSFER_RATING_LABELS: Record<TransferSelfRating, string> = {
  1: 'Struggled to apply it',
  2: 'Partial application',
  3: 'Reasonable attempt',
  4: 'Solid application',
  5: 'Novel, clear application',
};

export type TransferTelemetryEvent =
  | {
      type: 'transfer:started';
      interactionId: string;
      timestamp: string;
    }
  | {
      type: 'transfer:hint_revealed';
      interactionId: string;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'transfer:response';
      interactionId: string;
      response: string;
      responseLength: number;
      hintRevealed: boolean;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'transfer:self_rated';
      interactionId: string;
      rating: TransferSelfRating;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'transfer:completed';
      interactionId: string;
      response: string;
      rating: TransferSelfRating;
      totalTimeMs: number;
      timestamp: string;
    };

export interface TransferChallengeResult {
  interactionId: string;
  response: string;
  rating: TransferSelfRating;
  totalTimeMs: number;
}

export interface TransferChallengeScreenProps {
  /**
   * Stable identifier for this interaction.
   */
  interactionId: string;

  /**
   * The concept being transferred.
   * Example: "Cognitive load theory"
   */
  concept: string;

  /**
   * The new / unexpected scenario presented to the learner.
   * Example: "Imagine you're designing onboarding for a surgeon learning a new
   * robotic procedure. How would cognitive load theory guide your choices?"
   */
  scenario: string;

  /**
   * Optional context label above the scenario.
   * Example: "Transfer challenge" or "New context: Healthcare"
   */
  scenarioContext?: string;

  /**
   * A model answer or example application that is revealed on demand.
   * It should demonstrate one strong application — not the only correct one.
   */
  modelExample: string;

  /**
   * Label for the "reveal hint" button.
   * @default "Show example application"
   */
  revealLabel?: string;

  /**
   * Placeholder text for the response textarea.
   * @default "Describe how you'd apply the concept here…"
   */
  placeholder?: string;

  /**
   * Maximum character length for the response.
   * @default 2000
   */
  maxLength?: number;

  /** Called whenever a telemetry event is emitted. */
  onTelemetry?: (event: TransferTelemetryEvent) => void;

  /** Called when the learner completes the interaction. */
  onComplete?: (result: TransferChallengeResult) => void;

  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Phase = 'challenge' | 'revealed' | 'complete';

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconArrowCurve() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 12C4 8.134 7.134 5 11 5H17M17 5L13 9M17 5L13 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 12C20 15.866 16.866 19 13 19H7M7 19L11 15M7 19L11 23"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 8C1 8 3 3 8 3C13 3 15 8 15 8C15 8 13 13 8 13C3 13 1 8 1 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCheckRing() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10L8.5 12L13.5 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// RatingButton
// ---------------------------------------------------------------------------

interface RatingButtonProps {
  value: TransferSelfRating;
  selected: boolean;
  onSelect: (v: TransferSelfRating) => void;
}

function RatingButton({ value, selected, onSelect }: RatingButtonProps) {
  const selectedStyle: React.CSSProperties = selected
    ? {
        borderColor: 'var(--return-accent-primary)',
        backgroundColor: 'rgba(212, 114, 74, 0.15)',
        color: 'var(--return-accent-primary)',
      }
    : {
        borderColor: 'rgba(168, 92, 138, 0.25)',
        backgroundColor: 'rgba(36, 26, 42, 0.5)',
        color: 'var(--return-text-secondary)',
      };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${value} — ${TRANSFER_RATING_LABELS[value]}`}
      onClick={() => onSelect(value)}
      style={{
        ...selectedStyle,
        width: '40px',
        height: '40px',
        border: '1.5px solid',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
        fontFamily: 'var(--font-encounter)',
        cursor: 'pointer',
        transition:
          'border-color var(--duration-return-short) var(--ease-return), ' +
          'background-color var(--duration-return-short) var(--ease-return), ' +
          'color var(--duration-return-short) var(--ease-return)',
      }}
    >
      {value}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransferChallengeScreen({
  interactionId,
  concept,
  scenario,
  scenarioContext,
  modelExample,
  revealLabel = 'Show example application',
  placeholder = 'Describe how you\'d apply the concept here…',
  maxLength = 2000,
  onTelemetry,
  onComplete,
  className = '',
}: TransferChallengeScreenProps) {
  const [phase, setPhase] = useState<Phase>('challenge');
  const [response, setResponse] = useState('');
  const [hintRevealed, setHintRevealed] = useState(false);
  const [selectedRating, setSelectedRating] = useState<TransferSelfRating | null>(null);
  const [visible, setVisible] = useState(false);

  const mountedAtRef = useRef<number>(Date.now());
  const elapsed = useCallback(() => Date.now() - mountedAtRef.current, []);

  const emit = useCallback(
    (event: TransferTelemetryEvent) => {
      onTelemetry?.(event);
    },
    [onTelemetry],
  );

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    emit({
      type: 'transfer:started',
      interactionId,
      timestamp: new Date().toISOString(),
    });
    return () => clearTimeout(t);
  }, [interactionId, emit]);

  const handleRevealHint = useCallback(() => {
    if (hintRevealed) return;
    setHintRevealed(true);
    emit({
      type: 'transfer:hint_revealed',
      interactionId,
      elapsedMs: elapsed(),
      timestamp: new Date().toISOString(),
    });
  }, [hintRevealed, interactionId, emit, elapsed]);

  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setResponse(e.target.value);
    },
    [],
  );

  const handleSubmitResponse = useCallback(() => {
    if (response.trim().length === 0) return;

    emit({
      type: 'transfer:response',
      interactionId,
      response,
      responseLength: response.length,
      hintRevealed,
      elapsedMs: elapsed(),
      timestamp: new Date().toISOString(),
    });

    setPhase('revealed');
  }, [response, hintRevealed, interactionId, emit, elapsed]);

  const handleSelectRating = useCallback((rating: TransferSelfRating) => {
    setSelectedRating(rating);
  }, []);

  const handleSubmitRating = useCallback(() => {
    if (selectedRating === null) return;

    emit({
      type: 'transfer:self_rated',
      interactionId,
      rating: selectedRating,
      elapsedMs: elapsed(),
      timestamp: new Date().toISOString(),
    });

    setPhase('complete');
  }, [selectedRating, interactionId, emit, elapsed]);

  const handleComplete = useCallback(() => {
    if (selectedRating === null) return;

    const totalTimeMs = elapsed();
    const result: TransferChallengeResult = {
      interactionId,
      response,
      rating: selectedRating,
      totalTimeMs,
    };

    emit({
      type: 'transfer:completed',
      interactionId,
      response,
      rating: selectedRating,
      totalTimeMs,
      timestamp: new Date().toISOString(),
    });

    onComplete?.(result);
  }, [interactionId, response, selectedRating, emit, elapsed, onComplete]);

  return (
    <div
      data-stage="return"
      className={className}
      style={{
        fontFamily: 'var(--font-encounter)',
        opacity: visible ? 1 : 0,
        transition: 'opacity var(--duration-return-long) var(--ease-return)',
      }}
    >
      <Card
        padding="lg"
        glow
        style={{
          backgroundColor: 'var(--return-bg-secondary)',
          border: '1px solid rgba(168, 92, 138, 0.18)',
          boxShadow: 'var(--shadow-return-glow)',
        }}
      >
        {/* ---- Header ---- */}
        <CardHeader>
          {/* Stage label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <span style={{ color: 'var(--return-accent-secondary)' }}>
              <IconArrowCurve />
            </span>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--return-accent-secondary)',
              }}
            >
              Transfer challenge
            </p>
          </div>

          {/* Concept badge */}
          <div
            style={{
              display: 'inline-block',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(212, 114, 74, 0.1)',
              border: '1px solid rgba(212, 114, 74, 0.25)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--return-accent-primary)',
                letterSpacing: '0.04em',
              }}
            >
              {concept}
            </span>
          </div>

          {/* Scenario context label */}
          {scenarioContext && (
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--return-text-secondary)',
                fontStyle: 'italic',
                marginBottom: 'var(--space-3)',
                letterSpacing: '0.05em',
              }}
            >
              {scenarioContext}
            </p>
          )}

          {/* Phase-aware title */}
          {phase === 'challenge' && (
            <CardTitle
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-regular)',
                color: 'var(--return-text-primary)',
                lineHeight: 'var(--leading-encounter)',
              }}
            >
              {scenario}
            </CardTitle>
          )}

          {phase === 'revealed' && (
            <CardTitle
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-regular)',
                color: 'var(--return-text-primary)',
                lineHeight: 'var(--leading-encounter)',
              }}
            >
              How did your application compare?
            </CardTitle>
          )}

          {phase === 'complete' && (
            <CardTitle
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-regular)',
                color: 'var(--return-text-primary)',
                lineHeight: 'var(--leading-encounter)',
              }}
            >
              Transfer recorded.
            </CardTitle>
          )}
        </CardHeader>

        {/* ---- Content ---- */}
        <CardContent>

          {/* Challenge phase */}
          {phase === 'challenge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <TextArea
                label="Your application"
                placeholder={placeholder}
                value={response}
                onChange={handleResponseChange}
                autoResize
                minRows={5}
                maxRows={14}
                maxLength={maxLength}
                showCount
                aria-label="Transfer challenge response"
                style={{
                  fontFamily: 'var(--font-encounter)',
                  fontSize: 'var(--text-md)',
                  lineHeight: 'var(--leading-encounter)',
                  color: 'var(--return-text-primary)',
                  backgroundColor: 'rgba(36, 26, 42, 0.6)',
                  borderColor: 'rgba(168, 92, 138, 0.25)',
                }}
              />

              {/* Optional hint reveal */}
              {!hintRevealed ? (
                <button
                  type="button"
                  onClick={handleRevealHint}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--return-text-secondary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-encounter)',
                    fontStyle: 'italic',
                    transition: 'color var(--duration-return-short) var(--ease-return)',
                  }}
                  aria-label="Reveal example application"
                >
                  <IconEye />
                  <span>{revealLabel}</span>
                </button>
              ) : (
                <div
                  role="region"
                  aria-label="Example application"
                  aria-live="polite"
                  style={{
                    padding: 'var(--space-5)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'rgba(122, 92, 138, 0.08)',
                    border: '1px solid rgba(122, 92, 138, 0.2)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--return-accent-tertiary)',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    Example application
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--text-md)',
                      color: 'var(--return-text-primary)',
                      lineHeight: 'var(--leading-encounter)',
                      fontStyle: 'italic',
                    }}
                  >
                    {modelExample}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Revealed phase — comparison + self-rating */}
          {phase === 'revealed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Learner's answer */}
              <section aria-label="Your application">
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--return-text-secondary)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Your application
                </p>
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'rgba(36, 26, 42, 0.5)',
                    border: '1px solid rgba(168, 92, 138, 0.15)',
                    fontFamily: 'var(--font-encounter)',
                    fontSize: 'var(--text-md)',
                    color: 'var(--return-text-primary)',
                    lineHeight: 'var(--leading-encounter)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {response.trim().length > 0 ? (
                    response
                  ) : (
                    <span
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--return-text-secondary)',
                      }}
                    >
                      No response entered
                    </span>
                  )}
                </div>
              </section>

              {/* Model example */}
              <section aria-label="Example application">
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--return-accent-tertiary)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Example application
                </p>
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'rgba(122, 92, 138, 0.08)',
                    border: '1px solid rgba(122, 92, 138, 0.2)',
                    fontFamily: 'var(--font-encounter)',
                    fontSize: 'var(--text-md)',
                    color: 'var(--return-text-primary)',
                    lineHeight: 'var(--leading-encounter)',
                    fontStyle: 'italic',
                  }}
                  role="region"
                  aria-live="polite"
                >
                  {modelExample}
                </div>
              </section>

              {/* Self-rating */}
              <section aria-label="Self-assessment">
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--return-text-secondary)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  How well did you transfer the concept?
                </p>

                <div
                  role="radiogroup"
                  aria-label="Transfer quality rating"
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  {([1, 2, 3, 4, 5] as TransferSelfRating[]).map((n) => (
                    <RatingButton
                      key={n}
                      value={n}
                      selected={selectedRating === n}
                      onSelect={handleSelectRating}
                    />
                  ))}
                </div>

                {selectedRating !== null && (
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--return-text-secondary)',
                      fontStyle: 'italic',
                      fontFamily: 'var(--font-encounter)',
                      marginBottom: 'var(--space-4)',
                      transition: 'opacity var(--duration-return-medium) var(--ease-return)',
                    }}
                    aria-live="polite"
                  >
                    {TRANSFER_RATING_LABELS[selectedRating]}
                  </p>
                )}
              </section>
            </div>
          )}

          {/* Complete phase */}
          {phase === 'complete' && selectedRating !== null && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(212, 114, 74, 0.08)',
                  border: '1px solid rgba(212, 114, 74, 0.2)',
                  color: 'var(--return-accent-primary)',
                  marginBottom: 'var(--space-4)',
                }}
                role="status"
                aria-live="polite"
              >
                <span style={{ marginTop: '2px' }}>
                  <IconCheckRing />
                </span>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    lineHeight: 'var(--leading-relaxed)',
                    fontFamily: 'var(--font-encounter)',
                    fontStyle: 'italic',
                  }}
                >
                  Transfer rated {selectedRating}/5 — {TRANSFER_RATING_LABELS[selectedRating]}.
                  Every application strengthens the schema.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ---- Footer ---- */}
        <CardFooter>
          {phase === 'challenge' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={response.trim().length === 0}
              onClick={handleSubmitResponse}
              aria-label="Submit transfer response"
              style={{
                backgroundColor: 'var(--return-accent-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
                transition:
                  'background-color var(--duration-return-short) var(--ease-return)',
              }}
            >
              Submit application
            </Button>
          )}

          {phase === 'revealed' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={selectedRating === null}
              onClick={handleSubmitRating}
              aria-label="Submit transfer self-rating"
              style={{
                backgroundColor: 'var(--return-accent-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
                transition:
                  'background-color var(--duration-return-short) var(--ease-return)',
              }}
            >
              Submit rating
            </Button>
          )}

          {phase === 'complete' && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleComplete}
              aria-label="Continue to next stage"
              style={{
                borderColor: 'var(--return-accent-secondary)',
                color: 'var(--return-text-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
              }}
            >
              Continue
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
