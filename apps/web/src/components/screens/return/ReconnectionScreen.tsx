/**
 * ReconnectionScreen
 *
 * Return stage interaction — "Bring it back."
 *
 * Presents a concept the learner encountered in an earlier session, then asks
 * a bridging question: "How does this connect to what you already knew?"
 *
 * The design intent is contemplative and unhurried. There are no right/wrong
 * answers — only the quality of the learner's own connection-making. The
 * interface is wide-margin, serif, and slow-moving.
 *
 * Phases:
 *   1. orient   — show the returning concept with prior-knowledge framing
 *   2. reflect  — learner writes a free-response bridge
 *   3. complete — affirming summary before the orchestrator advances
 *
 * Telemetry events:
 *   - reconnection:started       — component mounts
 *   - reconnection:response      — learner submits their bridging response
 *   - reconnection:completed     — learner dismisses completion state
 *
 * Design: Return stage (RH-Primary, Enriched) — deep coral/mauve palette,
 * serif fonts (Source Serif 4), slowest motion (500–1000 ms).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { TextArea } from '../../ui/TextArea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Telemetry events emitted by ReconnectionScreen */
export type ReconnectionTelemetryEvent =
  | {
      type: 'reconnection:started';
      interactionId: string;
      timestamp: string;
    }
  | {
      type: 'reconnection:response';
      interactionId: string;
      response: string;
      responseLength: number;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'reconnection:completed';
      interactionId: string;
      response: string;
      totalTimeMs: number;
      timestamp: string;
    };

/** Result passed to onComplete */
export interface ReconnectionResult {
  interactionId: string;
  response: string;
  totalTimeMs: number;
}

export interface ReconnectionScreenProps {
  /**
   * Stable identifier for this interaction — included in all telemetry events.
   */
  interactionId: string;

  /**
   * The concept being returned to. Rendered as a prominent quote/frame.
   * Example: "Neuroplasticity — the brain's ability to rewire through experience."
   */
  concept: string;

  /**
   * Optional short context label shown above the concept frame.
   * Example: "From last session" or "Topic: Memory & Learning"
   */
  conceptContext?: string;

  /**
   * The bridging question posed to the learner.
   * Example: "How does this connect to what you already knew before this session?"
   */
  bridgingQuestion: string;

  /**
   * Optional orienting framing shown in the orientation phase.
   * Helps the learner settle before reflecting.
   * Example: "Take a moment. You've seen this idea before — from a fresh angle."
   */
  orientingPrompt?: string;

  /**
   * Placeholder text for the response textarea.
   * @default "Describe the connection in your own words…"
   */
  placeholder?: string;

  /**
   * Maximum character length for the learner's response.
   * @default 2000
   */
  maxLength?: number;

  /** Called whenever a telemetry event is emitted. */
  onTelemetry?: (event: ReconnectionTelemetryEvent) => void;

  /** Called when the learner completes the reconnection interaction. */
  onComplete?: (result: ReconnectionResult) => void;

  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Phase = 'orient' | 'reflect' | 'complete';

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconSpiral() {
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
        d="M12 21C7.029 21 3 16.971 3 12C3 8.134 5.686 4.886 9.333 4.096C9.889 3.978 10.444 4.333 10.562 4.889C10.681 5.444 10.325 5.999 9.77 6.118C6.982 6.718 5 9.14 5 12C5 15.866 8.134 19 12 19C15.866 19 19 15.866 19 12C19 8.688 16.769 5.89 13.667 5.17V7C13.667 7.552 13.219 8 12.667 8C12.115 8 11.667 7.552 11.667 7V4C11.667 3.448 12.115 3 12.667 3C17.636 3 21.667 7.029 21.667 12C21.667 16.971 17.638 21 12.667 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheckRing() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
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
// Component
// ---------------------------------------------------------------------------

export function ReconnectionScreen({
  interactionId,
  concept,
  conceptContext,
  bridgingQuestion,
  orientingPrompt,
  placeholder = 'Describe the connection in your own words…',
  maxLength = 2000,
  onTelemetry,
  onComplete,
  className = '',
}: ReconnectionScreenProps) {
  const [phase, setPhase] = useState<Phase>('orient');
  const [response, setResponse] = useState('');
  const [visible, setVisible] = useState(false);

  const mountedAtRef = useRef<number>(Date.now());
  const elapsed = useCallback(() => Date.now() - mountedAtRef.current, []);

  const emit = useCallback(
    (event: ReconnectionTelemetryEvent) => {
      onTelemetry?.(event);
    },
    [onTelemetry],
  );

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    emit({
      type: 'reconnection:started',
      interactionId,
      timestamp: new Date().toISOString(),
    });
    return () => clearTimeout(t);
  }, [interactionId, emit]);

  const handleBeginReflect = useCallback(() => {
    setPhase('reflect');
  }, []);

  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setResponse(e.target.value);
    },
    [],
  );

  const handleSubmitResponse = useCallback(() => {
    if (response.trim().length === 0) return;

    emit({
      type: 'reconnection:response',
      interactionId,
      response,
      responseLength: response.length,
      elapsedMs: elapsed(),
      timestamp: new Date().toISOString(),
    });

    setPhase('complete');
  }, [response, interactionId, emit, elapsed]);

  const handleComplete = useCallback(() => {
    const totalTimeMs = elapsed();
    const result: ReconnectionResult = {
      interactionId,
      response,
      totalTimeMs,
    };

    emit({
      type: 'reconnection:completed',
      interactionId,
      response,
      totalTimeMs,
      timestamp: new Date().toISOString(),
    });

    onComplete?.(result);
  }, [interactionId, response, emit, elapsed, onComplete]);

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
              <IconSpiral />
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
              Reconnection
            </p>
          </div>

          {/* Concept frame */}
          <div
            style={{
              borderLeft: '3px solid var(--return-accent-primary)',
              paddingLeft: 'var(--space-5)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {conceptContext && (
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--return-text-secondary)',
                  fontStyle: 'italic',
                  marginBottom: 'var(--space-2)',
                  letterSpacing: '0.05em',
                }}
              >
                {conceptContext}
              </p>
            )}
            <blockquote
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-regular)',
                color: 'var(--return-text-primary)',
                lineHeight: 'var(--leading-encounter)',
                margin: 0,
              }}
            >
              {concept}
            </blockquote>
          </div>

          {/* Phase-aware heading */}
          {phase === 'orient' && (
            <CardTitle
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-regular)',
                color: 'var(--return-text-primary)',
                lineHeight: 'var(--leading-encounter)',
                marginBottom: orientingPrompt ? 'var(--space-3)' : 0,
              }}
            >
              Bring it back.
            </CardTitle>
          )}

          {phase === 'reflect' && (
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
              {bridgingQuestion}
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
              Connection noted.
            </CardTitle>
          )}
        </CardHeader>

        {/* ---- Content ---- */}
        <CardContent>

          {/* Orient phase */}
          {phase === 'orient' && (
            <div>
              {orientingPrompt && (
                <p
                  style={{
                    fontSize: 'var(--text-md)',
                    color: 'var(--return-text-secondary)',
                    lineHeight: 'var(--leading-encounter)',
                    marginBottom: 'var(--space-8)',
                    fontStyle: 'italic',
                  }}
                >
                  {orientingPrompt}
                </p>
              )}
              <p
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--return-text-secondary)',
                  lineHeight: 'var(--leading-encounter)',
                  marginBottom: 'var(--space-8)',
                }}
              >
                You've worked with this concept. Now pause, and let it settle
                before you reflect on where it fits in what you already know.
              </p>
            </div>
          )}

          {/* Reflect phase */}
          {phase === 'reflect' && (
            <div>
              <TextArea
                label="Your reflection"
                placeholder={placeholder}
                value={response}
                onChange={handleResponseChange}
                autoResize
                minRows={5}
                maxRows={14}
                maxLength={maxLength}
                showCount
                aria-label="Reconnection response"
                style={{
                  fontFamily: 'var(--font-encounter)',
                  fontSize: 'var(--text-md)',
                  lineHeight: 'var(--leading-encounter)',
                  color: 'var(--return-text-primary)',
                  backgroundColor: 'rgba(36, 26, 42, 0.6)',
                  borderColor: 'rgba(168, 92, 138, 0.25)',
                }}
              />
            </div>
          )}

          {/* Complete phase */}
          {phase === 'complete' && (
            <div
              style={{
                opacity: 1,
                transition: 'opacity var(--duration-return-medium) var(--ease-return)',
              }}
            >
              {/* Learner's response (read-only) */}
              <section
                aria-label="Your reflection"
                style={{ marginBottom: 'var(--space-6)' }}
              >
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
                  Your reflection
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
                  {response}
                </div>
              </section>

              {/* Affirming message */}
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
                  The connection you made is part of your understanding now.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ---- Footer ---- */}
        <CardFooter>
          {phase === 'orient' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleBeginReflect}
              aria-label="Begin reconnection reflection"
              style={{
                backgroundColor: 'var(--return-accent-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
                transition:
                  'background-color var(--duration-return-short) var(--ease-return)',
              }}
            >
              Begin reflection
            </Button>
          )}

          {phase === 'reflect' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={response.trim().length === 0}
              onClick={handleSubmitResponse}
              aria-label="Submit reconnection response"
              style={{
                backgroundColor: 'var(--return-accent-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
                transition:
                  'background-color var(--duration-return-short) var(--ease-return)',
              }}
            >
              Submit reflection
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
                transition:
                  'background-color var(--duration-return-short) var(--ease-return), ' +
                  'border-color var(--duration-return-short) var(--ease-return)',
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
