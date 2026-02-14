/**
 * Queue Slice
 *
 * Manages the ordered list of content items to present during a session.
 * Tracks the presentation order, which item is currently active, which items
 * have been seen/skipped, and supports look-ahead for prefetching.
 *
 * The queue item IDs mirror the SessionState.itemQueue from the state machine,
 * but this slice holds the richer UI-level metadata (display order, seen status,
 * skip counts) separately so the shared reducer stays pure.
 */

import type { SessionStage } from '@hemisphere/shared';

// ============================================================================
// Item Types
// ============================================================================

/**
 * A single item in the presentation queue.
 * Content IDs come from the session plan; metadata is UI-facing.
 */
export interface QueueItem {
  /** Stable content item ID (matches DB / SessionState.itemQueue) */
  id: string;

  /** Which stage this item belongs to */
  stage: SessionStage;

  /** Ordinal position in the overall queue (0-based) */
  position: number;

  /** Whether the user has been shown this item at least once */
  seen: boolean;

  /** Number of times the learner has skipped past this item */
  skipCount: number;

  /**
   * Optional display hint: type of content activity.
   * Populated once content is fetched from the API.
   */
  activityType?: string;

  /**
   * Optional label for UI display (e.g. card title snippet).
   * Populated once content is fetched from the API.
   */
  label?: string;
}

// ============================================================================
// Slice State
// ============================================================================

export interface QueueSliceState {
  /** Ordered list of items for this session */
  items: QueueItem[];

  /** Index into `items` of the currently active item, or -1 if none */
  currentIndex: number;

  /**
   * How many items ahead to consider "prefetch eligible".
   * Used by data-fetching hooks to warm up content.
   */
  prefetchWindow: number;

  /** Whether the queue has been fully exhausted for the current stage */
  stageQueueExhausted: boolean;
}

// ============================================================================
// Slice Actions
// ============================================================================

export interface QueueSliceActions {
  /**
   * Initialise (or replace) the queue from an ordered list of content IDs.
   * Typically called once when a session plan is loaded.
   */
  initQueue: (itemIds: string[], stage: SessionStage) => void;

  /**
   * Append additional items to the queue (e.g. when stage advances and
   * new items are added for the Analysis or Return stages).
   */
  appendItems: (itemIds: string[], stage: SessionStage) => void;

  /**
   * Advance to the next item in the queue.
   * Marks the current item as seen before moving forward.
   * Returns false if already at the end of the queue.
   */
  advance: () => boolean;

  /**
   * Move back to the previous item (review flow).
   * Returns false if already at the start.
   */
  goBack: () => boolean;

  /**
   * Skip the current item (increments skipCount, advances index).
   * Returns false if at end of queue.
   */
  skip: () => boolean;

  /**
   * Jump directly to a specific item by its content ID.
   * Returns false if the ID is not found in the queue.
   */
  jumpTo: (itemId: string) => boolean;

  /**
   * Mark a specific item as seen by its content ID.
   */
  markSeen: (itemId: string) => void;

  /**
   * Enrich a queue item with display metadata (activityType, label).
   * Called once the content fetch resolves.
   */
  setItemMeta: (itemId: string, meta: Pick<QueueItem, 'activityType' | 'label'>) => void;

  /** Reset the queue to empty state */
  clearQueue: () => void;

  /** Computed: the currently active QueueItem, or null */
  getCurrentItem: () => QueueItem | null;

  /** Computed: items in the look-ahead prefetch window */
  getPrefetchItems: () => QueueItem[];

  /** Computed: ratio of seen items to total items (0–1) */
  getQueueProgress: () => number;

  /** Computed: items belonging to a specific stage */
  getItemsByStage: (stage: SessionStage) => QueueItem[];
}

// ============================================================================
// Slice Type (combined)
// ============================================================================

export type QueueSlice = QueueSliceState & QueueSliceActions;

// ============================================================================
// Default State
// ============================================================================

export const defaultQueueSliceState: QueueSliceState = {
  items: [],
  currentIndex: -1,
  prefetchWindow: 2,
  stageQueueExhausted: false,
};

// ============================================================================
// Slice Creator
// ============================================================================

export function createQueueSlice<S extends QueueSlice>(
  set: (partial: Partial<S> | ((state: S) => Partial<S>)) => void,
  get: () => S
): QueueSlice {
  return {
    ...defaultQueueSliceState,

    initQueue: (itemIds, stage) => {
      const items: QueueItem[] = itemIds.map((id, position) => ({
        id,
        stage,
        position,
        seen: false,
        skipCount: 0,
      }));
      set({
        items,
        currentIndex: items.length > 0 ? 0 : -1,
        stageQueueExhausted: false,
      } as Partial<S>);
    },

    appendItems: (itemIds, stage) => {
      const existingItems = get().items;
      const startPosition = existingItems.length;
      const newItems: QueueItem[] = itemIds.map((id, i) => ({
        id,
        stage,
        position: startPosition + i,
        seen: false,
        skipCount: 0,
      }));
      const updatedItems = [...existingItems, ...newItems];
      set({
        items: updatedItems,
        // If queue was exhausted, point to the first new item
        currentIndex:
          get().stageQueueExhausted && updatedItems.length > 0
            ? startPosition
            : get().currentIndex,
        stageQueueExhausted: false,
      } as Partial<S>);
    },

    advance: () => {
      const { items, currentIndex } = get();
      // Mark current as seen
      if (currentIndex >= 0 && currentIndex < items.length) {
        const updatedItems = items.map((item, i) =>
          i === currentIndex ? { ...item, seen: true } : item
        );
        const nextIndex = currentIndex + 1;
        const exhausted = nextIndex >= updatedItems.length;
        set({
          items: updatedItems,
          currentIndex: exhausted ? currentIndex : nextIndex,
          stageQueueExhausted: exhausted,
        } as Partial<S>);
        return !exhausted;
      }
      return false;
    },

    goBack: () => {
      const { currentIndex } = get();
      if (currentIndex <= 0) return false;
      set({ currentIndex: currentIndex - 1, stageQueueExhausted: false } as Partial<S>);
      return true;
    },

    skip: () => {
      const { items, currentIndex } = get();
      if (currentIndex < 0 || currentIndex >= items.length) return false;

      const updatedItems = items.map((item, i) =>
        i === currentIndex
          ? { ...item, seen: true, skipCount: item.skipCount + 1 }
          : item
      );
      const nextIndex = currentIndex + 1;
      const exhausted = nextIndex >= updatedItems.length;
      set({
        items: updatedItems,
        currentIndex: exhausted ? currentIndex : nextIndex,
        stageQueueExhausted: exhausted,
      } as Partial<S>);
      return !exhausted;
    },

    jumpTo: (itemId) => {
      const { items } = get();
      const targetIndex = items.findIndex((item) => item.id === itemId);
      if (targetIndex === -1) return false;
      set({ currentIndex: targetIndex, stageQueueExhausted: false } as Partial<S>);
      return true;
    },

    markSeen: (itemId) => {
      const { items } = get();
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, seen: true } : item
      );
      set({ items: updatedItems } as Partial<S>);
    },

    setItemMeta: (itemId, meta) => {
      const { items } = get();
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, ...meta } : item
      );
      set({ items: updatedItems } as Partial<S>);
    },

    clearQueue: () => {
      set({
        items: [],
        currentIndex: -1,
        stageQueueExhausted: false,
      } as unknown as Partial<S>);
    },

    getCurrentItem: () => {
      const { items, currentIndex } = get();
      if (currentIndex < 0 || currentIndex >= items.length) return null;
      return items[currentIndex] ?? null;
    },

    getPrefetchItems: () => {
      const { items, currentIndex, prefetchWindow } = get();
      if (currentIndex < 0) return [];
      const start = currentIndex + 1;
      const end = Math.min(start + prefetchWindow, items.length);
      return items.slice(start, end);
    },

    getQueueProgress: () => {
      const { items } = get();
      if (items.length === 0) return 0;
      const seenCount = items.filter((item) => item.seen).length;
      return seenCount / items.length;
    },

    getItemsByStage: (stage) => {
      return get().items.filter((item) => item.stage === stage);
    },
  };
}
