/**
 * SequencingDnD Interaction Component
 *
 * A drag-and-drop variant of the Sequencing interaction. Learners drag items
 * up or down a vertical list to arrange them in the correct order.
 *
 * Differences from the click-to-reorder MVP (Sequencing.tsx):
 *   - Each row has a visible drag handle icon (≡) on the left
 *   - Items are reordered by dragging using @dnd-kit/sortable:
 *       SortableContext + verticalListSortingStrategy + useSortable
 *   - arrayMove utility updates order when an item is dropped
 *   - Same submit / feedback flow as the original component
 *
 * Telemetry event emitted on submit:
 *   { type: 'sequencing:submitted', correct, accuracy, positions, timeMs }
 *
 * Design: Analysis stage (LH-Primary) — cool colors, sans-serif, precise motion.
 * Props interface is identical to Sequencing so the two are interchangeable.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

// Re-export the shared types so consumers can import from either file
export type {
  SequencingItem,
  SequencingPosition,
  SequencingProps,
  SequencingResult,
  SequencingTelemetryEvent,
} from './Sequencing';

import type {
  SequencingItem,
  SequencingPosition,
  SequencingProps,
  SequencingResult,
} from './Sequencing';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Phase = 'ordering' | 'feedback';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function evaluate(
  currentOrder: SequencingItem[],
  correctOrder: SequencingItem[],
): SequencingPosition[] {
  return currentOrder.map((item, index) => ({
    position: index,
    itemId: item.id,
    correct: item.id === correctOrder[index]?.id,
  }));
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7L5.5 10L11.5 4"
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Drag handle icon — six dots in a 2x3 grid */
function IconDragHandle() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SortableRow — a single draggable item in the ordering list
// ---------------------------------------------------------------------------

interface SortableRowProps {
  item: SequencingItem;
  index: number;
  phase: Phase;
  feedback: SequencingPosition | null;
  /** True when this specific row is being actively dragged (for opacity). */
  isDragging?: boolean;
}

function SortableRow({ item, index, phase, feedback, isDragging = false }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.id,
    disabled: phase === 'feedback',
  });

  const isOrdering = phase === 'ordering';

  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;
  let positionNumberColor: string;
  let stateIcon: React.ReactNode = null;

  if (isOrdering) {
    borderColor = 'var(--analysis-border)';
    backgroundColor = 'var(--analysis-bg-secondary)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-text-secondary)';
  } else if (feedback?.correct) {
    borderColor = 'var(--analysis-correct)';
    backgroundColor = 'rgba(76,175,130,0.08)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-correct)';
    stateIcon = <IconCheck />;
  } else {
    borderColor = 'var(--analysis-incorrect)';
    backgroundColor = 'rgba(212,132,90,0.08)';
    textColor = 'var(--analysis-text-primary)';
    positionNumberColor = 'var(--analysis-incorrect)';
    stateIcon = <IconCross />;
  }

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-sm)',
    backgroundColor,
    color: textColor,
    transition:
      transition ??
      'border-color var(--duration-analysis-short) var(--ease-analysis), ' +
        'background-color var(--duration-analysis-short) var(--ease-analysis)',
    transform: CSS.Transform.toString(transform),
    opacity: isSortableDragging ? 0.4 : 1,
    listStyle: 'none',
  };

  return (
    <li ref={setNodeRef} style={style} aria-label={`Position ${index + 1}: ${item.label}`}>
      {/* Drag handle */}
      {isOrdering && (
        <span
          {...listeners}
          {...attributes}
          aria-label={`Drag to reorder: ${item.label}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--analysis-text-secondary)',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            touchAction: 'none',
          }}
        >
          <IconDragHandle />
        </span>
      )}

      {/* Position number badge */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full)',
          border: `1px solid ${borderColor}`,
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          color: positionNumberColor,
          fontVariantNumeric: 'tabular-nums',
          transition: 'color var(--duration-analysis-short) var(--ease-analysis)',
        }}
      >
        {index + 1}
      </span>

      {/* Item label */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          fontWeight: 'var(--font-medium)',
        }}
      >
        {item.label}
      </span>

      {/* Feedback icon */}
      {phase === 'feedback' && stateIcon && (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: feedback?.correct ? 'var(--analysis-correct)' : 'var(--analysis-incorrect)',
          }}
        >
          {stateIcon}
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// DragOverlay row — static rendering used while dragging
// ---------------------------------------------------------------------------

function DragOverlayRow({ item }: { item: SequencingItem }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        border: '1px solid var(--analysis-accent-primary)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(74,158,222,0.1)',
        color: 'var(--analysis-text-primary)',
        boxShadow: 'var(--shadow-lg)',
        cursor: 'grabbing',
        userSelect: 'none',
      }}
    >
      <span style={{ color: 'var(--analysis-accent-primary)', display: 'flex' }}>
        <IconDragHandle />
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          fontWeight: 'var(--font-medium)',
        }}
      >
        {item.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SequencingDnD Component
// ---------------------------------------------------------------------------

export function SequencingDnD({
  id,
  prompt,
  context,
  items,
  explanation,
  onTelemetry,
  onComplete,
  className = '',
}: SequencingProps) {
  const initialOrderRef = useRef<SequencingItem[]>(shuffle(items));

  const [order, setOrder] = useState<SequencingItem[]>(initialOrderRef.current);
  const [phase, setPhase] = useState<Phase>('ordering');
  const [positions, setPositions] = useState<SequencingPosition[]>([]);
  const [result, setResult] = useState<{ correct: boolean; accuracy: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Reset when the question identity changes
  useEffect(() => {
    const freshShuffle = shuffle(items);
    initialOrderRef.current = freshShuffle;
    setOrder(freshShuffle);
    setPhase('ordering');
    setPositions([]);
    setResult(null);
    setActiveId(null);
    startTimeRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ---------------------------------------------------------------------------
  // DnD handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Submit / Continue handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    const evaluated = evaluate(order, items);
    const correctCount = evaluated.filter((p) => p.correct).length;
    const accuracy = evaluated.length > 0 ? correctCount / evaluated.length : 0;
    const allCorrect = correctCount === evaluated.length;
    const timeMs = Date.now() - startTimeRef.current;

    setPositions(evaluated);
    setResult({ correct: allCorrect, accuracy });
    setPhase('feedback');

    onTelemetry?.({
      type: 'sequencing:submitted',
      interactionId: id,
      correct: allCorrect,
      accuracy,
      positions: evaluated,
      timeMs,
    });
  }, [order, items, id, onTelemetry]);

  const handleContinue = useCallback(() => {
    if (!result) return;
    const timeMs = Date.now() - startTimeRef.current;
    const finalResult: SequencingResult = {
      correct: result.correct,
      accuracy: result.accuracy,
      positions,
      timeMs,
    };
    onComplete?.(finalResult);
  }, [result, positions, onComplete]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const feedbackByItemId = React.useMemo(() => {
    const map = new Map<string, SequencingPosition>();
    for (const pos of positions) {
      map.set(pos.itemId, pos);
    }
    return map;
  }, [positions]);

  const accuracyLabel =
    result !== null
      ? `${positions.filter((p) => p.correct).length} / ${positions.length} in correct position`
      : null;

  const activeItem = activeId ? order.find((i) => i.id === activeId) ?? null : null;

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
            Sequencing
          </p>

          <CardTitle
            as="h2"
            className="leading-snug"
            style={{ color: 'var(--analysis-text-primary)', fontFamily: 'var(--font-analysis)' }}
          >
            {prompt}
          </CardTitle>

          {phase === 'ordering' && (
            <p className="mt-2 text-sm" style={{ color: 'var(--analysis-text-secondary)' }}>
              Drag the items using the handle to arrange them in the correct order.
            </p>
          )}
        </CardHeader>

        {/* Sequence list */}
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ol
                aria-label="Items to sequence"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {order.map((item, index) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    index={index}
                    phase={phase}
                    feedback={feedbackByItemId.get(item.id) ?? null}
                    isDragging={activeId === item.id}
                  />
                ))}
              </ol>
            </SortableContext>

            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18,0.67,0.6,1.22)',
              }}
            >
              {activeItem ? <DragOverlayRow item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Feedback panel */}
          {phase === 'feedback' && result && (
            <div
              className="mt-6 space-y-4"
              role="region"
              aria-label="Sequencing feedback"
              aria-live="polite"
            >
              {/* Result banner */}
              <div
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  border: `1px solid ${result.correct ? 'var(--analysis-correct)' : 'var(--analysis-incorrect)'}`,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: result.correct
                    ? 'rgba(76,175,130,0.1)'
                    : 'rgba(212,132,90,0.1)',
                  color: result.correct ? 'var(--analysis-correct)' : 'var(--analysis-incorrect)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                }}
              >
                {result.correct ? <IconCheck /> : <IconCross />}
                <span>{result.correct ? 'Correct order' : `Incorrect — ${accuracyLabel}`}</span>
              </div>

              {/* Explanation */}
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
                  Explanation
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--analysis-text-primary)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {explanation}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter>
          {phase === 'ordering' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSubmit}
              aria-label="Submit ordering"
            >
              Submit
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
