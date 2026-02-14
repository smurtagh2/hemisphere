/**
 * ReflectionScreen
 *
 * Return stage interaction — Open-ended self-assessment.
 * "What changed in how you think about this?"
 *
 * This is the deepest, most contemplative screen in the Return stage. There
 * is no structured feedback, no rating scale for correctness — only a quiet
 * space for the learner to observe their own epistemic shift.
 *
 * The design is intentionally sparse: wide margins, unhurried typography,
 * minimal chrome. The learner's words take centre stage.
 *
 * Phases:
 *   1. prompt    — present the reflection question with a settling moment
 *   2. writing   — learner writes their open-ended response
 *   3. complete  — the response is shown with a gentle closing message
 *
 * Telemetry events:
 *   - reflection:started
 *   - reflection:writing_began    — first keystroke
 *   - reflection:submitted
 *   - reflection:completed
 *
 * Design: Return stage (RH-Primary, Enriched) — deep coral/mauve palette,
 * Source Serif 4, slowest motion. No right/wrong states. Maximum spaciousness.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../ui/Card';
import { TextArea } from '../../ui/TextArea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReflectionTelemetryEvent =
  | {
      type: 'reflection:started';
      interactionId: string;
      timestamp: string;
    }
  | {
      type: 'reflection:writing_began';
      interactionId: string;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'reflection:submitted';
      interactionId: string;
      response: string;
      responseLength: number;
      writingMs: number;
      elapsedMs: number;
      timestamp: string;
    }
  | {
      type: 'reflection:completed';
      interactionId: string;
      response: string;
      totalTimeMs: number;
      timestamp: string;
    };

export interface ReflectionResult {
  interactionId: string;
  response: string;
  totalTimeMs: number;
}

export interface ReflectionScreenProps {
  /**
   * Stable identifier for this interaction.
   */
  interactionId: string;

  /**
   * The topic or concept that anchors the reflection.
   * Shown as a quiet header above the prompt.
   * Example: "Spaced repetition & memory consolidation"
   */
  topic: string;

  /**
   * The open-ended reflection question.
   * Example: "What changed in how you think about memory after this session?"
   */
  reflectionQuestion: string;

  /**
   * Optional secondary prompt shown below the main question.
   * Can guide learners who feel stuck.
   * Example: "Consider: what surprised you? What assumption shifted?"
   */
  guidingNote?: string;

  /**
   * A brief closing message shown after the learner submits.
   * Should feel warm and affirming, not evaluative.
   * @default "Your reflection has been recorded. This session is complete."
   */
  closingMessage?: string;

  /**
   * Placeholder text for the response textarea.
   * @default "Write freely — there's no right answer here…"
   */
  placeholder?: string;

  /**
   * Minimum response length (characters) before submission is allowed.
   * @default 20
   */
  minLength?: number;

  /**
   * Maximum character length for the response.
   * @default 3000
   */
  maxLength?: number;

  /** Called whenever a telemetry event is emitted. */
  onTelemetry?: (event: ReflectionTelemetryEvent) => void;

  /** Called when the learner completes the interaction. */
  onComplete?: (result: ReflectionResult) => void;

  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Phase = 'prompt' | 'writing' | 'complete';

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconQuill() {
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
        d="M20 4C20 4 17 7 14 10C11 13 9 15 9 15L8 18L11 17C11 17 13 15 16 12C19 9 22 6 22 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20C6 18 8 18 9 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 18C7 19 6 20 4 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 17C3 17 6 14 8 10C10 6 10 3 17 3C17 10 14 10 10 12C6 14 3 17 3 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 17L8 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReflectionScreen({
  interactionId,
  topic,
  reflectionQuestion,
  guidingNote,
  closingMessage = 'Your reflection has been recorded. This session is complete.',
  placeholder = 'Write freely — there\'s no right answer here…',
  minLength = 20,
  maxLength = 3000,
  onTelemetry,
  onComplete,
  className = '',
}: ReflectionScreenProps) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [response, setResponse] = useState('');
  const [visible, setVisible] = useState(false);

  const mountedAtRef = useRef<number>(Date.now());
  const writingBeganRef = useRef<boolean>(false);
  const writingStartedAtRef = useRef<number | null>(null);
  const writingMsRef = useRef<number>(0);

  const elapsed = useCallback(() => Date.now() - mountedAtRef.current, []);

  const emit = useCallback(
    (event: ReflectionTelemetryEvent) => {
      onTelemetry?.(event);
    },
    [onTelemetry],
  );

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    emit({
      type: 'reflection:started',
      interactionId,
      timestamp: new Date().toISOString(),
    });
    return () => clearTimeout(t);
  }, [interactionId, emit]);

  const handleBeginWriting = useCallback(() => {
    setPhase('writing');
  }, []);

  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      // Emit writing_began on first keystroke
      if (!writingBeganRef.current && value.length > 0) {
        writingBeganRef.current = true;
        writingStartedAtRef.current = Date.now();
        emit({
          type: 'reflection:writing_began',
          interactionId,
          elapsedMs: elapsed(),
          timestamp: new Date().toISOString(),
        });
      }

      setResponse(value);
    },
    [interactionId, emit, elapsed],
  );

  const handleSubmit = useCallback(() => {
    if (response.trim().length < minLength) return;

    // Capture writing duration
    if (writingStartedAtRef.current !== null) {
      writingMsRef.current += Date.now() - writingStartedAtRef.current;
      writingStartedAtRef.current = null;
    }

    emit({
      type: 'reflection:submitted',
      interactionId,
      response,
      responseLength: response.length,
      writingMs: writingMsRef.current,
      elapsedMs: elapsed(),
      timestamp: new Date().toISOString(),
    });

    setPhase('complete');
  }, [response, minLength, interactionId, emit, elapsed]);

  const handleComplete = useCallback(() => {
    const totalTimeMs = elapsed();
    const result: ReflectionResult = {
      interactionId,
      response,
      totalTimeMs,
    };

    emit({
      type: 'reflection:completed',
      interactionId,
      response,
      totalTimeMs,
      timestamp: new Date().toISOString(),
    });

    onComplete?.(result);
  }, [interactionId, response, emit, elapsed, onComplete]);

  const canSubmit = response.trim().length >= minLength;

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
              <IconQuill />
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
              Reflection
            </p>
          </div>

          {/* Topic */}
          <p
            style={{
              fontSize: 'var(--text-sm)',
              fontStyle: 'italic',
              color: 'var(--return-text-secondary)',
              marginBottom: 'var(--space-5)',
              letterSpacing: '0.03em',
            }}
          >
            {topic}
          </p>

          {/* Main question */}
          <CardTitle
            as="h2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-regular)',
              color: 'var(--return-text-primary)',
              lineHeight: 'var(--leading-encounter)',
              marginBottom: guidingNote ? 'var(--space-4)' : 0,
            }}
          >
            {reflectionQuestion}
          </CardTitle>

          {/* Guiding note */}
          {guidingNote && (
            <p
              style={{
                fontSize: 'var(--text-base)',
                color: 'var(--return-text-secondary)',
                lineHeight: 'var(--leading-encounter)',
                fontStyle: 'italic',
              }}
            >
              {guidingNote}
            </p>
          )}
        </CardHeader>

        {/* ---- Content ---- */}
        <CardContent>

          {/* Prompt phase — settling space */}
          {phase === 'prompt' && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-10) 0',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--text-md)',
                  color: 'var(--return-text-secondary)',
                  lineHeight: 'var(--leading-encounter)',
                  fontStyle: 'italic',
                  maxWidth: '420px',
                  margin: '0 auto var(--space-8)',
                }}
              >
                Take a moment. Let the session settle before you write.
              </p>

              {/* Decorative separator */}
              <div
                style={{
                  width: '40px',
                  height: '1px',
                  backgroundColor: 'rgba(168, 92, 138, 0.3)',
                  margin: '0 auto',
                }}
                aria-hidden="true"
              />
            </div>
          )}

          {/* Writing phase */}
          {phase === 'writing' && (
            <div>
              <TextArea
                label="Your reflection"
                placeholder={placeholder}
                value={response}
                onChange={handleResponseChange}
                autoResize
                minRows={6}
                maxRows={20}
                maxLength={maxLength}
                showCount
                aria-label="Open-ended reflection response"
                style={{
                  fontFamily: 'var(--font-encounter)',
                  fontSize: 'var(--text-md)',
                  lineHeight: 'var(--leading-encounter)',
                  color: 'var(--return-text-primary)',
                  backgroundColor: 'rgba(36, 26, 42, 0.6)',
                  borderColor: 'rgba(168, 92, 138, 0.25)',
                }}
              />

              {/* Minimum length hint */}
              {response.trim().length > 0 && response.trim().length < minLength && (
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--return-text-secondary)',
                    fontStyle: 'italic',
                    marginTop: 'var(--space-2)',
                  }}
                  aria-live="polite"
                >
                  Keep going — a few more words.
                </p>
              )}
            </div>
          )}

          {/* Complete phase */}
          {phase === 'complete' && (
            <div
              style={{
                transition: 'opacity var(--duration-return-long) var(--ease-return)',
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
                    padding: 'var(--space-6)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'rgba(36, 26, 42, 0.4)',
                    border: '1px solid rgba(168, 92, 138, 0.12)',
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

              {/* Closing message */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(122, 92, 138, 0.08)',
                  border: '1px solid rgba(122, 92, 138, 0.18)',
                  color: 'var(--return-accent-secondary)',
                }}
                role="status"
                aria-live="polite"
              >
                <span style={{ marginTop: '2px', flexShrink: 0 }}>
                  <IconLeaf />
                </span>
                <p
                  style={{
                    fontSize: 'var(--text-base)',
                    lineHeight: 'var(--leading-encounter)',
                    fontFamily: 'var(--font-encounter)',
                    fontStyle: 'italic',
                    color: 'var(--return-text-primary)',
                  }}
                >
                  {closingMessage}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ---- Footer ---- */}
        <CardFooter>
          {phase === 'prompt' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleBeginWriting}
              aria-label="Begin writing reflection"
              style={{
                backgroundColor: 'var(--return-accent-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
                transition:
                  'background-color var(--duration-return-short) var(--ease-return)',
              }}
            >
              Begin writing
            </Button>
          )}

          {phase === 'writing' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!canSubmit}
              onClick={handleSubmit}
              aria-label="Submit reflection"
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
              aria-label="Finish session"
              style={{
                borderColor: 'var(--return-accent-secondary)',
                color: 'var(--return-text-primary)',
                fontFamily: 'var(--font-encounter)',
                letterSpacing: '0.03em',
              }}
            >
              Finish session
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
