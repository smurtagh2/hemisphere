/**
 * AnalysisSession
 *
 * Orchestrator screen for the Analysis stage of a Hemisphere learning session.
 *
 * Responsibilities:
 *   1. Read the current item from the Zustand queue slice.
 *   2. Route to the correct interaction component based on itemType:
 *        'active_recall'   → <ActiveRecall>
 *        'multiple_choice' → <MCQ>
 *        'categorization'  → <Categorization>
 *        'sequencing'      → <Sequencing>
 *   3. On interaction complete, record the response via the response slice
 *      and enqueue it in the outbox slice for reliable delivery.
 *   4. Advance the queue to the next item.
 *   5. When all Analysis items are exhausted, call onStageComplete.
 *
 * Design: Analysis stage (LH-Primary) — cool blue palette, data-stage="analysis",
 * sans-serif, precise motion.
 *
 * Content contract:
 *   The queue items carry a `activityType` field (populated via setItemMeta)
 *   that identifies the interaction type. The full content payload is supplied
 *   through the `contentByItemId` prop — a caller-managed map so this
 *   orchestrator stays decoupled from any particular data-fetching strategy.
 */

import React, { useCallback, useEffect, useRef } from 'react';

import {
  ActiveRecall,
  MCQ,
  Categorization,
  Sequencing,
} from '../../interactions';
import type {
  ActiveRecallRating,
  ActiveRecallTelemetryEvent,
  MCQResult,
  MCQTelemetryEvent,
  CategorizationResult,
  CategorizationTelemetryEvent,
  SequencingResult,
  SequencingTelemetryEvent,
} from '../../interactions';

import {
  useSessionStore,
  useCurrentQueueItem,
  useQueueExhausted,
  useStageProgress,
} from '../../../lib/store';
import type { ResponseModality, UserResponse } from '../../../lib/store';

import { telemetry } from '../../../lib/telemetry';

import { AnalysisProgress } from './AnalysisProgress';

// ---------------------------------------------------------------------------
// Content-item payload shapes
//
// These mirror the data the API returns per item type.  The outer component
// (page / data layer) casts each fetched content object into the union below
// and passes the whole map as `contentByItemId`.
// ---------------------------------------------------------------------------

export interface ActiveRecallContent {
  itemType: 'active_recall';
  prompt: string;
  context?: string;
  expectedAnswer: string;
  hint?: string;
}

export interface MCQContent {
  itemType: 'multiple_choice';
  question: string;
  context?: string;
  options: Array<{
    id: string;
    label: string;
    correct: boolean;
    rationale: string;
  }>;
  explanation: string;
  forceSingleSelect?: boolean;
}

export interface CategorizationContent {
  itemType: 'categorization';
  prompt: string;
  context?: string;
  categories: Array<{ id: string; label: string; description?: string }>;
  items: Array<{ id: string; label: string; categoryId: string }>;
}

export interface SequencingContent {
  itemType: 'sequencing';
  prompt: string;
  context?: string;
  items: Array<{ id: string; label: string }>;
  explanation: string;
}

/** Union of all supported content shapes. */
export type AnalysisContentItem =
  | ActiveRecallContent
  | MCQContent
  | CategorizationContent
  | SequencingContent;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnalysisSessionProps {
  /**
   * Map of queue-item ID → content payload.
   * Should be populated before the session renders (or filled progressively
   * as the API responds).  When the current item's content is absent, a
   * loading skeleton is shown.
   */
  contentByItemId: Record<string, AnalysisContentItem>;

  /**
   * Called when every Analysis-stage item has been completed and the learner
   * is ready to advance to the next stage.
   */
  onStageComplete?: () => void;

  /**
   * Optional back-navigation handler forwarded to <AnalysisProgress>.
   */
  onBack?: () => void;

  /**
   * Called whenever any telemetry event fires from a child interaction.
   * Useful for analytics pipelines; does not affect queue / response state.
   */
  onTelemetry?: (
    event:
      | ActiveRecallTelemetryEvent
      | MCQTelemetryEvent
      | CategorizationTelemetryEvent
      | SequencingTelemetryEvent
  ) => void;

  /**
   * Additional className applied to the root wrapper.
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div
      data-stage="analysis"
      className="flex flex-col gap-4 p-4 animate-pulse font-[var(--font-analysis)]"
      aria-busy="true"
      aria-label="Loading interaction"
      role="status"
    >
      {/* Simulated card header */}
      <div
        style={{
          height: '16px',
          width: '40%',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--analysis-border)',
        }}
      />
      <div
        style={{
          height: '28px',
          width: '80%',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--analysis-border)',
        }}
      />
      {/* Simulated content block */}
      <div
        style={{
          height: '96px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--analysis-border)',
          backgroundColor: 'var(--analysis-bg-secondary)',
        }}
      />
      {/* Simulated button */}
      <div
        style={{
          height: '40px',
          width: '120px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--analysis-border)',
          marginLeft: 'auto',
        }}
      />
    </div>
  );
}

function UnknownItemType({ activityType }: { activityType?: string }) {
  return (
    <div
      data-stage="analysis"
      className="p-6 font-[var(--font-analysis)]"
      role="alert"
    >
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--analysis-incorrect)',
          border: '1px solid var(--analysis-incorrect)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
        }}
      >
        Unknown interaction type:{' '}
        <code style={{ fontFamily: 'monospace' }}>
          {activityType ?? '(undefined)'}
        </code>
        . Cannot render this item.
      </p>
    </div>
  );
}

function StageCompleteMessage({ onStageComplete }: { onStageComplete?: () => void }) {
  return (
    <div
      data-stage="analysis"
      className="flex flex-col items-center justify-center gap-6 p-8 font-[var(--font-analysis)]"
      role="status"
      aria-live="polite"
    >
      {/* Checkmark */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(74,158,222,0.15)',
          border: '2px solid var(--analysis-accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--analysis-accent-primary)',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5.5 14L11 19.5L22.5 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-center space-y-2">
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--analysis-text-primary)',
            lineHeight: '1.3',
          }}
        >
          Analysis complete
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--analysis-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          You have worked through all the practice items for this stage.
        </p>
      </div>

      {onStageComplete && (
        <button
          type="button"
          onClick={onStageComplete}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--analysis-accent-primary)',
            color: '#ffffff',
            fontWeight: 'var(--font-semibold)',
            fontSize: 'var(--text-sm)',
            border: 'none',
            cursor: 'pointer',
            transition:
              'opacity var(--duration-analysis-short) var(--ease-analysis)',
          }}
          aria-label="Continue to next stage"
        >
          Continue
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalysisSession({
  contentByItemId,
  onStageComplete,
  onBack,
  onTelemetry = telemetry.collect,
  className = '',
}: AnalysisSessionProps) {
  // ---- Store selectors ----
  const currentItem = useCurrentQueueItem();
  const isExhausted = useQueueExhausted();
  const stageProgress = useStageProgress();

  // Actions
  const advance = useSessionStore((s) => s.advance);
  const beginInteraction = useSessionStore((s) => s.beginInteraction);
  const submitResponse = useSessionStore((s) => s.submitResponse);
  const enqueueResponse = useSessionStore((s) => s.enqueueResponse);

  // Track whether we have begun an interaction for the current item
  const hasBegunRef = useRef<string | null>(null);

  // Begin an interaction when we land on a new item
  useEffect(() => {
    if (!currentItem || currentItem.id === hasBegunRef.current) return;
    hasBegunRef.current = currentItem.id;
    beginInteraction(currentItem.id);
  }, [currentItem, beginInteraction]);

  // ---- Shared response recorder ----
  // Each interaction's onComplete handler calls this with the outcome so we
  // can write a UserResponse to both the response slice and the outbox.
  const recordAndAdvance = useCallback(
    (params: {
      isCorrect: boolean | null;
      modality: ResponseModality;
      value: string;
    }) => {
      const response: UserResponse | null = submitResponse({
        isCorrect: params.isCorrect,
        modality: params.modality,
      });

      if (response) {
        // Store a richer value in the response (submitResponse sets it from
        // draftValue which may be empty for non-text interactions; we patch).
        // We enqueue the response as-is — value will be populated by the
        // interaction's intrinsic draft state in full implementations.
        enqueueResponse({ ...response, value: params.value });
      }

      advance();
    },
    [submitResponse, enqueueResponse, advance]
  );

  // ---- Interaction complete handlers ----

  const handleActiveRecallComplete = useCallback(
    (rating: ActiveRecallRating) => {
      // Map ActiveRecall self-rating (1–5) to ResponseQuality and isCorrect
      const isCorrect = rating >= 3;
      recordAndAdvance({
        isCorrect,
        modality: 'free_recall',
        value: String(rating),
      });
    },
    [recordAndAdvance]
  );

  const handleMCQComplete = useCallback(
    (result: MCQResult) => {
      recordAndAdvance({
        isCorrect: result.correct,
        modality: 'multiple_choice',
        value: result.selectedOptionIds.join(','),
      });
    },
    [recordAndAdvance]
  );

  const handleCategorizationComplete = useCallback(
    (result: CategorizationResult) => {
      recordAndAdvance({
        isCorrect: result.accuracy === 1,
        modality: 'drag_drop',
        value: JSON.stringify({ correct: result.correct, total: result.totalItems }),
      });
    },
    [recordAndAdvance]
  );

  const handleSequencingComplete = useCallback(
    (result: SequencingResult) => {
      recordAndAdvance({
        isCorrect: result.correct,
        modality: 'drag_drop',
        value: JSON.stringify({ accuracy: result.accuracy }),
      });
    },
    [recordAndAdvance]
  );

  // ---- Render ----

  // Stage exhausted — show completion UI
  if (isExhausted || !currentItem) {
    return (
      <div
        data-stage="analysis"
        className={`flex flex-col min-h-screen font-[var(--font-analysis)] ${className}`}
        style={{ backgroundColor: 'var(--analysis-bg-primary)' }}
      >
        <AnalysisProgress onBack={onBack} />
        <main className="flex flex-1 items-center justify-center">
          <StageCompleteMessage onStageComplete={onStageComplete} />
        </main>
      </div>
    );
  }

  // Waiting for content payload
  const content = contentByItemId[currentItem.id];
  if (!content) {
    return (
      <div
        data-stage="analysis"
        className={`flex flex-col min-h-screen font-[var(--font-analysis)] ${className}`}
        style={{ backgroundColor: 'var(--analysis-bg-primary)' }}
      >
        <AnalysisProgress onBack={onBack} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <LoadingSkeleton />
          </div>
        </main>
      </div>
    );
  }

  // Resolve itemType from content payload (authoritative) or queue metadata
  const itemType: string =
    content.itemType ?? currentItem.activityType ?? '';

  // Render the interaction routed by itemType
  const renderInteraction = (): React.ReactNode => {
    switch (itemType) {
      case 'active_recall': {
        const c = content as ActiveRecallContent;
        return (
          <ActiveRecall
            id={currentItem.id}
            prompt={c.prompt}
            context={c.context}
            expectedAnswer={c.expectedAnswer}
            hint={c.hint}
            onTelemetry={onTelemetry}
            onComplete={handleActiveRecallComplete}
          />
        );
      }

      case 'multiple_choice': {
        const c = content as MCQContent;
        return (
          <MCQ
            questionId={currentItem.id}
            question={c.question}
            context={c.context}
            options={c.options}
            explanation={c.explanation}
            forceSingleSelect={c.forceSingleSelect}
            onTelemetry={onTelemetry}
            onComplete={handleMCQComplete}
          />
        );
      }

      case 'categorization': {
        const c = content as CategorizationContent;
        return (
          <Categorization
            id={currentItem.id}
            prompt={c.prompt}
            context={c.context}
            categories={c.categories}
            items={c.items}
            onTelemetry={onTelemetry}
            onComplete={handleCategorizationComplete}
          />
        );
      }

      case 'sequencing': {
        const c = content as SequencingContent;
        return (
          <Sequencing
            id={currentItem.id}
            prompt={c.prompt}
            context={c.context}
            items={c.items}
            explanation={c.explanation}
            onTelemetry={onTelemetry}
            onComplete={handleSequencingComplete}
          />
        );
      }

      default:
        return <UnknownItemType activityType={itemType} />;
    }
  };

  return (
    <div
      data-stage="analysis"
      className={`flex flex-col min-h-screen font-[var(--font-analysis)] ${className}`}
      style={{ backgroundColor: 'var(--analysis-bg-primary)' }}
    >
      {/* ---- Top progress bar and item counter ---- */}
      <AnalysisProgress onBack={onBack} />

      {/* ---- Main interaction area ---- */}
      <main
        className="flex-1 overflow-y-auto"
        aria-label={`Analysis stage — item ${currentItem.position + 1}`}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {renderInteraction()}
        </div>
      </main>
    </div>
  );
}
