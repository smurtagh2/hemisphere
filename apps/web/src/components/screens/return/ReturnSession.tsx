/**
 * ReturnSession
 *
 * Orchestrator for the Return stage of the Hemisphere learning loop.
 *
 * The Return stage is the right-hemisphere integration phase: deep, reflective,
 * and contemplative. It sequences three interaction screens for a single
 * learning session:
 *
 *   1. ReconnectionScreen  — "Bring it back."
 *      Bridge the concept to prior knowledge. No right/wrong.
 *
 *   2. TransferChallengeScreen — "Apply it somewhere new."
 *      Novel context, self-assessed quality. Builds flexible schemas.
 *
 *   3. ReflectionScreen — "What changed?"
 *      Open-ended epistemic self-assessment. The deepest layer.
 *
 * On completion of all three screens the orchestrator emits a
 * `return_session:completed` event and calls `onComplete`.
 *
 * Stage transitions are slow (var(--duration-return-long)) and use the Return
 * ease curve. The wrapper always carries `data-stage="return"` so the full
 * token set is available to all children without each screen needing to
 * re-declare it.
 *
 * Telemetry architecture:
 *   - ReturnSession collects its own session-level event (`return_session:completed`)
 *   - Per-screen events flow through the `onTelemetry` prop forwarded to each
 *     child screen
 *
 * Props overview:
 *   - sessionId          : stable ID for the whole return session
 *   - reconnection       : data for the ReconnectionScreen
 *   - transferChallenge  : data for the TransferChallengeScreen
 *   - reflection         : data for the ReflectionScreen
 *   - onTelemetry        : receives all child + session-level events
 *   - onComplete         : called with the full session result
 */

import React, { useCallback, useRef, useState } from 'react';
import { ReconnectionScreen } from './ReconnectionScreen';
import { TransferChallengeScreen } from './TransferChallengeScreen';
import { ReflectionScreen } from './ReflectionScreen';
import type {
  ReconnectionScreenProps,
  ReconnectionResult,
  ReconnectionTelemetryEvent,
} from './ReconnectionScreen';
import type {
  TransferChallengeScreenProps,
  TransferChallengeResult,
  TransferTelemetryEvent,
} from './TransferChallengeScreen';
import type {
  ReflectionScreenProps,
  ReflectionResult,
  ReflectionTelemetryEvent,
} from './ReflectionScreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Union of all telemetry events that can flow through the session */
export type ReturnSessionTelemetryEvent =
  | ReconnectionTelemetryEvent
  | TransferTelemetryEvent
  | ReflectionTelemetryEvent
  | {
      type: 'return_session:completed';
      sessionId: string;
      reconnectionResult: ReconnectionResult;
      transferResult: TransferChallengeResult;
      reflectionResult: ReflectionResult;
      totalTimeMs: number;
      timestamp: string;
    };

/** Full result of a completed Return session */
export interface ReturnSessionResult {
  sessionId: string;
  reconnectionResult: ReconnectionResult;
  transferResult: TransferChallengeResult;
  reflectionResult: ReflectionResult;
  totalTimeMs: number;
}

/** Screen index within the session sequence */
type ScreenIndex = 0 | 1 | 2;
const SCREEN_LABELS: Record<ScreenIndex, string> = {
  0: 'Reconnection',
  1: 'Transfer',
  2: 'Reflection',
};

// ---------------------------------------------------------------------------
// Data shapes (derived from screen props, without the orchestration props)
// ---------------------------------------------------------------------------

/** Data required to configure the ReconnectionScreen */
export type ReconnectionScreenData = Pick<
  ReconnectionScreenProps,
  | 'concept'
  | 'conceptContext'
  | 'bridgingQuestion'
  | 'orientingPrompt'
  | 'placeholder'
  | 'maxLength'
>;

/** Data required to configure the TransferChallengeScreen */
export type TransferChallengeScreenData = Pick<
  TransferChallengeScreenProps,
  | 'concept'
  | 'scenario'
  | 'scenarioContext'
  | 'modelExample'
  | 'revealLabel'
  | 'placeholder'
  | 'maxLength'
>;

/** Data required to configure the ReflectionScreen */
export type ReflectionScreenData = Pick<
  ReflectionScreenProps,
  | 'topic'
  | 'reflectionQuestion'
  | 'guidingNote'
  | 'closingMessage'
  | 'placeholder'
  | 'minLength'
  | 'maxLength'
>;

export interface ReturnSessionProps {
  /**
   * Stable identifier for this session — included in the completion event.
   * Individual interaction IDs are derived as `${sessionId}:reconnection`,
   * `${sessionId}:transfer`, and `${sessionId}:reflection`.
   */
  sessionId: string;

  /** Content for the Reconnection screen */
  reconnection: ReconnectionScreenData;

  /** Content for the Transfer Challenge screen */
  transferChallenge: TransferChallengeScreenData;

  /** Content for the Reflection screen */
  reflection: ReflectionScreenData;

  /**
   * Called for every telemetry event emitted by any child screen or by the
   * session orchestrator itself.
   */
  onTelemetry?: (event: ReturnSessionTelemetryEvent) => void;

  /**
   * Called when the learner has completed all three Return screens.
   * This is the "session complete" signal — the calling layer should advance
   * to whatever comes after Return (e.g. summary, next topic, or session end).
   */
  onComplete?: (result: ReturnSessionResult) => void;

  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  current: ScreenIndex;
}

function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div
      role="navigation"
      aria-label="Return session progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-8)',
        justifyContent: 'center',
      }}
    >
      {([0, 1, 2] as ScreenIndex[]).map((idx) => {
        const isPast = idx < current;
        const isCurrent = idx === current;

        const dotStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isCurrent ? '10px' : '8px',
          height: isCurrent ? '10px' : '8px',
          borderRadius: '50%',
          transition:
            'background-color var(--duration-return-medium) var(--ease-return), ' +
            'width var(--duration-return-medium) var(--ease-return), ' +
            'height var(--duration-return-medium) var(--ease-return)',
          backgroundColor: isCurrent
            ? 'var(--return-accent-primary)'
            : isPast
            ? 'var(--return-accent-secondary)'
            : 'rgba(168, 92, 138, 0.25)',
          flexShrink: 0,
        };

        const connectorStyle: React.CSSProperties = {
          flex: 1,
          height: '1px',
          maxWidth: '48px',
          backgroundColor: isPast
            ? 'var(--return-accent-secondary)'
            : 'rgba(168, 92, 138, 0.2)',
          transition: 'background-color var(--duration-return-long) var(--ease-return)',
        };

        return (
          <React.Fragment key={idx}>
            <div
              style={dotStyle}
              aria-current={isCurrent ? 'step' : undefined}
              title={SCREEN_LABELS[idx]}
            />
            {idx < 2 && <div style={connectorStyle} aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage label strip
// ---------------------------------------------------------------------------

function ReturnStageLabel() {
  return (
    <div
      style={{
        textAlign: 'center',
        marginBottom: 'var(--space-6)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'rgba(168, 92, 138, 0.5)',
          fontFamily: 'var(--font-encounter)',
        }}
      >
        Return
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen wrapper — handles the fade transition between screens
// ---------------------------------------------------------------------------

interface ScreenWrapperProps {
  children: React.ReactNode;
  screenKey: string;
}

function ScreenWrapper({ children, screenKey }: ScreenWrapperProps) {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      key={screenKey}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition:
          'opacity var(--duration-return-long) var(--ease-return), ' +
          'transform var(--duration-return-long) var(--ease-return)',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReturnSession({
  sessionId,
  reconnection,
  transferChallenge,
  reflection,
  onTelemetry,
  onComplete,
  className = '',
}: ReturnSessionProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenIndex>(0);

  // Accumulate per-screen results — populated as screens complete
  const reconnectionResultRef = useRef<ReconnectionResult | null>(null);
  const transferResultRef = useRef<TransferChallengeResult | null>(null);
  const reflectionResultRef = useRef<ReflectionResult | null>(null);

  const sessionStartRef = useRef<number>(Date.now());

  // Forward any child telemetry event upward
  const handleTelemetry = useCallback(
    (event: ReturnSessionTelemetryEvent) => {
      onTelemetry?.(event);
    },
    [onTelemetry],
  );

  // ---- Reconnection complete ----
  const handleReconnectionComplete = useCallback(
    (result: ReconnectionResult) => {
      reconnectionResultRef.current = result;
      setCurrentScreen(1);
    },
    [],
  );

  // ---- Transfer complete ----
  const handleTransferComplete = useCallback(
    (result: TransferChallengeResult) => {
      transferResultRef.current = result;
      setCurrentScreen(2);
    },
    [],
  );

  // ---- Reflection complete → session complete ----
  const handleReflectionComplete = useCallback(
    (result: ReflectionResult) => {
      reflectionResultRef.current = result;

      const reconnectionResult = reconnectionResultRef.current;
      const transferResult = transferResultRef.current;

      // Guard: all results should be available by this point
      if (!reconnectionResult || !transferResult) return;

      const totalTimeMs = Date.now() - sessionStartRef.current;
      const sessionResult: ReturnSessionResult = {
        sessionId,
        reconnectionResult,
        transferResult,
        reflectionResult: result,
        totalTimeMs,
      };

      onTelemetry?.({
        type: 'return_session:completed',
        sessionId,
        reconnectionResult,
        transferResult,
        reflectionResult: result,
        totalTimeMs,
        timestamp: new Date().toISOString(),
      });

      onComplete?.(sessionResult);
    },
    [sessionId, onTelemetry, onComplete],
  );

  return (
    <div
      data-stage="return"
      className={className}
      style={{
        fontFamily: 'var(--font-encounter)',
        minHeight: '100%',
        backgroundColor: 'var(--return-bg-primary)',
        padding: 'var(--space-6)',
      }}
    >
      {/* Session-level chrome */}
      <ReturnStageLabel />
      <StepIndicator current={currentScreen} />

      {/* ---- Screen 0: Reconnection ---- */}
      {currentScreen === 0 && (
        <ScreenWrapper screenKey={`${sessionId}:reconnection`}>
          <ReconnectionScreen
            interactionId={`${sessionId}:reconnection`}
            concept={reconnection.concept}
            conceptContext={reconnection.conceptContext}
            bridgingQuestion={reconnection.bridgingQuestion}
            orientingPrompt={reconnection.orientingPrompt}
            placeholder={reconnection.placeholder}
            maxLength={reconnection.maxLength}
            onTelemetry={handleTelemetry}
            onComplete={handleReconnectionComplete}
          />
        </ScreenWrapper>
      )}

      {/* ---- Screen 1: Transfer Challenge ---- */}
      {currentScreen === 1 && (
        <ScreenWrapper screenKey={`${sessionId}:transfer`}>
          <TransferChallengeScreen
            interactionId={`${sessionId}:transfer`}
            concept={transferChallenge.concept}
            scenario={transferChallenge.scenario}
            scenarioContext={transferChallenge.scenarioContext}
            modelExample={transferChallenge.modelExample}
            revealLabel={transferChallenge.revealLabel}
            placeholder={transferChallenge.placeholder}
            maxLength={transferChallenge.maxLength}
            onTelemetry={handleTelemetry}
            onComplete={handleTransferComplete}
          />
        </ScreenWrapper>
      )}

      {/* ---- Screen 2: Reflection ---- */}
      {currentScreen === 2 && (
        <ScreenWrapper screenKey={`${sessionId}:reflection`}>
          <ReflectionScreen
            interactionId={`${sessionId}:reflection`}
            topic={reflection.topic}
            reflectionQuestion={reflection.reflectionQuestion}
            guidingNote={reflection.guidingNote}
            closingMessage={reflection.closingMessage}
            placeholder={reflection.placeholder}
            minLength={reflection.minLength}
            maxLength={reflection.maxLength}
            onTelemetry={handleTelemetry}
            onComplete={handleReflectionComplete}
          />
        </ScreenWrapper>
      )}
    </div>
  );
}
