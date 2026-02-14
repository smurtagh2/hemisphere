/**
 * EmotionalAnchorScreen
 *
 * Encounter stage — screen 4 of 4.
 *
 * Asks the learner a personal connection question — why does this topic matter
 * to *them*? The learner types a free-text response which is stored as a
 * "personal anchor". This anchor is surfaced again in the Return stage to
 * create narrative closure. Uses the Encounter stage warm amber tokens.
 */

import React, { useEffect, useState } from 'react';
import { TopBar } from '../../ui/TopBar';
import { Button } from '../../ui/Button';
import { Progress } from '../../ui/Progress';
import { TextArea } from '../../ui/TextArea';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface EmotionalAnchorScreenProps {
  /** Short label identifying the topic being studied */
  topicTitle: string;

  /**
   * The personal-connection prompt shown above the text area.
   * Keep it open-ended and reflective.
   * e.g. "Why does this topic feel important to you right now?"
   */
  prompt: string;

  /**
   * Optional inspirational sub-prompt displayed below the main prompt in a
   * lighter treatment to help the learner get started.
   */
  subPrompt?: string;

  /**
   * Placeholder text inside the text area.
   * @default "Write whatever comes to mind…"
   */
  placeholder?: string;

  /**
   * If the learner already has a saved anchor for this topic (e.g. revisiting),
   * pre-fill the text area with it.
   */
  initialValue?: string;

  /**
   * Minimum character count before the "Continue" button becomes active.
   * Set to 0 to allow skipping.
   * @default 10
   */
  minLength?: number;

  /**
   * Which screen in the Encounter sequence this is (1-indexed, out of total).
   * @default 4
   */
  screenIndex?: number;

  /**
   * Total number of screens in this Encounter session.
   * @default 4
   */
  totalScreens?: number;

  /**
   * Called when the learner submits.
   * Receives the text they wrote (trimmed).
   */
  onNext: (anchorText: string) => void;

  /** Called when the learner presses the back arrow in the TopBar. */
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function EmotionalAnchorScreen({
  topicTitle,
  prompt,
  subPrompt,
  placeholder = 'Write whatever comes to mind\u2026',
  initialValue = '',
  minLength = 10,
  screenIndex = 4,
  totalScreens = 4,
  onNext,
  onBack,
}: EmotionalAnchorScreenProps) {
  const [visible, setVisible] = useState(false);
  const [anchorText, setAnchorText] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const progressValue = ((screenIndex - 1) / totalScreens) * 100;
  const isReady = anchorText.trim().length >= minLength;
  const remaining = Math.max(0, minLength - anchorText.trim().length);

  const handleSubmit = () => {
    if (isReady) {
      onNext(anchorText.trim());
    }
  };

  return (
    <div
      data-stage="encounter"
      className="min-h-screen flex flex-col bg-bg-primary"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Top Bar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <TopBar
        title={topicTitle}
        showBack={Boolean(onBack)}
        onBack={onBack}
        showBorder={false}
        transparent
      />

      {/* ------------------------------------------------------------------ */}
      {/* Progress indicator                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-6 pt-2 pb-4">
        <Progress
          value={progressValue}
          size="sm"
          aria-label={`Encounter stage — screen ${screenIndex} of ${totalScreens}`}
        />
        <p className="mt-2 text-xs text-text-secondary text-right">
          {screenIndex} / {totalScreens}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        className="flex-1 px-6 pb-36"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition:
            'opacity var(--duration-encounter-long) var(--ease-encounter), ' +
            'transform var(--duration-encounter-long) var(--ease-encounter)',
        }}
      >
        <div className="max-w-prose mx-auto">
          {/* Stage badge */}
          <div className="mb-6 flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--encounter-accent-primary)' }}
              aria-hidden="true"
            />
            <span
              className="text-sm font-medium tracking-widest uppercase"
              style={{
                color: 'var(--encounter-accent-primary)',
                fontFamily: 'var(--font-analysis)',
              }}
            >
              Your connection
            </span>
          </div>

          {/* Anchor icon — simple heart SVG */}
          <div className="mb-6" aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: 'var(--encounter-accent-primary)' }}
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Prompt */}
          <h2
            className="text-2xl font-display text-text-primary mb-4"
            style={{
              fontFamily: 'var(--font-encounter)',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            {prompt}
          </h2>

          {subPrompt && (
            <p
              className="text-md text-text-secondary mb-8"
              style={{
                fontFamily: 'var(--font-encounter)',
                lineHeight: 'var(--leading-extra-loose)',
              }}
            >
              {subPrompt}
            </p>
          )}

          {/* Text area */}
          <TextArea
            value={anchorText}
            onChange={(e) => setAnchorText(e.target.value)}
            placeholder={placeholder}
            rows={5}
            aria-label="Personal connection response"
            aria-describedby="anchor-hint"
            style={{
              fontFamily: 'var(--font-encounter)',
              fontSize: 'var(--text-md)',
              lineHeight: 'var(--leading-encounter)',
              background: 'var(--encounter-bg-secondary)',
              color: 'var(--encounter-text-primary)',
              border: '1.5px solid',
              borderColor: anchorText.trim().length > 0
                ? 'var(--encounter-accent-secondary)'
                : 'var(--encounter-accent-tertiary)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--space-5)',
              width: '100%',
              resize: 'vertical',
            }}
          />

          {/* Character hint */}
          <p
            id="anchor-hint"
            className="mt-2 text-xs"
            style={{
              color: isReady
                ? 'var(--encounter-accent-secondary)'
                : 'var(--encounter-text-secondary)',
            }}
          >
            {isReady
              ? 'Your anchor is saved — press Continue when you\'re ready.'
              : `${remaining} more character${remaining === 1 ? '' : 's'} to continue.`}
          </p>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isReady}
          onClick={handleSubmit}
        >
          Set my anchor &amp; begin learning
        </Button>

        {minLength > 0 && !isReady && (
          <button
            type="button"
            className="w-full mt-3 text-sm text-text-secondary underline"
            onClick={() => onNext('')}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
