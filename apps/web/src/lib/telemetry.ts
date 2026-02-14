/**
 * Telemetry Service
 *
 * Collects telemetry events from all Analysis-stage interaction components
 * (ActiveRecall, MCQ, Categorization, Sequencing), batches them, and flushes
 * them to POST /api/telemetry.  When the browser is offline the events are
 * persisted to localStorage and retried when connectivity is restored.
 *
 * Usage:
 *   import { telemetry } from '@/lib/telemetry';
 *
 *   // Wire into AnalysisSession's onTelemetry prop:
 *   <AnalysisSession onTelemetry={telemetry.collect} ... />
 *
 *   // Or access the singleton's collect method directly:
 *   telemetry.collect(event);
 *
 * The service is a singleton instantiated at module load time so there is a
 * single shared queue across the app.
 */

import type {
  ActiveRecallTelemetryEvent,
  MCQTelemetryEvent,
  CategorizationTelemetryEvent,
  SequencingTelemetryEvent,
} from '../components/interactions';

// ---------------------------------------------------------------------------
// Union type covering every interaction telemetry event
// ---------------------------------------------------------------------------

/**
 * Any telemetry event emitted by the four Analysis-stage interaction
 * components.  This is the discriminated union consumed by the telemetry
 * service and the onTelemetry prop of AnalysisSession.
 */
export type AnalysisTelemetryEvent =
  | ActiveRecallTelemetryEvent
  | MCQTelemetryEvent
  | CategorizationTelemetryEvent
  | SequencingTelemetryEvent;

// ---------------------------------------------------------------------------
// Envelope — wraps each event with session-level metadata before sending
// ---------------------------------------------------------------------------

export interface TelemetryEnvelope {
  /** The raw interaction event. */
  event: AnalysisTelemetryEvent;
  /** ISO-8601 timestamp of when this envelope was created by the client. */
  enqueuedAt: string;
  /** Opaque session identifier sourced from the browser session. */
  sessionId: string;
  /** Client-side sequence counter (monotonically increasing per session). */
  seq: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TelemetryConfig {
  /**
   * Endpoint that receives the batch POST.
   * @default '/api/telemetry'
   */
  endpoint?: string;
  /**
   * Maximum number of events to accumulate before forcing a flush.
   * @default 20
   */
  maxBatchSize?: number;
  /**
   * Idle ms after the last event before the batch is flushed automatically.
   * @default 3000
   */
  flushIntervalMs?: number;
  /**
   * localStorage key used to persist events while offline.
   * @default 'hemisphere:telemetry:queue'
   */
  storageKey?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

/** Generate a random session id scoped to this browser tab. */
function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// TelemetryService
// ---------------------------------------------------------------------------

export class TelemetryService {
  private readonly endpoint: string;
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly storageKey: string;

  private readonly sessionId: string;
  private seq = 0;

  /** In-memory queue of envelopes waiting to be flushed. */
  private queue: TelemetryEnvelope[] = [];

  /** Handle for the debounce timer. */
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** True while a flush HTTP request is in flight. */
  private isFlushing = false;

  constructor(config: TelemetryConfig = {}) {
    this.endpoint = config.endpoint ?? '/api/telemetry';
    this.maxBatchSize = config.maxBatchSize ?? 20;
    this.flushIntervalMs = config.flushIntervalMs ?? 3000;
    this.storageKey = config.storageKey ?? 'hemisphere:telemetry:queue';

    this.sessionId = makeSessionId();

    // Recover any events that were persisted offline during a previous page load
    this._recoverFromStorage();

    // Flush persisted events on connectivity restore
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._flush());
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a single telemetry event.  Automatically debounces and flushes.
   *
   * This method is intentionally typed as an arrow function so it can be
   * passed directly as the onTelemetry prop without binding:
   *
   *   <AnalysisSession onTelemetry={telemetry.collect} />
   */
  collect = (event: AnalysisTelemetryEvent): void => {
    const envelope: TelemetryEnvelope = {
      event,
      enqueuedAt: nowIso(),
      sessionId: this.sessionId,
      seq: this.seq++,
    };

    this.queue.push(envelope);
    this._persistToStorage();

    if (this.queue.length >= this.maxBatchSize) {
      this._scheduleFlush(0);
    } else {
      this._scheduleFlush(this.flushIntervalMs);
    }
  };

  /**
   * Immediately flush all queued events.  Useful when the page is about to
   * unload (call from a beforeunload handler).
   */
  async flush(): Promise<void> {
    this._clearTimer();
    await this._flush();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _scheduleFlush(delayMs: number): void {
    this._clearTimer();
    this.flushTimer = setTimeout(() => {
      this._flush().catch(() => {
        // Errors are handled inside _flush — swallow here to avoid
        // unhandled promise rejection warnings.
      });
    }, delayMs);
  }

  private _clearTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async _flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    // Snapshot the current batch and clear the queue optimistically
    const batch = this.queue.splice(0, this.queue.length);
    this._persistToStorage();
    this.isFlushing = true;

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline — put the events back for later retry
        this.queue = [...batch, ...this.queue];
        this._persistToStorage();
        return;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        // Use keepalive so the request survives page navigation
        keepalive: true,
      });

      if (!response.ok) {
        // Server rejected the batch — requeue for a future attempt
        this.queue = [...batch, ...this.queue];
        this._persistToStorage();
      } else {
        // Success: clear any previously persisted copy of these events
        this._persistToStorage();
      }
    } catch {
      // Network error — requeue
      this.queue = [...batch, ...this.queue];
      this._persistToStorage();
    } finally {
      this.isFlushing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // localStorage persistence (offline support)
  // ---------------------------------------------------------------------------

  private _persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.queue.length === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      }
    } catch {
      // Storage quota exceeded or unavailable — continue without persistence
    }
  }

  private _recoverFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const recovered: TelemetryEnvelope[] = JSON.parse(raw);
      if (Array.isArray(recovered) && recovered.length > 0) {
        // Prepend recovered events ahead of any newly enqueued events
        this.queue = [...recovered, ...this.queue];
      }
    } catch {
      // Corrupted storage — discard and start fresh
      localStorage.removeItem(this.storageKey);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

/**
 * Shared telemetry service instance.
 *
 * Import this directly and pass `telemetry.collect` as the `onTelemetry` prop:
 *
 *   import { telemetry } from '@/lib/telemetry';
 *   <AnalysisSession onTelemetry={telemetry.collect} ... />
 */
export const telemetry = new TelemetryService();
