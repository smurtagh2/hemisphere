/**
 * NarrativeScreen
 *
 * Encounter stage — screen 2 of 4.
 *
 * Delivers a short story-based introduction to the topic concept. Instead of
 * definitions, the learner meets the idea through a narrative — a historical
 * moment, a human anecdote, or a vivid analogy. Uses the Encounter stage
 * (data-stage="encounter") warm serif aesthetic and slow, organic motion.
 */

import React, { useEffect, useState } from 'react';
import { TopBar } from '../../ui/TopBar';
import { Button } from '../../ui/Button';
import { Progress } from '../../ui/Progress';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface NarrativeSection {
  /** Brief label that signals the section's function, e.g. "Setting the scene" */
  label?: string;
  /** The narrative paragraph(s). Newlines are preserved. */
  text: string;
}

export interface NarrativeScreenProps {
  /** Short label identifying the topic being studied */
  topicTitle: string;

  /**
   * Optional story title / episode name shown above the body.
   * e.g. "The Night Newton Sat Under the Apple Tree"
   */
  storyTitle?: string;

  /**
   * Narrative body. Pass one or more sections to break the story into
   * labelled chunks, or a single section for a plain flowing narrative.
   */
  sections: NarrativeSection[];

  /**
   * Optional pull-quote — the single most evocative sentence from the story,
   * displayed as a styled blockquote below the body.
   */
  pullQuote?: string;

  /**
   * Which screen in the Encounter sequence this is (1-indexed, out of total).
   * Used to drive the progress bar.
   * @default 2
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

export function NarrativeScreen({
  topicTitle,
  storyTitle,
  sections,
  pullQuote,
  screenIndex = 2,
  totalScreens = 4,
  onNext,
  onBack,
}: NarrativeScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const progressValue = ((screenIndex - 1) / totalScreens) * 100;

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
      {/* Scrollable narrative body                                             */}
      {/* ------------------------------------------------------------------ */}
      <main
        className="flex-1 overflow-y-auto px-6 pb-36"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition:
            'opacity var(--duration-encounter-long) var(--ease-encounter), ' +
            'transform var(--duration-encounter-long) var(--ease-encounter)',
        }}
      >
        <div className="max-w-prose mx-auto">
          {/* Stage label */}
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
              Story
            </span>
          </div>

          {/* Story title */}
          {storyTitle && (
            <h2
              className="text-2xl font-bold font-display text-text-primary mb-8"
              style={{
                fontFamily: 'var(--font-encounter)',
                lineHeight: 'var(--leading-snug)',
              }}
            >
              {storyTitle}
            </h2>
          )}

          {/* Narrative sections */}
          <div className="space-y-8">
            {sections.map((section, idx) => (
              <section key={idx} aria-label={section.label}>
                {section.label && (
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{
                      color: 'var(--encounter-accent-secondary)',
                      fontFamily: 'var(--font-analysis)',
                    }}
                  >
                    {section.label}
                  </p>
                )}
                {/* Preserve explicit newlines within a section */}
                {section.text.split('\n').map((paragraph, pIdx) =>
                  paragraph.trim() ? (
                    <p
                      key={pIdx}
                      className="text-md text-text-primary mb-4 last:mb-0"
                      style={{
                        fontFamily: 'var(--font-encounter)',
                        lineHeight: 'var(--leading-encounter)',
                      }}
                    >
                      {paragraph}
                    </p>
                  ) : null
                )}
              </section>
            ))}
          </div>

          {/* Pull-quote */}
          {pullQuote && (
            <blockquote
              className="mt-10 pl-5 border-l-2"
              style={{ borderColor: 'var(--encounter-accent-primary)' }}
            >
              <p
                className="text-xl italic text-text-primary"
                style={{
                  fontFamily: 'var(--font-encounter)',
                  lineHeight: 'var(--leading-encounter)',
                }}
              >
                "{pullQuote}"
              </p>
            </blockquote>
          )}
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Continue the journey
        </Button>
      </div>
    </div>
  );
}
