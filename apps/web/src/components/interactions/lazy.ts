/**
 * Lazy (dynamic) imports for interaction components that bundle heavy
 * dependencies (framer-motion, @dnd-kit/core, @dnd-kit/sortable).
 *
 * Use these exports instead of the direct imports when rendering in pages
 * to keep the initial JS bundle small and improve Time-to-Interactive.
 *
 * SSR is disabled (`ssr: false`) for DnD components because @dnd-kit relies
 * on browser-only pointer/touch APIs that are not available in Node.
 *
 * Usage:
 *   import { CategorizationDnDLazy, SequencingDnDLazy } from '@/components/interactions/lazy';
 */

import dynamic from 'next/dynamic';

/** Drag-and-drop variant of Categorization — loaded only in the browser. */
export const CategorizationDnDLazy = dynamic(
  () =>
    import('./CategorizationDnD').then((m) => ({ default: m.CategorizationDnD })),
  { ssr: false },
);

/** Drag-and-drop variant of Sequencing — loaded only in the browser. */
export const SequencingDnDLazy = dynamic(
  () =>
    import('./SequencingDnD').then((m) => ({ default: m.SequencingDnD })),
  { ssr: false },
);
