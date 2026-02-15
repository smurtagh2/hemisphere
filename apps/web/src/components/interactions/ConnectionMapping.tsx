/**
 * ConnectionMapping Interaction Component
 *
 * A Return-stage prompted connection-mapping activity. The learner sees two
 * concept nodes and is asked to identify how they connect.
 *
 * Flow:
 *   1. Learner sees conceptA and conceptB as two "nodes" with an arrow between
 *      them and the guiding question beneath
 *   2. Learner selects a connection type from pill buttons — OR — types a custom
 *      one (the text field appears after clicking "Custom…")
 *   3. Learner writes a brief explanation (1–2 sentences) in a textarea
 *   4. "Map Connection" submit button becomes enabled once a connection type is
 *      chosen (explanation is optional but encouraged)
 *   5. onSubmit is called with connectionType, explanation, and elapsed ms
 *
 * Telemetry:
 *   { type: 'connection-mapping:submitted', connectionType, explanationLength, timeMs }
 *
 * Design: Return stage (RH-Primary, Enriched) — warm deep spectrum, serif font,
 * contemplative motion. Uses --return-* CSS variables.
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectionMappingProps {
  /** First concept node. */
  conceptA: string;
  /** Second concept node. */
  conceptB: string;
  /** Guiding question (e.g. "How does photosynthesis relate to the carbon cycle?"). */
  prompt: string;
  /**
   * Suggested connection types shown as pill buttons.
   * Default: ['causes', 'contrasts with', 'is an example of', 'supports',
   *           'depends on', 'is part of']
   */
  connectionTypes?: string[];
  /** Called when learner submits. */
  onSubmit: (connectionType: string, explanation: string, timeMs: number) => void;
  /** Called when learner chooses to skip (allowed in Return stage). */
  onSkip?: () => void;
}

const DEFAULT_CONNECTION_TYPES = [
  'causes',
  'contrasts with',
  'is an example of',
  'supports',
  'depends on',
  'is part of',
];

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconArrowRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 10H16M16 10L11 5M16 10L11 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ConceptNode
// ---------------------------------------------------------------------------

function ConceptNode({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--return-accent-tertiary)',
        backgroundColor: 'rgba(122,92,138,0.08)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-encounter)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--return-text-primary)',
          lineHeight: 'var(--leading-normal)',
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ConnectionMapping Component
// ---------------------------------------------------------------------------

export function ConnectionMapping({
  conceptA,
  conceptB,
  prompt,
  connectionTypes = DEFAULT_CONNECTION_TYPES,
  onSubmit,
  onSkip,
}: ConnectionMappingProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customType, setCustomType] = useState('');
  const [explanation, setExplanation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const explanationRef = useRef<HTMLTextAreaElement>(null);

  const effectiveType = isCustom ? customType.trim() : selectedType;
  const isSubmittable = !submitted && Boolean(effectiveType);

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
    setIsCustom(false);
    setCustomType('');
  }, []);

  const handleCustomClick = useCallback(() => {
    setIsCustom(true);
    setSelectedType(null);
    // Focus custom input on next tick
    setTimeout(() => {
      const input = document.getElementById('cm-custom-type');
      if (input) (input as HTMLInputElement).focus();
    }, 50);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isSubmittable) return;

    const timeMs = Date.now() - startTimeRef.current;
    const connectionType = effectiveType as string;
    const explanationLength = explanation.trim().length;

    setSubmitted(true);

    // Emit telemetry
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__hemisphere_telemetry) {
      const telemetryFn = (window as unknown as Record<string, unknown>).__hemisphere_telemetry as (e: unknown) => void;
      telemetryFn({
        type: 'connection-mapping:submitted',
        connectionType,
        explanationLength,
        timeMs,
      });
    }

    onSubmit(connectionType, explanation.trim(), timeMs);
  }, [isSubmittable, effectiveType, explanation, onSubmit]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div data-stage="return">

      {/* Stage label */}
      <p
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--return-accent-primary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Connection Mapping
      </p>

      {/* Concept nodes + connector */}
      <div
        role="img"
        aria-label={`Concept relationship: ${conceptA} and ${conceptB}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <ConceptNode label={conceptA} />

        {/* Arrow connector — shows selected type label if chosen */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--return-accent-secondary)',
            flexShrink: 0,
          }}
        >
          {effectiveType && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--return-accent-primary)',
                fontStyle: 'italic',
                maxWidth: '80px',
                textAlign: 'center',
                lineHeight: '1.3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {effectiveType}
            </span>
          )}
          <IconArrowRight />
        </div>

        <ConceptNode label={conceptB} />
      </div>

      {/* Guiding question */}
      <p
        style={{
          fontFamily: 'var(--font-encounter)',
          fontSize: 'var(--text-md)',
          lineHeight: 'var(--leading-encounter)',
          color: 'var(--return-text-primary)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {prompt}
      </p>

      {/* Connection type selection */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--return-text-secondary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Select a connection type
        </p>

        <div
          role="group"
          aria-label="Connection type options"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          {connectionTypes.map((type) => {
            const isActive = !isCustom && selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelectType(type)}
                aria-pressed={isActive}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${isActive ? 'var(--return-accent-primary)' : 'var(--return-accent-tertiary)'}`,
                  backgroundColor: isActive
                    ? 'rgba(212,114,74,0.15)'
                    : 'rgba(122,92,138,0.06)',
                  color: isActive
                    ? 'var(--return-accent-primary)'
                    : 'var(--return-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-regular)',
                  cursor: 'pointer',
                  transition:
                    'border-color var(--duration-return-short) var(--ease-return), ' +
                    'background-color var(--duration-return-short) var(--ease-return), ' +
                    'color var(--duration-return-short) var(--ease-return)',
                }}
              >
                {type}
              </button>
            );
          })}

          {/* Custom option */}
          <button
            type="button"
            onClick={handleCustomClick}
            aria-pressed={isCustom}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${isCustom ? 'var(--return-accent-primary)' : 'var(--return-accent-tertiary)'}`,
              backgroundColor: isCustom ? 'rgba(212,114,74,0.15)' : 'rgba(122,92,138,0.06)',
              color: isCustom ? 'var(--return-accent-primary)' : 'var(--return-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontStyle: 'italic',
              cursor: 'pointer',
              transition:
                'border-color var(--duration-return-short) var(--ease-return), ' +
                'background-color var(--duration-return-short) var(--ease-return)',
            }}
          >
            Custom…
          </button>
        </div>

        {/* Custom type text input */}
        {isCustom && (
          <input
            id="cm-custom-type"
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Describe the relationship…"
            aria-label="Custom connection type"
            style={{
              marginTop: 'var(--space-3)',
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--return-accent-secondary)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              color: 'var(--return-text-primary)',
              fontFamily: 'var(--font-encounter)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {/* Explanation textarea */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <label
          htmlFor="cm-explanation"
          style={{
            display: 'block',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--return-text-secondary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Your explanation{' '}
          <span
            style={{
              fontWeight: 'var(--font-regular)',
              textTransform: 'none',
              letterSpacing: 'normal',
              fontStyle: 'italic',
            }}
          >
            (optional)
          </span>
        </label>
        <textarea
          id="cm-explanation"
          ref={explanationRef}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="In 1–2 sentences, explain the connection…"
          rows={3}
          aria-label="Brief explanation of the connection"
          style={{
            width: '100%',
            resize: 'vertical',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--return-accent-tertiary)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            color: 'var(--return-text-primary)',
            fontFamily: 'var(--font-encounter)',
            fontSize: 'var(--text-base)',
            lineHeight: 'var(--leading-relaxed)',
            outline: 'none',
            transition: 'border-color var(--duration-return-short) var(--ease-return)',
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
              ? 'Map the connection between the two concepts'
              : 'Select a connection type before mapping'
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
          Map Connection
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
      </div>
    </div>
  );
}
