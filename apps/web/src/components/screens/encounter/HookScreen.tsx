/**
 * HookScreen
 *
 * Encounter stage — screen 1 of 4.
 *
 * Grabs the learner's attention with a provocative opening question or a
 * surprising fact about the topic. The goal is to spark curiosity before any
 * explanation has been given. Uses the warm amber palette and serif font
 * defined in the Encounter stage tokens (data-stage="encounter").
 */

import React, { useEffect, useState } from 'react';
import { TopBar } from '../../ui/TopBar';
import { Button } from '../../ui/Button';
import { Progress } from '../../ui/Progress';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface HookScreenProps {
  /** Short label identifying the topic being studied */
  topicTitle: string;

  /**
   * The hook content — either a provocative question (ends with "?") or a
   * surprising statement. Keep to 1–2 sentences for maximum impact.
   */
  hook: string;

  /**
   * Optional secondary text displayed below the hook. Use it to add a little
   * context or intrigue without spoiling the full story.
   */
  subtext?: string;

  /**
   * Which screen in the Encounter sequence this is (1-indexed, out of total).
   * Used to drive the progress bar.
   * @default 1
   */
  screenIndex?: number;

  /**
   * Total number of screens in this Encounter session.
   * @default 4
   */
  totalScreens?: number;

  /** Called when the learner presses "Continue". */
  onNext: () => void;

  /** Called when the learner presses the back arrow in the TopBar. */
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function HookScreen({
  topicTitle,
  hook,
  subtext,
  screenIndex = 1,
  totalScreens = 4,
  onNext,
  onBack,
}: HookScreenProps) {
  // Reveal animation: fade + slight upward slide after mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay ensures the CSS transition fires after paint.
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const progressValue = ((screenIndex - 1) / totalScreens) * 100;
  const isQuestion = hook.trimEnd().endsWith('?');

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
        className="flex-1 flex flex-col items-center justify-center px-6 pb-28"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition:
            'opacity var(--duration-encounter-long) var(--ease-encounter), ' +
            'transform var(--duration-encounter-long) var(--ease-encounter)',
        }}
      >
        {/* Stage badge */}
        <div className="mb-8 flex items-center gap-2">
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
            Encounter
          </span>
        </div>

        {/* Hook text */}
        <div className="max-w-prose text-center">
          {isQuestion ? (
            /* Question variant: large italic serif */
            <h2
              className="text-3xl leading-snug font-display text-text-primary mb-6"
              style={{
                fontFamily: 'var(--font-encounter)',
                fontStyle: 'italic',
                lineHeight: 'var(--leading-encounter)',
              }}
            >
              {hook}
            </h2>
          ) : (
            /* Statement variant: bold display */
            <h2
              className="text-3xl font-bold font-display text-text-primary mb-6"
              style={{
                fontFamily: 'var(--font-encounter)',
                lineHeight: 'var(--leading-encounter)',
              }}
            >
              {hook}
            </h2>
          )}

          {subtext && (
            <p
              className="text-md text-text-secondary"
              style={{
                fontFamily: 'var(--font-encounter)',
                lineHeight: 'var(--leading-extra-loose)',
              }}
            >
              {subtext}
            </p>
          )}
        </div>

        {/* Decorative amber glow orb */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, var(--encounter-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* CTA — fixed above bottom nav safe area                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          I'm curious — tell me more
        </Button>
      </div>
    </div>
  );
}
