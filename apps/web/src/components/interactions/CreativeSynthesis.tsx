/**
 * CreativeSynthesis Interaction Component
 *
 * A Return-stage free-form creative response activity. The learner is given a
 * synthesis prompt and writes a short creative response: an analogy, metaphor,
 * story fragment, or visual description.
 *
 * Flow:
 *   1. Learner sees the synthesis prompt (displayed prominently in serif font)
 *   2. An optional scaffold hint is shown beneath the prompt
 *   3. Learner types their response in a large textarea
 *   4. A live character count shows progress toward minLength
 *   5. "Share Reflection" submit button becomes enabled once minLength is met
 *   6. Optional "Skip" link in muted text
 *   7. On submit: a warm confirmation message is shown briefly, then onSubmit
 *      is called with the response text and elapsed milliseconds
 *
 * Telemetry:
 *   { type: 'creative-synthesis:submitted', length: response.length, timeMs }
 *
 * Design: Return stage (RH-Primary, Enriched) — warm deep spectrum, serif font,
 * contemplative motion. Uses --return-* CSS variables.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreativeSynthesisProps {
  /** The synthesis prompt shown to the learner. */
  prompt: string;
  /** Optional scaffold or example to help the learner get started. */
  scaffold?: string;
  /** Minimum character count before the submit button is enabled. Default: 50. */
  minLength?: number;
  /** Called when the learner submits their response. */
  onSubmit: (response: string, timeMs: number) => void;
  /** Called when the learner chooses to skip (allowed in Return stage). */
  onSkip?: () => void;
}

// ---------------------------------------------------------------------------
// Phase type
// ---------------------------------------------------------------------------

type Phase = 'composing' | 'confirming' | 'done';

// ---------------------------------------------------------------------------
// Main CreativeSynthesis Component
// ---------------------------------------------------------------------------

export function CreativeSynthesis({
  prompt,
  scaffold,
  minLength = 50,
  onSubmit,
  onSkip,
}: CreativeSynthesisProps) {
  const [response, setResponse] = useState('');
  const [phase, setPhase] = useState<Phase>('composing');
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount for immediate typing
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const charCount = response.length;
  const isSubmittable = charCount >= minLength && phase === 'composing';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResponse(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isSubmittable) return;

    const timeMs = Date.now() - startTimeRef.current;
    setPhase('confirming');
    setConfirmationVisible(true);

    // Emit telemetry inline (lightweight side-effect before calling onSubmit)
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__hemisphere_telemetry) {
      const telemetryFn = (window as unknown as Record<string, unknown>).__hemisphere_telemetry as (e: unknown) => void;
      telemetryFn({ type: 'creative-synthesis:submitted', length: response.length, timeMs });
    }

    // Brief animation before handing off
    setTimeout(() => {
      setPhase('done');
      onSubmit(response, timeMs);
    }, 1800);
  }, [isSubmittable, response, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter as keyboard shortcut for submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // ---------------------------------------------------------------------------
  // Progress bar fill — 0-100% of minLength
  // ---------------------------------------------------------------------------
  const progressPct = Math.min(100, Math.round((charCount / minLength) * 100));
  const progressReached = progressPct >= 100;

  // ---------------------------------------------------------------------------
  // Render: confirmation overlay
  // ---------------------------------------------------------------------------

  if (phase === 'confirming' || phase === 'done') {
    return (
      <div
        data-stage="return"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-12) var(--space-8)',
          textAlign: 'center',
          animation: confirmationVisible ? 'cs-fade-in 0.6s var(--ease-return) forwards' : undefined,
        }}
      >
        <style>{`
          @keyframes cs-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Warm check circle */}
        <div
          aria-hidden="true"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(212,114,74,0.15)',
            border: '1.5px solid var(--return-accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12L10 17L19 8"
              stroke="var(--return-accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-encounter)',
            fontSize: 'var(--text-lg)',
            color: 'var(--return-text-primary)',
            fontWeight: 'var(--font-medium)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Your reflection has been recorded
        </p>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--return-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          Thank you for taking the time to reflect deeply.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: composing phase
  // ---------------------------------------------------------------------------

  return (
    <div data-stage="return">
      {/* Prompt area */}
      <div
        style={{
          marginBottom: 'var(--space-6)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--return-accent-primary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Creative Synthesis
        </p>

        <p
          style={{
            fontFamily: 'var(--font-encounter)',
            fontSize: 'var(--text-lg)',
            lineHeight: 'var(--leading-encounter)',
            color: 'var(--return-text-primary)',
            fontWeight: 'var(--font-regular)',
            marginBottom: scaffold ? 'var(--space-4)' : '0',
          }}
        >
          {prompt}
        </p>

        {scaffold && (
          <p
            style={{
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-relaxed)',
              color: 'var(--return-text-secondary)',
              fontStyle: 'italic',
              padding: 'var(--space-3) var(--space-4)',
              borderLeft: '2px solid var(--return-accent-secondary)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              backgroundColor: 'rgba(168,92,138,0.06)',
            }}
          >
            {scaffold}
          </p>
        )}
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <textarea
          ref={textareaRef}
          value={response}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Begin your reflection here…"
          aria-label="Your creative response"
          aria-describedby="cs-char-count"
          rows={6}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid var(--return-accent-tertiary)`,
            backgroundColor: 'rgba(255,255,255,0.03)',
            color: 'var(--return-text-primary)',
            fontFamily: 'var(--font-encounter)',
            fontSize: 'var(--text-base)',
            lineHeight: 'var(--leading-encounter)',
            outline: 'none',
            transition:
              'border-color var(--duration-return-short) var(--ease-return)',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--return-accent-secondary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--return-accent-tertiary)';
          }}
        />
      </div>

      {/* Progress bar + char count */}
      <div
        style={{
          marginBottom: 'var(--space-5)',
        }}
      >
        {/* Bar track */}
        <div
          aria-hidden="true"
          style={{
            height: '3px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            marginBottom: 'var(--space-2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 'var(--radius-full)',
              backgroundColor: progressReached
                ? 'var(--return-accent-primary)'
                : 'var(--return-accent-secondary)',
              transition: 'width 0.3s var(--ease-return), background-color 0.3s var(--ease-return)',
            }}
          />
        </div>

        {/* Label */}
        <div
          id="cs-char-count"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-xs)',
            color: 'var(--return-text-secondary)',
          }}
        >
          <span>
            {progressReached
              ? 'Minimum length reached'
              : `${minLength - charCount} character${minLength - charCount !== 1 ? 's' : ''} to go`}
          </span>
          <span aria-live="polite" aria-atomic="true">
            {charCount} / {minLength}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          alignItems: 'stretch',
        }}
      >
        <button
          type="button"
          disabled={!isSubmittable}
          onClick={handleSubmit}
          aria-label={
            isSubmittable
              ? 'Share your reflection'
              : `Write at least ${minLength - charCount} more characters to submit`
          }
          style={{
            padding: 'var(--space-3) var(--space-6)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: isSubmittable
              ? 'var(--return-accent-primary)'
              : 'rgba(212,114,74,0.3)',
            color: isSubmittable ? '#fff' : 'var(--return-text-secondary)',
            fontFamily: 'var(--font-encounter)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-medium)',
            cursor: isSubmittable ? 'pointer' : 'not-allowed',
            transition:
              'background-color var(--duration-return-short) var(--ease-return), ' +
              'color var(--duration-return-short) var(--ease-return)',
          }}
        >
          Share Reflection
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'none',
              border: 'none',
              color: 'var(--return-text-secondary)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              opacity: 0.7,
              transition: 'opacity var(--duration-return-short) var(--ease-return)',
              alignSelf: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          >
            Skip for now
          </button>
        )}

        {isSubmittable && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 'var(--text-xs)',
              color: 'var(--return-text-secondary)',
              opacity: 0.6,
            }}
          >
            Tip: press Cmd+Enter to submit
          </p>
        )}
      </div>
    </div>
  );
}
