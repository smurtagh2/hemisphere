'use client';

/**
 * Session Orchestrator Page  —  /session/[id]
 *
 * When `id` is "new" this page creates a session first (via /api/session/start)
 * then re-renders itself with the real session ID in the URL.
 *
 * Once a session ID is known it renders the three-stage learning loop:
 *
 *   EncounterSession → StageTransition → AnalysisSession → StageTransition → ReturnSession
 *
 * On ReturnSession completion it calls /api/session/complete and navigates
 * to /session/[id]/complete for the summary view.
 *
 * Content data is stub/placeholder while the content API is scaffolded.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { EncounterSession } from '@/components/screens/encounter/EncounterSession';
import { AnalysisSession, type AnalysisContentItem } from '@/components/screens/analysis/AnalysisSession';
import { ReturnSession, type ReturnSessionResult } from '@/components/screens/return/ReturnSession';

import {
  startSession,
  getSession,
  completeSession,
  getToken,
  type SessionRecord,
  type SessionLoopType,
} from '@/lib/api';

import {
  trackSessionStarted,
  trackSessionCompleted,
} from '@/lib/posthog';

// ---------------------------------------------------------------------------
// Stage transition overlay
// ---------------------------------------------------------------------------

function StageTransition({
  from,
  to,
  onDone,
}: {
  from: string;
  to: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-bg-primary z-50"
      role="status"
      aria-live="polite"
      aria-label={`Transitioning from ${from} to ${to}`}
    >
      <div
        className="w-12 h-12 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mb-6"
        aria-hidden="true"
      />
      <p className="text-text-secondary text-sm font-body">
        Moving to {to}…
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stub content helpers
// Produces minimal valid content so the UI renders while the content API
// is being built out. Real content will come from /api/session/:id/content.
// ---------------------------------------------------------------------------

function makeEncounterProps(session: SessionRecord) {
  return {
    sessionId: session.id,
    userId: 'current',  // resolved from token on the server
    topicId: session.topicId,
    topicTitle: session.topicTitle,
    hook: `What do you already know about "${session.topicTitle}"?`,
    hookSubtext: 'Take a moment before we begin.',
    storyTitle: session.topicTitle,
    storySections: [
      {
        text: `This session covers ${session.topicTitle}. You'll encounter the core ideas, practise them, and then reflect on what you've learned.`,
      },
    ],
    conceptNodes: [
      { id: 'core', label: session.topicTitle, x: 50, y: 45, weight: 'core' as const },
    ],
    anchorPrompt: `Why does ${session.topicTitle} matter to you personally?`,
  };
}

const STUB_ANALYSIS_ITEMS: Record<string, AnalysisContentItem> = {
  'analysis:q1': {
    itemType: 'active_recall',
    prompt: 'In your own words, describe the main concept from the Encounter stage.',
    expectedAnswer: 'Open-ended — self-assessed.',
  },
  'analysis:q2': {
    itemType: 'multiple_choice',
    question: 'Which of the following best describes spaced repetition?',
    options: [
      { id: 'a', label: 'Studying the same material for hours at a stretch', correct: false, rationale: 'This is massed practice, not spaced repetition.' },
      { id: 'b', label: 'Reviewing material at increasing intervals over time', correct: true, rationale: 'Spaced repetition spaces reviews to exploit the forgetting curve.' },
      { id: 'c', label: 'Reading new material every day', correct: false, rationale: 'Novelty alone is not spaced repetition.' },
    ],
    explanation: 'Spaced repetition uses the forgetting curve: reviewing just before you forget cements long-term memory.',
  },
};

function makeAnalysisContent(): Record<string, AnalysisContentItem> {
  return STUB_ANALYSIS_ITEMS;
}

function makeReturnProps(session: SessionRecord) {
  return {
    reconnection: {
      concept: session.topicTitle,
      bridgingQuestion: `How does ${session.topicTitle} connect to something you already know?`,
      orientingPrompt: 'Think of a concept, experience, or skill it reminds you of.',
    },
    transferChallenge: {
      concept: session.topicTitle,
      scenario: `Imagine you're explaining ${session.topicTitle} to a friend who has never heard of it.`,
      scenarioContext: 'Use an analogy or real-world example.',
      modelExample: `For example, one way to explain it might be: "${session.topicTitle} is like … because …"`,
    },
    reflection: {
      topic: session.topicTitle,
      reflectionQuestion: `What surprised you most about ${session.topicTitle} in this session?`,
      guidingNote: 'Honest reflection — even "I found it confusing" is valuable.',
      closingMessage: 'Your reflection has been saved. Great work today.',
    },
  };
}

// ---------------------------------------------------------------------------
// Stage machine
// ---------------------------------------------------------------------------

type Stage =
  | 'loading'
  | 'error'
  | 'encounter'
  | 'transition-to-analysis'
  | 'analysis'
  | 'transition-to-return'
  | 'return'
  | 'completing';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = params.id;           // "new" or a real session ID
  const topicId = searchParams.get('topicId') ?? '';
  const sessionTypeParam = searchParams.get('sessionType');
  const sessionType: SessionLoopType =
    sessionTypeParam === 'quick' || sessionTypeParam === 'extended'
      ? sessionTypeParam
      : 'standard';

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Accumulate accuracy across stages for the completion call
  const accuracyRef = useRef<number>(1);
  const sessionStartRef = useRef<number>(Date.now());

  // Bootstrap the session
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Demo mode: no token → use stub session so the UI can be previewed
      if (!getToken()) {
        const stub: SessionRecord = {
          id: 'demo',
          topicId: topicId || 'demo-topic',
          topicTitle: topicId ? topicId.replace(/-/g, ' ') : 'Demo Topic',
          sessionType,
          startedAt: new Date().toISOString(),
          completedAt: null,
          accuracy: null,
          itemCount: 0,
        };
        if (!cancelled) {
          setSession(stub);
          setStage('encounter');
          trackSessionStarted(stub.id, stub.sessionType ?? sessionType, stub.topicId);
          sessionStartRef.current = Date.now();
        }
        return;
      }

      try {
        let rec: SessionRecord;

        if (rawId === 'new') {
          if (!topicId) {
            setLoadError('No topic selected. Please go back to the dashboard.');
            setStage('error');
            return;
          }
          rec = await startSession({ topicId, sessionType });
          window.history.replaceState(null, '', `/session/${rec.id}`);
        } else {
          rec = await getSession(rawId);
        }

        if (!cancelled) {
          setSession(rec);
          setStage('encounter');
          trackSessionStarted(rec.id, rec.sessionType ?? sessionType, rec.topicId);
          sessionStartRef.current = Date.now();
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load session.');
          setStage('error');
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [rawId, topicId, sessionType]);

  // ---- Stage handlers ----

  function handleEncounterComplete() {
    setStage('transition-to-analysis');
  }

  function handleAnalysisComplete() {
    setStage('transition-to-return');
  }

  async function handleReturnComplete(result: ReturnSessionResult) {
    if (!session) return;
    setStage('completing');

    try {
      await completeSession({
        sessionId: session.id,
        accuracy: accuracyRef.current,
        itemsCompleted: Object.keys(STUB_ANALYSIS_ITEMS).length,
      });
    } catch {
      // Non-fatal — still navigate to the complete page
    }

    trackSessionCompleted(
      session.id,
      session.sessionType ?? sessionType,
      Date.now() - sessionStartRef.current
    );
    router.push(`/session/${session.id}/complete`);
  }

  // ---- Render ----

  if (stage === 'loading') {
    return (
      <div
        data-stage="encounter"
        className="min-h-screen flex items-center justify-center bg-bg-primary"
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm" role="status">
            Preparing your session…
          </p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div
        data-stage="encounter"
        className="min-h-screen flex items-center justify-center bg-bg-primary px-4"
      >
        <div className="text-center max-w-sm">
          <p className="text-error mb-4" role="alert">
            {loadError ?? 'An error occurred.'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-accent-primary hover:underline text-sm"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const encounterProps = makeEncounterProps(session);
  const analysisContent = makeAnalysisContent();
  const returnProps = makeReturnProps(session);

  return (
    <>
      {stage === 'encounter' && (
        <EncounterSession
          {...encounterProps}
          onComplete={handleEncounterComplete}
          onExit={() => router.push('/dashboard')}
        />
      )}

      {stage === 'transition-to-analysis' && (
        <StageTransition
          from="Encounter"
          to="Analysis"
          onDone={() => setStage('analysis')}
        />
      )}

      {stage === 'analysis' && (
        <div data-stage="analysis">
          <AnalysisSession
            contentByItemId={analysisContent}
            onStageComplete={handleAnalysisComplete}
            onBack={() => setStage('encounter')}
          />
        </div>
      )}

      {stage === 'transition-to-return' && (
        <StageTransition
          from="Analysis"
          to="Return"
          onDone={() => setStage('return')}
        />
      )}

      {stage === 'return' && (
        <ReturnSession
          sessionId={session.id}
          reconnection={returnProps.reconnection}
          transferChallenge={returnProps.transferChallenge}
          reflection={returnProps.reflection}
          onComplete={handleReturnComplete}
        />
      )}

      {stage === 'completing' && (
        <div
          data-stage="return"
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--return-bg-primary)' }}
        >
          <div className="text-center">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: 'var(--return-accent-primary)', borderTopColor: 'transparent' }}
              aria-hidden="true"
            />
            <p className="text-sm" style={{ color: 'var(--return-text-secondary)' }} role="status">
              Saving your session…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
