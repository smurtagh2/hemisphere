/**
 * SpatialOverviewScreen
 *
 * Encounter stage — screen 3 of 4.
 *
 * Presents a "big picture" map of the topic's knowledge landscape. Rather than
 * listing facts, this screen shows the learner the major regions of the topic
 * as an organic cluster of concept nodes, giving them a felt sense of the
 * terrain they are about to explore.
 *
 * Rendering strategy: SVG-free. Each concept node is absolutely positioned
 * inside a relative container using percentage coordinates supplied by the
 * caller. This keeps the component dependency-free while still producing a
 * spatial layout.
 */

import React, { useEffect, useState } from 'react';
import { TopBar } from '../../ui/TopBar';
import { Button } from '../../ui/Button';
import { Progress } from '../../ui/Progress';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** A single node in the concept map */
export interface ConceptNode {
  /** Unique identifier */
  id: string;

  /** Text displayed on the node */
  label: string;

  /**
   * Horizontal position as a percentage of the container width (0–100).
   * Centre of the node.
   */
  x: number;

  /**
   * Vertical position as a percentage of the container height (0–100).
   * Centre of the node.
   */
  y: number;

  /**
   * Visual weight of the node:
   * - "core"      — largest, accent-coloured; typically the central concept
   * - "major"     — medium, secondary accent; first-order subtopics
   * - "minor"     — small, tertiary; supporting ideas
   * @default "minor"
   */
  weight?: 'core' | 'major' | 'minor';

  /**
   * Optional short descriptor shown on hover / focus beneath the label.
   * Kept short (≤ 6 words).
   */
  description?: string;
}

export interface SpatialOverviewScreenProps {
  /** Short label identifying the topic being studied */
  topicTitle: string;

  /**
   * Brief framing sentence displayed above the map, e.g.
   * "Here is the landscape you'll be exploring."
   */
  framingText?: string;

  /** Concept nodes to render on the map */
  nodes: ConceptNode[];

  /**
   * Which screen in the Encounter sequence this is (1-indexed, out of total).
   * @default 3
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
// Helpers
// ----------------------------------------------------------------------------

const WEIGHT_STYLES: Record<
  NonNullable<ConceptNode['weight']>,
  { size: number; fontSize: string; bg: string; border: string; textColor: string }
> = {
  core: {
    size: 96,
    fontSize: '0.9rem',
    bg: 'var(--encounter-accent-primary)',
    border: '2px solid var(--encounter-accent-secondary)',
    textColor: '#ffffff',
  },
  major: {
    size: 72,
    fontSize: '0.78rem',
    bg: 'var(--encounter-bg-secondary)',
    border: '1.5px solid var(--encounter-accent-secondary)',
    textColor: 'var(--encounter-text-primary)',
  },
  minor: {
    size: 56,
    fontSize: '0.7rem',
    bg: 'var(--encounter-bg-secondary)',
    border: '1px solid var(--encounter-accent-tertiary)',
    textColor: 'var(--encounter-text-secondary)',
  },
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function SpatialOverviewScreen({
  topicTitle,
  framingText,
  nodes,
  screenIndex = 3,
  totalScreens = 4,
  onNext,
  onBack,
}: SpatialOverviewScreenProps) {
  const [visible, setVisible] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const progressValue = ((screenIndex - 1) / totalScreens) * 100;
  const focusedNode = nodes.find((n) => n.id === focusedId) ?? null;

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
      <div className="px-6 pt-2 pb-2">
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
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="px-6 pb-4"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity var(--duration-encounter-long) var(--ease-encounter)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
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
            Landscape
          </span>
        </div>

        {framingText && (
          <p
            className="text-md text-text-secondary"
            style={{
              fontFamily: 'var(--font-encounter)',
              lineHeight: 'var(--leading-extra-loose)',
            }}
          >
            {framingText}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Concept map                                                          */}
      {/* ------------------------------------------------------------------ */}
      <main
        className="flex-1 relative mx-4 mb-4 rounded-card overflow-hidden"
        style={{
          background: 'var(--encounter-bg-secondary)',
          minHeight: 280,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.97)',
          transition:
            'opacity var(--duration-encounter-long) var(--ease-encounter), ' +
            'transform var(--duration-encounter-long) var(--ease-encounter)',
        }}
        aria-label="Knowledge landscape map"
      >
        {/* Subtle radial background glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 50%, var(--encounter-glow) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Concept nodes */}
        {nodes.map((node, idx) => {
          const style = WEIGHT_STYLES[node.weight ?? 'minor'];
          const isFocused = focusedId === node.id;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => setFocusedId(isFocused ? null : node.id)}
              aria-pressed={isFocused}
              aria-label={`${node.label}${node.description ? ` — ${node.description}` : ''}`}
              style={{
                position: 'absolute',
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: style.size,
                height: style.size,
                transform: `translate(-50%, -50%) scale(${isFocused ? 1.1 : 1})`,
                borderRadius: '50%',
                background: style.bg,
                border: style.border,
                color: style.textColor,
                fontSize: style.fontSize,
                fontFamily: 'var(--font-encounter)',
                fontWeight: node.weight === 'core' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0.5em',
                cursor: 'pointer',
                transition:
                  'transform var(--duration-encounter-short) var(--ease-encounter), ' +
                  'box-shadow var(--duration-encounter-short) var(--ease-encounter)',
                boxShadow: isFocused
                  ? '0 0 20px var(--encounter-glow)'
                  : node.weight === 'core'
                  ? '0 0 28px var(--encounter-glow)'
                  : 'none',
                zIndex: node.weight === 'core' ? 3 : node.weight === 'major' ? 2 : 1,
                // Stagger the initial fade-in for each node
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <span>{node.label}</span>
            </button>
          );
        })}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Tooltip panel for focused node                                       */}
      {/* ------------------------------------------------------------------ */}
      {focusedNode?.description && (
        <div
          role="status"
          aria-live="polite"
          className="mx-4 mb-2 px-4 py-3 rounded-card text-sm text-text-secondary"
          style={{
            background: 'var(--encounter-bg-secondary)',
            fontFamily: 'var(--font-encounter)',
            lineHeight: 'var(--leading-extra-loose)',
            borderLeft: '2px solid var(--encounter-accent-primary)',
          }}
        >
          <span className="font-semibold text-text-primary">{focusedNode.label}</span>
          {' — '}
          {focusedNode.description}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Legend                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-6 pb-2 flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: 'var(--encounter-accent-primary)' }}
            aria-hidden="true"
          />
          Core concept
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full border"
            style={{
              background: 'var(--encounter-bg-secondary)',
              borderColor: 'var(--encounter-accent-secondary)',
            }}
            aria-hidden="true"
          />
          Major theme
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full border"
            style={{
              background: 'var(--encounter-bg-secondary)',
              borderColor: 'var(--encounter-accent-tertiary)',
            }}
            aria-hidden="true"
          />
          Supporting idea
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-6 pb-8 pt-4 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          I can see the territory
        </Button>
      </div>
    </div>
  );
}
