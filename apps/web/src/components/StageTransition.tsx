/**
 * StageTransition Component
 *
 * Full-screen overlay rendered during stage crossfades.
 *
 * Visual design
 * ─────────────
 * The overlay sits above all other content (z-50) and covers the viewport.
 * It carries its own `data-stage-transition` attribute so tokens.css can
 * interpolate the correct mid-point background colour:
 *   encounter-to-analysis → #1a1e24
 *   analysis-to-return    → #161420
 *
 * The overlay itself fades in and out via the `opacity` CSS transition.
 * No JS animation library is used – all motion is driven by CSS transitions
 * using the `--duration-stage-transition` and `--ease-encounter` tokens.
 *
 * Typography shift
 * ────────────────
 * The transition copy is rendered in a font that bridges the two stages:
 *   Encounter → Analysis : serif text that resolves toward sans-serif
 *   Analysis  → Return   : sans-serif text that resolves toward serif
 *
 * During "exiting" the copy is shown in the FROM-stage font family.
 * During "entering" the copy transitions to the TO-stage font family.
 * This makes the typography shift part of the transition itself.
 *
 * Accessibility
 * ─────────────
 * • The overlay traps no focus – it is purely presentational.
 * • `aria-live="polite"` announces the copy to screen readers once.
 * • `aria-hidden` is set to `true` when the overlay is not visible.
 * • Respects `prefers-reduced-motion` via the global token override in
 *   tokens.css (all transitions collapse to 0.01 ms).
 */

import React from 'react';
import type { LearningStage, StageTransition } from '../types/stage';
import type { TransitionPhase } from '../lib/hooks/useStageTransition';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StageTransitionProps {
  /**
   * The active transition key, e.g. "encounter-to-analysis".
   * Pass `null` when no transition is running.
   */
  transition: StageTransition;

  /**
   * Current animation phase:
   *  - "exiting"  – overlay fades in, content fades out
   *  - "entering" – new content fades in, overlay fades out
   *  - null       – overlay is hidden
   */
  phase: TransitionPhase;

  /** The stage being left. Used to set the initial font family for the copy. */
  fromStage: LearningStage | null;

  /** The stage being entered. Used to set the final font family for the copy. */
  toStage: LearningStage | null;

  /** Meaningful copy to display during the transition. */
  copy: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the font-family CSS value for a given stage.
 * Encounter and Return use the serif font; Analysis uses the sans-serif font.
 */
function fontFamilyForStage(stage: LearningStage | null): string {
  if (!stage) return 'var(--font-analysis)';
  return stage === 'analysis' ? 'var(--font-analysis)' : 'var(--font-encounter)';
}

/**
 * Derives a human-readable label for a transition to use in `aria-label`.
 */
function transitionAriaLabel(
  fromStage: LearningStage | null,
  toStage: LearningStage | null,
): string {
  if (!fromStage || !toStage) return 'Stage transition in progress';
  const from = fromStage.charAt(0).toUpperCase() + fromStage.slice(1);
  const to = toStage.charAt(0).toUpperCase() + toStage.slice(1);
  return `Transitioning from ${from} to ${to}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-screen transition overlay.
 *
 * Mount this component unconditionally and pass `transition` / `phase` props
 * from `useStageTransition`. The overlay shows only when `phase` is non-null.
 *
 * @example
 * ```tsx
 * const {
 *   transition,
 *   phase,
 *   fromStage,
 *   toStage,
 *   copy,
 *   startTransition,
 * } = useStageTransition();
 *
 * return (
 *   <>
 *     <StageTransition
 *       transition={transition}
 *       phase={phase}
 *       fromStage={fromStage}
 *       toStage={toStage}
 *       copy={copy}
 *     />
 *     <YourAppContent />
 *   </>
 * );
 * ```
 */
export function StageTransition({
  transition,
  phase,
  fromStage,
  toStage,
  copy,
}: StageTransitionProps) {
  const isVisible = phase !== null;

  // Opacity: fully opaque at the midpoint between exiting and entering.
  // "exiting" → fading IN (opacity 1)
  // "entering" → fading OUT (opacity 0, destination stage shows through)
  const overlayOpacity = phase === 'exiting' ? 1 : 0;

  // The copy's font family shifts from the source-stage font toward the
  // destination-stage font between the exiting and entering phases.
  const copyFontFamily =
    phase === 'exiting'
      ? fontFamilyForStage(fromStage)
      : fontFamilyForStage(toStage);

  // The copy itself fades in with the overlay and then fades out, but it
  // lingers slightly – achieved by delaying the opacity on "entering".
  // A small upward translate adds a sense of movement.
  const copyTranslate = phase === 'exiting' ? '0' : '-8px';
  const copyOpacity = phase === 'exiting' ? 1 : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isVisible ? transitionAriaLabel(fromStage, toStage) : undefined}
      aria-hidden={!isVisible}
      data-stage-transition={transition ?? undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: isVisible ? 'all' : 'none',
        opacity: overlayOpacity,
        // The overlay's background is provided by the data-stage-transition
        // token in tokens.css – it interpolates a midpoint colour.
        // We fall back to a neutral dark if no transition key is set.
        backgroundColor: transition
          ? 'var(--bg-primary, #1a1a1a)'
          : 'transparent',
        transition: [
          `opacity var(--duration-stage-transition) var(--ease-encounter)`,
          `background-color var(--duration-stage-transition) var(--ease-encounter)`,
        ].join(', '),
      }}
    >
      {/* Transition copy */}
      {copy && (
        <div
          aria-hidden={!isVisible}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-6)',
            maxWidth: '480px',
            padding: '0 var(--space-8)',
            textAlign: 'center',
            opacity: copyOpacity,
            transform: `translateY(${copyTranslate})`,
            transition: [
              `opacity var(--duration-stage-transition) var(--ease-encounter)`,
              `transform var(--duration-stage-transition) var(--ease-encounter)`,
              `font-family var(--duration-stage-transition) var(--ease-encounter)`,
            ].join(', '),
          }}
        >
          {/* Typography shift indicator */}
          <TypographyShiftIndicator
            fromStage={fromStage}
            toStage={toStage}
            phase={phase}
          />

          {/* Copy text */}
          <p
            style={{
              fontFamily: copyFontFamily,
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-regular)',
              lineHeight: 'var(--leading-encounter)',
              color: 'var(--text-primary, #f5e6d3)',
              margin: 0,
              letterSpacing: '0.01em',
              transition: `font-family var(--duration-stage-transition) var(--ease-encounter)`,
            }}
          >
            {copy}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TypographyShiftIndicator
// ---------------------------------------------------------------------------

/**
 * A small visual element that makes the font-family shift legible.
 *
 * Shows two short letterform samples – one in serif, one in sans-serif –
 * and uses opacity to signal which is "active":
 *   Encounter → Analysis : serif fades out, sans-serif fades in
 *   Analysis  → Return   : sans-serif fades out, serif fades in
 *
 * This is a subtle but intentional signal of the cognitive mode change.
 */
interface TypographyShiftIndicatorProps {
  fromStage: LearningStage | null;
  toStage: LearningStage | null;
  phase: TransitionPhase;
}

function TypographyShiftIndicator({
  fromStage,
  toStage,
  phase,
}: TypographyShiftIndicatorProps) {
  // Determine which font is "from" and which is "to".
  const fromIsSerif = fromStage !== 'analysis';
  // toIsSerif = toStage !== 'analysis'; (used below for opacity logic)

  // During "exiting", the from-font is opaque and the to-font is ghosted.
  // During "entering", the to-font is opaque and the from-font is ghosted.
  const serifOpacity = fromIsSerif
    ? phase === 'exiting' ? 1 : 0.2
    : phase === 'exiting' ? 0.2 : 1;

  const sansOpacity = !fromIsSerif
    ? phase === 'exiting' ? 1 : 0.2
    : phase === 'exiting' ? 0.2 : 1;

  const indicatorColor = 'var(--accent-primary, #e8913a)';
  const dimColor = 'var(--text-secondary, #8899aa)';

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      {/* Serif sample */}
      <span
        style={{
          fontFamily: 'var(--font-encounter)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-regular)',
          color: serifOpacity > 0.5 ? indicatorColor : dimColor,
          opacity: serifOpacity,
          transition: [
            `opacity var(--duration-stage-transition) var(--ease-encounter)`,
            `color var(--duration-stage-transition) var(--ease-encounter)`,
          ].join(', '),
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Ag
      </span>

      {/* Divider */}
      <span
        style={{
          width: '1px',
          height: '1.5em',
          backgroundColor: 'var(--text-secondary, #8899aa)',
          opacity: 0.3,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />

      {/* Sans-serif sample */}
      <span
        style={{
          fontFamily: 'var(--font-analysis)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-regular)',
          color: sansOpacity > 0.5 ? indicatorColor : dimColor,
          opacity: sansOpacity,
          transition: [
            `opacity var(--duration-stage-transition) var(--ease-encounter)`,
            `color var(--duration-stage-transition) var(--ease-encounter)`,
          ].join(', '),
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Ag
      </span>
    </div>
  );
}
