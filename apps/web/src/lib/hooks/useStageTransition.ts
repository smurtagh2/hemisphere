/**
 * useStageTransition Hook
 *
 * Manages the full-screen crossfade transition between learning stages.
 *
 * Transition sequence:
 *   1. Caller invokes `startTransition(from, to)`
 *   2. Phase "exiting"  – the outgoing stage fades out over 1 000 ms
 *   3. Phase "entering" – the incoming stage fades in over 1 000 ms
 *   4. Phase null       – transition complete; `onComplete` callback fired
 *
 * Total elapsed time: ~2 000 ms, matching `--duration-stage-transition-long`.
 * All timing is driven by `setTimeout`; no animation library is used.
 *
 * Transition copy:
 *   Encounter → Analysis : "Let's look closer…"
 *   Analysis  → Return   : "Now let's bring it all together…"
 */

import { useState, useRef, useCallback } from 'react';
import type { LearningStage, StageTransition } from '../../types/stage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration (ms) for each fade phase – matches --duration-stage-transition (1 500 ms split 50/50). */
const FADE_OUT_DURATION_MS = 1000;
const FADE_IN_DURATION_MS = 1000;

/** Meaningful copy shown during each transition. */
export const TRANSITION_COPY: Record<NonNullable<StageTransition>, string> = {
  'encounter-to-analysis': "Let's look closer…",
  'analysis-to-return': "Now let\u2019s bring it all together\u2026",
  'return-to-encounter': 'Begin again with fresh eyes…',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which visual phase the overlay is currently in. */
export type TransitionPhase = 'exiting' | 'entering' | null;

export interface StageTransitionState {
  /** The transition key (e.g. "encounter-to-analysis"), or null when idle. */
  transition: StageTransition;

  /** Which fade phase is active; null when no transition is in progress. */
  phase: TransitionPhase;

  /** Convenience flag – true while any transition is running. */
  isTransitioning: boolean;

  /** The copy string to display during the active transition. */
  copy: string | null;

  /** The outgoing stage (source), or null when idle. */
  fromStage: LearningStage | null;

  /** The incoming stage (destination), or null when idle. */
  toStage: LearningStage | null;
}

export interface UseStageTransitionReturn extends StageTransitionState {
  /**
   * Initiate a full-screen transition from `from` to `to`.
   *
   * @param from        The stage that is being left.
   * @param to          The stage being entered.
   * @param onComplete  Optional callback fired once the transition completes.
   */
  startTransition: (
    from: LearningStage,
    to: LearningStage,
    onComplete?: () => void,
  ) => void;

  /** Abort an in-progress transition immediately and reset to idle. */
  cancelTransition: () => void;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function deriveTransitionKey(
  from: LearningStage,
  to: LearningStage,
): StageTransition {
  if (from === 'encounter' && to === 'analysis') return 'encounter-to-analysis';
  if (from === 'analysis' && to === 'return') return 'analysis-to-return';
  if (from === 'return' && to === 'encounter') return 'return-to-encounter';
  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Controls full-screen stage transitions.
 *
 * @example
 * ```tsx
 * const { isTransitioning, startTransition } = useStageTransition();
 *
 * function handleAdvanceStage() {
 *   startTransition('encounter', 'analysis', () => {
 *     setCurrentStage('analysis');
 *   });
 * }
 * ```
 */
export function useStageTransition(): UseStageTransitionReturn {
  const [state, setState] = useState<StageTransitionState>({
    transition: null,
    phase: null,
    isTransitioning: false,
    copy: null,
    fromStage: null,
    toStage: null,
  });

  // Keep timeout IDs so we can clear them on cancel.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef<(() => void) | undefined>(undefined);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(() => {
    setState({
      transition: null,
      phase: null,
      isTransitioning: false,
      copy: null,
      fromStage: null,
      toStage: null,
    });
  }, []);

  const startTransition = useCallback(
    (from: LearningStage, to: LearningStage, onComplete?: () => void) => {
      // Prevent overlapping transitions.
      clearTimers();

      const transitionKey = deriveTransitionKey(from, to);
      const copy = transitionKey ? TRANSITION_COPY[transitionKey] : null;

      callbackRef.current = onComplete;

      // Phase 1 – exiting (outgoing stage fades out).
      setState({
        transition: transitionKey,
        phase: 'exiting',
        isTransitioning: true,
        copy,
        fromStage: from,
        toStage: to,
      });

      // After fade-out completes, switch to "entering" phase.
      timerRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          phase: 'entering',
        }));

        // After fade-in completes, fire callback and return to idle.
        timerRef.current = setTimeout(() => {
          resetToIdle();
          callbackRef.current?.();
          callbackRef.current = undefined;
        }, FADE_IN_DURATION_MS);
      }, FADE_OUT_DURATION_MS);
    },
    [clearTimers, resetToIdle],
  );

  const cancelTransition = useCallback(() => {
    clearTimers();
    callbackRef.current = undefined;
    resetToIdle();
  }, [clearTimers, resetToIdle]);

  return {
    ...state,
    startTransition,
    cancelTransition,
  };
}
