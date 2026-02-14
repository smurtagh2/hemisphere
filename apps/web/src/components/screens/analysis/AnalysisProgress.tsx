/**
 * AnalysisProgress
 *
 * TopBar header that shows the learner's progress through the Analysis stage
 * queue. Displays a "N of M" item counter and an animated progress bar using
 * the Analysis-stage design tokens (cool blue palette, data-stage="analysis").
 *
 * Reads state exclusively from the Zustand store so it stays in sync with the
 * AnalysisSession orchestrator without prop-drilling.
 *
 * Usage:
 *   <AnalysisProgress onBack={handleBack} />
 */

import React from 'react';
import { TopBar } from '../../ui/TopBar';
import { useSessionStore } from '../../../lib/store';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnalysisProgressProps {
  /**
   * Optional back-navigation handler. When provided, a back arrow is shown
   * in the TopBar so the learner can exit the Analysis stage early.
   */
  onBack?: () => void;

  /**
   * Optional additional className applied to the outer wrapper.
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalysisProgress({ onBack, className = '' }: AnalysisProgressProps) {
  // Pull the analysis-stage items and current position from the queue slice.
  const items = useSessionStore((s) => s.getItemsByStage('analysis'));
  const currentIndex = useSessionStore((s) => s.currentIndex);

  // The "analysis" queue might start at a non-zero global currentIndex.
  // We compute the local position: how many analysis items have been seen.
  const seenCount = items.filter((item) => item.seen).length;
  const totalCount = items.length;

  // Current item number shown to the learner (1-based, capped to total)
  // Once the queue is exhausted the display shows "M of M".
  const currentItemNumber = Math.min(seenCount + 1, totalCount);

  // Progress fraction (0–1) — how many analysis items have been completed
  const progressFraction = totalCount > 0 ? seenCount / totalCount : 0;
  const progressPercent = Math.round(progressFraction * 100);

  // Suppress the component entirely when there are no analysis items
  if (totalCount === 0) return null;

  // Build the counter label: "Item 3 of 10"
  const counterLabel =
    seenCount >= totalCount
      ? `All ${totalCount} complete`
      : `Item ${currentItemNumber} of ${totalCount}`;

  return (
    <div
      data-stage="analysis"
      className={`font-[var(--font-analysis)] ${className}`}
    >
      {/* ---- TopBar ---- */}
      <TopBar
        showBack={Boolean(onBack)}
        onBack={onBack}
        title="Analysis"
        rightContent={
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: 'var(--analysis-text-secondary)' }}
            aria-label={counterLabel}
          >
            {counterLabel}
          </span>
        }
        className="border-b-0"
        style={{ borderColor: 'var(--analysis-border)', backgroundColor: 'var(--analysis-bg-primary)' } as React.CSSProperties}
      />

      {/* ---- Stage progress bar ---- */}
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Analysis stage progress: ${progressPercent}%`}
        style={{
          height: '3px',
          width: '100%',
          backgroundColor: 'var(--analysis-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `${progressPercent}%`,
            backgroundColor: 'var(--analysis-accent-primary)',
            transition: `width var(--duration-analysis-long) var(--ease-analysis)`,
          }}
        />
      </div>

      {/* ---- Item pip dots ---- */}
      {totalCount <= 20 && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--analysis-border)',
            backgroundColor: 'var(--analysis-bg-primary)',
          }}
        >
          {items.map((item, idx) => {
            const isSeen = item.seen;
            // Derive the "active" pip: the first unseen item index in the queue
            const firstUnseen = items.findIndex((i) => !i.seen);
            const isActive = idx === firstUnseen && seenCount < totalCount;

            let bg: string;
            if (isSeen) {
              bg = 'var(--analysis-accent-primary)';
            } else if (isActive) {
              bg = 'var(--analysis-accent-secondary)';
            } else {
              bg = 'var(--analysis-border)';
            }

            return (
              <span
                key={item.id}
                style={{
                  display: 'block',
                  width: isActive ? '10px' : '6px',
                  height: isActive ? '10px' : '6px',
                  borderRadius: '50%',
                  backgroundColor: bg,
                  flexShrink: 0,
                  transition: `width var(--duration-analysis-short) var(--ease-analysis), height var(--duration-analysis-short) var(--ease-analysis), background-color var(--duration-analysis-short) var(--ease-analysis)`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
