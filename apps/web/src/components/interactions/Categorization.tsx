/**
 * Categorization Interaction Component
 *
 * An Analysis-stage interaction where learners sort items into named categories.
 * MVP implementation uses click-to-assign (not drag-and-drop): learners select
 * an item from the unassigned pool, then click a category column to place it.
 *
 * Flow:
 *   1. Learner sees 2–3 category columns and an unassigned item pool
 *   2. Learner clicks an item to select it (highlight), then clicks a category to assign it
 *   3. Assigned items appear inside their category column; learner can re-click to unassign
 *   4. Once all items are assigned, "Check" button becomes enabled
 *   5. After submission, each item shows correct/incorrect state and feedback is revealed
 *
 * Telemetry event emitted on submit:
 *   { type: 'categorization:submitted', correct, accuracy, totalItems, timeMs }
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, precise motion.
 * Follows the same CSS-variable and component conventions as ActiveRecall and MCQ.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single item that must be placed into a category. */
export interface CategorizationItem {
  /** Unique identifier for this item. */
  id: string;
  /** The visible text or label of the item. */
  label: string;
  /** The id of the category this item belongs to (correct answer). */
  categoryId: string;
}

/** A named category (column) that items are sorted into. */
export interface CategorizationCategory {
  /** Unique identifier for this category. */
  id: string;
  /** The display name shown as the column heading. */
  label: string;
  /**
   * Optional short description shown beneath the category heading to help
   * learners understand what belongs here.
   */
  description?: string;
}

/** Telemetry event emitted when the learner submits their categorization. */
export interface CategorizationTelemetryEvent {
  type: 'categorization:submitted';
  /** Number of items correctly placed. */
  correct: number;
  /** Fraction of items correctly placed (0–1, two decimal places). */
  accuracy: number;
  /** Total number of items. */
  totalItems: number;
  /** Milliseconds from component mount to submission. */
  timeMs: number;
}

/** Summary passed to onComplete when the learner dismisses feedback. */
export interface CategorizationResult {
  correct: number;
  accuracy: number;
  totalItems: number;
  timeMs: number;
}

/** Props for the Categorization component. */
export interface CategorizationProps {
  /** Stable identifier for this interaction (used in telemetry). */
  id: string;
  /** The instruction or question posed to the learner. */
  prompt: string;
  /**
   * Optional context label shown above the prompt (e.g. topic name).
   */
  context?: string;
  /** The 2–3 named categories that items should be sorted into. */
  categories: CategorizationCategory[];
  /** The items to be sorted. Each item knows its correct categoryId. */
  items: CategorizationItem[];
  /**
   * Called when a telemetry event is emitted (on submit).
   */
  onTelemetry?: (event: CategorizationTelemetryEvent) => void;
  /**
   * Called when the learner dismisses the feedback panel ("Continue").
   * Receives the final result summary.
   */
  onComplete?: (result: CategorizationResult) => void;
  /** Additional CSS classes applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal state machine
// ---------------------------------------------------------------------------

type Phase = 'sorting' | 'feedback';

/** Tracks which category each item has been assigned to (null = unassigned). */
type Assignments = Record<string, string | null>;

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6L5 9L10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCross({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3L9 9M9 3L3 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ItemChip
// ---------------------------------------------------------------------------

interface ItemChipProps {
  item: CategorizationItem;
  phase: Phase;
  selected: boolean;
  /** The category this item is currently assigned to (null = unassigned). */
  assignedCategoryId: string | null;
  /** The correct categoryId for this item (used to derive feedback state). */
  onSelect: (id: string) => void;
  onUnassign: (id: string) => void;
}

function ItemChip({
  item,
  phase,
  selected,
  assignedCategoryId,
  onSelect,
  onUnassign,
}: ItemChipProps) {
  const isAssigned = assignedCategoryId !== null;
  const isCorrect = phase === 'feedback' && assignedCategoryId === item.categoryId;
  const isIncorrect = phase === 'feedback' && isAssigned && !isCorrect;

  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;

  if (phase === 'feedback') {
    if (isCorrect) {
      borderColor = 'var(--analysis-correct)';
      backgroundColor = 'rgba(76,175,130,0.12)';
      textColor = 'var(--analysis-text-primary)';
    } else if (isIncorrect) {
      borderColor = 'var(--analysis-incorrect)';
      backgroundColor = 'rgba(212,132,90,0.12)';
      textColor = 'var(--analysis-text-primary)';
    } else {
      // Unassigned in feedback phase (shouldn't normally happen — all items
      // must be assigned before submit is enabled — but guard defensively).
      borderColor = 'var(--analysis-border)';
      backgroundColor = 'var(--analysis-bg-secondary)';
      textColor = 'var(--analysis-text-secondary)';
    }
  } else if (selected) {
    borderColor = 'var(--analysis-accent-primary)';
    backgroundColor = 'rgba(74,158,222,0.12)';
    textColor = 'var(--analysis-text-primary)';
  } else {
    borderColor = 'var(--analysis-border)';
    backgroundColor = 'var(--analysis-bg-secondary)';
    textColor = 'var(--analysis-text-primary)';
  }

  const handleClick = () => {
    if (phase === 'feedback') return;
    if (isAssigned) {
      // Clicking an assigned chip unassigns it (returns to pool)
      onUnassign(item.id);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${item.label}${isAssigned ? ' (assigned — click to remove)' : ''}`}
      disabled={phase === 'feedback'}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${borderColor}`,
        backgroundColor,
        color: textColor,
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        lineHeight: '1.4',
        cursor: phase === 'feedback' ? 'default' : 'pointer',
        transition:
          'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
          'background-color var(--duration-analysis-short) var(--ease-analysis)',
        userSelect: 'none',
      }}
    >
      {item.label}
      {phase === 'feedback' && isCorrect && (
        <span style={{ color: 'var(--analysis-correct)', flexShrink: 0 }}>
          <IconCheck />
        </span>
      )}
      {phase === 'feedback' && isIncorrect && (
        <span style={{ color: 'var(--analysis-incorrect)', flexShrink: 0 }}>
          <IconCross />
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CategoryColumn
// ---------------------------------------------------------------------------

interface CategoryColumnProps {
  category: CategorizationCategory;
  items: CategorizationItem[];
  phase: Phase;
  hasSelectedItem: boolean;
  assignments: Assignments;
  selectedItemId: string | null;
  onDrop: (categoryId: string) => void;
  onItemSelect: (id: string) => void;
  onItemUnassign: (id: string) => void;
}

function CategoryColumn({
  category,
  items,
  phase,
  hasSelectedItem,
  assignments,
  selectedItemId,
  onDrop,
  onItemSelect,
  onItemUnassign,
}: CategoryColumnProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isDropTarget = hasSelectedItem && phase === 'sorting';
  const isActive = isDropTarget && isHovered;

  const assignedItems = items.filter(
    (item) => assignments[item.id] === category.id,
  );

  // Count correct placements for feedback summary
  const correctCount =
    phase === 'feedback'
      ? assignedItems.filter((item) => item.categoryId === category.id).length
      : null;

  const handleColumnClick = () => {
    if (!isDropTarget) return;
    onDrop(category.id);
  };

  let columnBorderColor: string;
  let columnBg: string;

  if (phase === 'feedback') {
    columnBorderColor = 'var(--analysis-border)';
    columnBg = 'var(--analysis-bg-secondary)';
  } else if (isActive) {
    columnBorderColor = 'var(--analysis-accent-primary)';
    columnBg = 'rgba(74,158,222,0.06)';
  } else if (isDropTarget) {
    columnBorderColor = 'rgba(74,158,222,0.4)';
    columnBg = 'rgba(74,158,222,0.03)';
  } else {
    columnBorderColor = 'var(--analysis-border)';
    columnBg = 'var(--analysis-bg-secondary)';
  }

  return (
    <div
      role="region"
      aria-label={`Category: ${category.label}`}
      style={{ flex: 1, minWidth: 0 }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
          border: `1.5px solid ${columnBorderColor}`,
          borderBottom: 'none',
          backgroundColor: 'var(--analysis-bg-secondary)',
          transition:
            'border-color var(--duration-analysis-short) var(--ease-analysis)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--analysis-text-primary)',
            lineHeight: '1.3',
          }}
        >
          {category.label}
        </p>
        {category.description && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--analysis-text-secondary)',
              marginTop: '2px',
              lineHeight: '1.4',
            }}
          >
            {category.description}
          </p>
        )}
        {phase === 'feedback' && correctCount !== null && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color:
                correctCount === assignedItems.length
                  ? 'var(--analysis-correct)'
                  : 'var(--analysis-incorrect)',
              marginTop: '4px',
              fontWeight: 'var(--font-semibold)',
            }}
            aria-live="polite"
          >
            {correctCount}/{assignedItems.length} correct
          </p>
        )}
      </div>

      {/* Drop zone */}
      <button
        type="button"
        disabled={!isDropTarget}
        onClick={handleColumnClick}
        onMouseEnter={() => isDropTarget && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={
          isDropTarget
            ? `Place selected item into ${category.label}`
            : `${category.label} — select an item first`
        }
        style={{
          display: 'block',
          width: '100%',
          minHeight: '120px',
          padding: '10px',
          border: `1.5px solid ${columnBorderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
          backgroundColor: columnBg,
          cursor: isDropTarget ? 'pointer' : 'default',
          transition:
            'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
            'background-color var(--duration-analysis-short) var(--ease-analysis)',
          textAlign: 'left',
        }}
      >
        {/* Assigned items inside this column */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            pointerEvents: assignedItems.length > 0 ? 'auto' : 'none',
          }}
          onClick={(e) => {
            // Stop propagation so clicking a chip inside the column doesn't
            // also trigger the column's own drop handler.
            e.stopPropagation();
          }}
        >
          {assignedItems.map((item) => (
            <ItemChip
              key={item.id}
              item={item}
              phase={phase}
              selected={selectedItemId === item.id}
              assignedCategoryId={assignments[item.id] ?? null}
              onSelect={onItemSelect}
              onUnassign={onItemUnassign}
            />
          ))}
        </div>

        {/* Empty-state hint */}
        {assignedItems.length === 0 && isDropTarget && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--analysis-accent-primary)',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          >
            Click to place here
          </p>
        )}
        {assignedItems.length === 0 && !isDropTarget && phase === 'sorting' && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--analysis-text-secondary)',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          >
            No items yet
          </p>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedbackBanner
// ---------------------------------------------------------------------------

interface FeedbackBannerProps {
  correct: number;
  totalItems: number;
}

function FeedbackBanner({ correct, totalItems }: FeedbackBannerProps) {
  const allCorrect = correct === totalItems;
  const none = correct === 0;

  let borderColor: string;
  let backgroundColor: string;
  let color: string;
  let label: string;
  let icon: React.ReactNode;

  if (allCorrect) {
    borderColor = 'var(--analysis-correct)';
    backgroundColor = 'rgba(76,175,130,0.1)';
    color = 'var(--analysis-correct)';
    label = `All ${totalItems} items placed correctly!`;
    icon = <IconCheck />;
  } else if (none) {
    borderColor = 'var(--analysis-incorrect)';
    backgroundColor = 'rgba(212,132,90,0.1)';
    color = 'var(--analysis-incorrect)';
    label = `0 of ${totalItems} items correct`;
    icon = <IconCross />;
  } else {
    borderColor = 'var(--analysis-partial)';
    backgroundColor = 'rgba(212,184,90,0.1)';
    color = 'var(--analysis-partial)';
    label = `${correct} of ${totalItems} items correct`;
    // Partial — use a horizontal bar icon inline
    icon = (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
        backgroundColor,
        color,
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Categorization Component
// ---------------------------------------------------------------------------

export function Categorization({
  id,
  prompt,
  context,
  categories,
  items,
  onTelemetry,
  onComplete,
  className = '',
}: CategorizationProps) {
  // Map each item id to its assigned category id (null = unassigned)
  const [assignments, setAssignments] = useState<Assignments>(() =>
    Object.fromEntries(items.map((item) => [item.id, null])),
  );

  // The currently selected (highlighted) item waiting to be placed
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('sorting');
  const [result, setResult] = useState<{ correct: number; accuracy: number } | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Reset if the item set changes (e.g. different question routed to same component)
  const itemKey = items.map((i) => i.id).join(',');
  const prevItemKeyRef = useRef(itemKey);
  if (prevItemKeyRef.current !== itemKey) {
    prevItemKeyRef.current = itemKey;
    setAssignments(Object.fromEntries(items.map((item) => [item.id, null])));
    setSelectedItemId(null);
    setPhase('sorting');
    setResult(null);
    startTimeRef.current = Date.now();
  }

  // Derived: unassigned items (shown in the item pool)
  const unassignedItems = items.filter((item) => assignments[item.id] === null);

  // All items assigned?
  const allAssigned = unassignedItems.length === 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

  const handleItemUnassign = useCallback((itemId: string) => {
    setAssignments((prev) => ({ ...prev, [itemId]: null }));
    setSelectedItemId(itemId); // Keep it selected so user can immediately reassign
  }, []);

  const handleCategoryDrop = useCallback(
    (categoryId: string) => {
      if (!selectedItemId) return;
      setAssignments((prev) => ({ ...prev, [selectedItemId]: categoryId }));
      setSelectedItemId(null);
    },
    [selectedItemId],
  );

  const handleSubmit = useCallback(() => {
    if (!allAssigned) return;

    const timeMs = Date.now() - startTimeRef.current;
    const correctCount = items.filter(
      (item) => assignments[item.id] === item.categoryId,
    ).length;
    const accuracy = parseFloat((correctCount / items.length).toFixed(2));

    const evalResult = { correct: correctCount, accuracy };
    setResult(evalResult);
    setPhase('feedback');

    onTelemetry?.({
      type: 'categorization:submitted',
      correct: correctCount,
      accuracy,
      totalItems: items.length,
      timeMs,
    });
  }, [allAssigned, items, assignments, onTelemetry]);

  const handleContinue = useCallback(() => {
    if (!result) return;
    const timeMs = Date.now() - startTimeRef.current;
    onComplete?.({
      correct: result.correct,
      accuracy: result.accuracy,
      totalItems: items.length,
      timeMs,
    });
  }, [result, items.length, onComplete]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasSelectedItem = selectedItemId !== null;

  return (
    <div
      data-stage="analysis"
      className={`font-[var(--font-analysis)] ${className}`}
    >
      <Card padding="lg" className="border border-[var(--analysis-border)]">

        {/* ---- Header ---- */}
        <CardHeader>
          {context && (
            <p
              className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: 'var(--analysis-text-secondary)' }}
            >
              {context}
            </p>
          )}

          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--analysis-accent-primary)' }}
          >
            Categorization
          </p>

          <CardTitle
            as="h2"
            className="leading-snug"
            style={{ color: 'var(--analysis-text-primary)', fontFamily: 'var(--font-analysis)' }}
          >
            {prompt}
          </CardTitle>

          {phase === 'sorting' && (
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--analysis-text-secondary)' }}
            >
              {hasSelectedItem
                ? 'Now click a category column to place the selected item.'
                : 'Click an item to select it, then click a category to place it.'}
            </p>
          )}
        </CardHeader>

        {/* ---- Body ---- */}
        <CardContent>

          {/* Unassigned item pool */}
          {unassignedItems.length > 0 && (
            <div
              style={{
                marginBottom: '20px',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--analysis-text-secondary)' }}
              >
                Items to sort
              </p>
              <div
                role="group"
                aria-label="Unassigned items"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
              >
                {unassignedItems.map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    phase={phase}
                    selected={selectedItemId === item.id}
                    assignedCategoryId={null}
                    onSelect={handleItemSelect}
                    onUnassign={handleItemUnassign}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category columns */}
          <div
            role="group"
            aria-label="Category columns"
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            {categories.map((cat) => (
              <CategoryColumn
                key={cat.id}
                category={cat}
                items={items}
                phase={phase}
                hasSelectedItem={hasSelectedItem}
                assignments={assignments}
                selectedItemId={selectedItemId}
                onDrop={handleCategoryDrop}
                onItemSelect={handleItemSelect}
                onItemUnassign={handleItemUnassign}
              />
            ))}
          </div>

          {/* Feedback panel (post-submission) */}
          {phase === 'feedback' && result && (
            <div
              className="mt-6 space-y-3"
              role="region"
              aria-label="Categorization feedback"
            >
              <FeedbackBanner
                correct={result.correct}
                totalItems={items.length}
              />

              {/* Correct placements summary */}
              {result.correct < items.length && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--analysis-border)',
                    backgroundColor: 'var(--analysis-bg-secondary)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--analysis-accent-secondary)' }}
                  >
                    Correct placements
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.map((item) => {
                      const isCorrect = assignments[item.id] === item.categoryId;
                      const correctCategoryLabel =
                        categories.find((c) => c.id === item.categoryId)?.label ?? item.categoryId;
                      const assignedCategoryLabel =
                        categories.find((c) => c.id === assignments[item.id])?.label ?? '—';
                      return (
                        <li
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: 'var(--text-sm)',
                            color: isCorrect
                              ? 'var(--analysis-correct)'
                              : 'var(--analysis-incorrect)',
                          }}
                        >
                          <span style={{ flexShrink: 0, marginTop: '2px' }}>
                            {isCorrect ? <IconCheck /> : <IconCross />}
                          </span>
                          <span>
                            <strong style={{ color: 'var(--analysis-text-primary)' }}>
                              {item.label}
                            </strong>
                            {isCorrect ? (
                              <span style={{ color: 'var(--analysis-text-secondary)' }}>
                                {' '}— correctly in {correctCategoryLabel}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--analysis-text-secondary)' }}>
                                {' '}— placed in{' '}
                                <span style={{ color: 'var(--analysis-incorrect)' }}>
                                  {assignedCategoryLabel}
                                </span>
                                {', should be '}
                                <span style={{ color: 'var(--analysis-correct)' }}>
                                  {correctCategoryLabel}
                                </span>
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* ---- Footer ---- */}
        <CardFooter>
          {phase === 'sorting' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!allAssigned}
              onClick={handleSubmit}
              aria-label={
                allAssigned
                  ? 'Check categorization'
                  : `Assign all items before checking (${unassignedItems.length} remaining)`
              }
            >
              {allAssigned
                ? 'Check'
                : `Check (${unassignedItems.length} item${unassignedItems.length !== 1 ? 's' : ''} remaining)`}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleContinue}
              aria-label="Continue to next item"
            >
              Continue
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
