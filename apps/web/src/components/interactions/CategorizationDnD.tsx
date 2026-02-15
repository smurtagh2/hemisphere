/**
 * CategorizationDnD Interaction Component
 *
 * A drag-and-drop variant of the Categorization interaction. Learners drag
 * items from the unassigned pool and drop them into named category columns.
 *
 * Differences from the click-to-assign MVP (Categorization.tsx):
 *   - Items in the unassigned pool are draggable (useDraggable)
 *   - Category columns are droppable targets (useDroppable)
 *   - A DragOverlay renders a floating ghost of the active item while dragging
 *   - Assigned items inside a column can be dragged back out or to a different
 *     column
 *   - Same submit / feedback flow as the original component
 *
 * Uses @dnd-kit/core: DndContext, DragOverlay, useDraggable, useDroppable.
 *
 * Telemetry event emitted on submit:
 *   { type: 'categorization:submitted', correct, accuracy, totalItems, timeMs }
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, precise motion.
 * Props interface is identical to Categorization so the two are interchangeable.
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

// Re-export the shared types so consumers can import from either file
export type {
  CategorizationItem,
  CategorizationCategory,
  CategorizationProps,
  CategorizationResult,
  CategorizationTelemetryEvent,
} from './Categorization';

import type {
  CategorizationCategory,
  CategorizationItem,
  CategorizationProps,
  CategorizationResult,
} from './Categorization';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Phase = 'sorting' | 'feedback';
type Assignments = Record<string, string | null>;

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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

function IconCross() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
// DraggableItemChip
// ---------------------------------------------------------------------------

interface DraggableItemChipProps {
  item: CategorizationItem;
  phase: Phase;
  assignedCategoryId: string | null;
  isDragging?: boolean;
}

function DraggableItemChip({
  item,
  phase,
  assignedCategoryId,
  isDragging = false,
}: DraggableItemChipProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: phase === 'feedback',
  });

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
      borderColor = 'var(--analysis-border)';
      backgroundColor = 'var(--analysis-bg-secondary)';
      textColor = 'var(--analysis-text-secondary)';
    }
  } else {
    borderColor = 'var(--analysis-border)';
    backgroundColor = 'var(--analysis-bg-secondary)';
    textColor = 'var(--analysis-text-primary)';
  }

  const style: React.CSSProperties = {
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
    cursor: phase === 'feedback' ? 'default' : isDragging ? 'grabbing' : 'grab',
    transition:
      'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
      'background-color var(--duration-analysis-short) var(--ease-analysis)',
    userSelect: 'none',
    opacity: isDragging ? 0 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} role="button" aria-label={item.label} tabIndex={phase === 'feedback' ? -1 : 0}>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemChipOverlay — rendered inside DragOverlay (not connected to dnd hooks)
// ---------------------------------------------------------------------------

function ItemChipOverlay({ item }: { item: CategorizationItem }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1.5px solid var(--analysis-accent-primary)',
        backgroundColor: 'rgba(74,158,222,0.15)',
        color: 'var(--analysis-text-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        lineHeight: '1.4',
        cursor: 'grabbing',
        userSelect: 'none',
        boxShadow: 'var(--shadow-lg)',
        transform: 'rotate(2deg) scale(1.04)',
        pointerEvents: 'none',
      }}
    >
      {item.label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppableCategoryColumn
// ---------------------------------------------------------------------------

interface DroppableCategoryColumnProps {
  category: CategorizationCategory;
  items: CategorizationItem[];
  phase: Phase;
  assignments: Assignments;
  activeItemId: string | null;
}

function DroppableCategoryColumn({
  category,
  items,
  phase,
  assignments,
  activeItemId,
}: DroppableCategoryColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: category.id,
    disabled: phase === 'feedback',
  });

  const assignedItems = items.filter((item) => assignments[item.id] === category.id);

  const correctCount =
    phase === 'feedback'
      ? assignedItems.filter((item) => item.categoryId === category.id).length
      : null;

  const isDraggingToHere = isOver && activeItemId !== null && phase === 'sorting';

  let columnBorderColor: string;
  let columnBg: string;

  if (phase === 'feedback') {
    columnBorderColor = 'var(--analysis-border)';
    columnBg = 'var(--analysis-bg-secondary)';
  } else if (isDraggingToHere) {
    columnBorderColor = 'var(--analysis-accent-primary)';
    columnBg = 'rgba(74,158,222,0.08)';
  } else if (activeItemId !== null) {
    // Something is being dragged but not over this column
    columnBorderColor = 'rgba(74,158,222,0.4)';
    columnBg = 'rgba(74,158,222,0.03)';
  } else {
    columnBorderColor = 'var(--analysis-border)';
    columnBg = 'var(--analysis-bg-secondary)';
  }

  return (
    <div role="region" aria-label={`Category: ${category.label}`} style={{ flex: 1, minWidth: 0 }}>
      {/* Column header */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
          border: `1.5px solid ${columnBorderColor}`,
          borderBottom: 'none',
          backgroundColor: 'var(--analysis-bg-secondary)',
          transition: 'border-color var(--duration-analysis-short) var(--ease-analysis)',
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
      <div
        ref={setNodeRef}
        style={{
          minHeight: '120px',
          padding: '10px',
          border: `1.5px solid ${columnBorderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
          backgroundColor: columnBg,
          transition:
            'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
            'background-color var(--duration-analysis-short) var(--ease-analysis)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {assignedItems.map((item) => (
            <DraggableItemChip
              key={item.id}
              item={item}
              phase={phase}
              assignedCategoryId={assignments[item.id] ?? null}
            />
          ))}
        </div>

        {assignedItems.length === 0 && phase === 'sorting' && (
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: isDraggingToHere
                ? 'var(--analysis-accent-primary)'
                : 'var(--analysis-text-secondary)',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          >
            {isDraggingToHere ? 'Release to drop here' : 'Drop items here'}
          </p>
        )}
      </div>
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
// Main CategorizationDnD Component
// ---------------------------------------------------------------------------

export function CategorizationDnD({
  id,
  prompt,
  context,
  categories,
  items,
  onTelemetry,
  onComplete,
  className = '',
}: CategorizationProps) {
  const [assignments, setAssignments] = useState<Assignments>(() =>
    Object.fromEntries(items.map((item) => [item.id, null])),
  );

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('sorting');
  const [result, setResult] = useState<{ correct: number; accuracy: number } | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Reset on item set change
  const itemKey = items.map((i) => i.id).join(',');
  const prevItemKeyRef = useRef(itemKey);
  if (prevItemKeyRef.current !== itemKey) {
    prevItemKeyRef.current = itemKey;
    setAssignments(Object.fromEntries(items.map((item) => [item.id, null])));
    setActiveItemId(null);
    setPhase('sorting');
    setResult(null);
    startTimeRef.current = Date.now();
  }

  // Derived
  const unassignedItems = items.filter((item) => assignments[item.id] === null);
  const allAssigned = unassignedItems.length === 0;
  const activeItem = activeItemId ? items.find((i) => i.id === activeItemId) ?? null : null;

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  // ---------------------------------------------------------------------------
  // DnD handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveItemId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by DroppableCategoryColumn's isOver state
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItemId(null);

      if (!over) return; // Dropped outside any target — leave unchanged

      const droppedItemId = active.id as string;
      const targetId = over.id as string;

      // targetId is either a category id (column) or another item's id (in pool)
      const isCategoryTarget = categories.some((c) => c.id === targetId);

      if (isCategoryTarget) {
        setAssignments((prev) => ({ ...prev, [droppedItemId]: targetId }));
      } else {
        // Dropped onto the unassigned pool area — unassign
        const poolAreaId = 'pool';
        if (targetId === poolAreaId) {
          setAssignments((prev) => ({ ...prev, [droppedItemId]: null }));
        }
      }
    },
    [categories],
  );

  // ---------------------------------------------------------------------------
  // Submit / Continue handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    if (!allAssigned) return;

    const timeMs = Date.now() - startTimeRef.current;
    const correctCount = items.filter(
      (item) => assignments[item.id] === item.categoryId,
    ).length;
    const accuracy = parseFloat((correctCount / items.length).toFixed(2));

    setResult({ correct: correctCount, accuracy });
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
    } as CategorizationResult);
  }, [result, items.length, onComplete]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div data-stage="analysis" className={`font-[var(--font-analysis)] ${className}`}>
      <Card padding="lg" className="border border-[var(--analysis-border)]">

        {/* Header */}
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
            <p className="mt-2 text-sm" style={{ color: 'var(--analysis-text-secondary)' }}>
              Drag each item into the correct category column.
            </p>
          )}
        </CardHeader>

        {/* Body */}
        <CardContent>
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* Unassigned pool */}
            {unassignedItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--analysis-text-secondary)' }}
                >
                  Items to sort
                </p>
                <DroppablePool id="pool">
                  <div
                    role="group"
                    aria-label="Unassigned items"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {unassignedItems.map((item) => (
                      <DraggableItemChip
                        key={item.id}
                        item={item}
                        phase={phase}
                        assignedCategoryId={null}
                        isDragging={activeItemId === item.id}
                      />
                    ))}
                  </div>
                </DroppablePool>
              </div>
            )}

            {/* Category columns */}
            <div
              role="group"
              aria-label="Category columns"
              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
            >
              {categories.map((cat) => (
                <DroppableCategoryColumn
                  key={cat.id}
                  category={cat}
                  items={items}
                  phase={phase}
                  assignments={assignments}
                  activeItemId={activeItemId}
                />
              ))}
            </div>

            {/* Drag overlay — floating ghost */}
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
              {activeItem ? <ItemChipOverlay item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Feedback panel */}
          {phase === 'feedback' && result && (
            <div className="mt-6 space-y-3" role="region" aria-label="Categorization feedback">
              <FeedbackBanner correct={result.correct} totalItems={items.length} />

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
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
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

        {/* Footer */}
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

// ---------------------------------------------------------------------------
// DroppablePool — the unassigned items area is also a drop target so items
// can be dragged back from a column into the pool.
// ---------------------------------------------------------------------------

function DroppablePool({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
}
