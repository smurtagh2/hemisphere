/**
 * EncounterSession
 *
 * Orchestrates the four Encounter stage screens in order:
 *   1. HookScreen         — grabbing attention
 *   2. NarrativeScreen    — story-based introduction
 *   3. SpatialOverviewScreen — big-picture concept map
 *   4. EmotionalAnchorScreen — personal connection prompt
 *
 * Wires into the Zustand store (`advance`, `initQueue`) so that each "Next"
 * press both transitions the local screen state AND advances the item queue
 * position. When all four screens have been seen, calls `onComplete`.
 *
 * Usage:
 *
 *   <EncounterSession
 *     topicTitle="Quantum Entanglement"
 *     sessionId="sess_abc"
 *     userId="user_123"
 *     topicId="topic_xyz"
 *     hook="What if two particles could be in communication faster than light?"
 *     storyTitle="Einstein's 'Spooky Action'"
 *     storySections={[{ text: "In 1935, Einstein and his colleagues …" }]}
 *     conceptNodes={[
 *       { id: 'core', label: 'Entanglement', x: 50, y: 45, weight: 'core' },
 *       { id: 'super', label: 'Superposition', x: 25, y: 25, weight: 'major' },
 *       …
 *     ]}
 *     anchorPrompt="Why does the idea of instant connection across space resonate with you?"
 *     onComplete={(anchor) => console.log('anchor:', anchor)}
 *   />
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  useSessionStore,
  useSessionActions,
} from '../../../lib/store';

import { HookScreen } from './HookScreen';
import { NarrativeScreen, type NarrativeSection } from './NarrativeScreen';
import { SpatialOverviewScreen, type ConceptNode } from './SpatialOverviewScreen';
import { EmotionalAnchorScreen } from './EmotionalAnchorScreen';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface EncounterSessionProps {
  // ------ session bootstrap -------------------------------------------------
  /** Session identifier from the API / DB */
  sessionId: string;
  /** Authenticated user ID */
  userId: string;
  /** Topic being studied */
  topicId: string;
  /** Short human-readable topic label shown in TopBar */
  topicTitle: string;

  // ------ HookScreen content ------------------------------------------------
  /**
   * The attention-grabbing hook — a question or surprising statement.
   */
  hook: string;
  /** Optional secondary text below the hook. */
  hookSubtext?: string;

  // ------ NarrativeScreen content -------------------------------------------
  /** Optional title for the story segment. */
  storyTitle?: string;
  /** Narrative body sections. */
  storySections: NarrativeSection[];
  /** Optional pull-quote for the narrative screen. */
  pullQuote?: string;

  // ------ SpatialOverviewScreen content -------------------------------------
  /** Framing sentence for the concept map. */
  mapFramingText?: string;
  /** Concept nodes for the spatial overview map. */
  conceptNodes: ConceptNode[];

  // ------ EmotionalAnchorScreen content -------------------------------------
  /** Personal connection prompt. */
  anchorPrompt: string;
  /** Optional sub-prompt. */
  anchorSubPrompt?: string;

  // ------ Callbacks ---------------------------------------------------------
  /**
   * Called when the learner completes all four Encounter screens.
   * @param anchorText The text the learner wrote in EmotionalAnchorScreen
   *                   (empty string if they skipped).
   */
  onComplete: (anchorText: string) => void;

  /** Called when the learner presses back from the first screen. */
  onExit?: () => void;
}

// ----------------------------------------------------------------------------
// Internal screen index constants
// ----------------------------------------------------------------------------

const SCREEN_HOOK = 0;
const SCREEN_NARRATIVE = 1;
const SCREEN_SPATIAL = 2;
const SCREEN_ANCHOR = 3;
const TOTAL_SCREENS = 4;

// Synthetic content-item IDs for the Encounter queue.
// A real integration would use IDs from the session plan.
const ENCOUNTER_ITEM_IDS = [
  'encounter:hook',
  'encounter:narrative',
  'encounter:spatial',
  'encounter:anchor',
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function EncounterSession({
  sessionId,
  userId,
  topicId,
  topicTitle,
  hook,
  hookSubtext,
  storyTitle,
  storySections,
  pullQuote,
  mapFramingText,
  conceptNodes,
  anchorPrompt,
  anchorSubPrompt,
  onComplete,
  onExit,
}: EncounterSessionProps) {
  const [screenIndex, setScreenIndex] = useState(SCREEN_HOOK);

  // ---- Store wiring --------------------------------------------------------

  const { loadSession, initQueue, advance } = useSessionActions();
  const storeIsReady = useSessionStore((s) => s.session !== null);

  // Bootstrap the session and queue once on mount.
  useEffect(() => {
    if (!storeIsReady) {
      loadSession({
        sessionId,
        userId,
        topicId,
        sessionType: 'encounter',
        itemQueue: ENCOUNTER_ITEM_IDS,
        plannedBalance: { newItemCount: 4, reviewItemCount: 0, interleavedCount: 0 },
      });
    }
    initQueue(ENCOUNTER_ITEM_IDS, 'encounter');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Navigation ----------------------------------------------------------

  const handleNext = useCallback(
    (anchorText?: string) => {
      // Advance the store queue (marks current item seen, moves pointer).
      advance();

      if (screenIndex < TOTAL_SCREENS - 1) {
        setScreenIndex((prev) => prev + 1);
      } else {
        // All screens done — call completion handler.
        onComplete(anchorText ?? '');
      }
    },
    [screenIndex, advance, onComplete]
  );

  const handleBack = useCallback(() => {
    if (screenIndex === SCREEN_HOOK) {
      onExit?.();
    } else {
      setScreenIndex((prev) => prev - 1);
    }
  }, [screenIndex, onExit]);

  // ---- Render the active screen --------------------------------------------

  const sharedProps = {
    topicTitle,
    totalScreens: TOTAL_SCREENS,
    onBack: handleBack,
  };

  switch (screenIndex) {
    case SCREEN_HOOK:
      return (
        <HookScreen
          {...sharedProps}
          hook={hook}
          subtext={hookSubtext}
          screenIndex={1}
          onNext={() => handleNext()}
        />
      );

    case SCREEN_NARRATIVE:
      return (
        <NarrativeScreen
          {...sharedProps}
          storyTitle={storyTitle}
          sections={storySections}
          pullQuote={pullQuote}
          screenIndex={2}
          onNext={() => handleNext()}
        />
      );

    case SCREEN_SPATIAL:
      return (
        <SpatialOverviewScreen
          {...sharedProps}
          framingText={mapFramingText}
          nodes={conceptNodes}
          screenIndex={3}
          onNext={() => handleNext()}
        />
      );

    case SCREEN_ANCHOR:
      return (
        <EmotionalAnchorScreen
          {...sharedProps}
          prompt={anchorPrompt}
          subPrompt={anchorSubPrompt}
          screenIndex={4}
          onNext={(text) => handleNext(text)}
        />
      );

    default:
      return null;
  }
}
