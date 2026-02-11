/**
 * Shared TypeScript types and interfaces
 */

// Placeholder for shared types
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
