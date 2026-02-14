/**
 * scoring.ts — Async Claude scoring for transfer challenge responses.
 *
 * POST /api/scoring/transfer
 *   Accepts a learner's free-text response to a transfer challenge and
 *   evaluates it against the concept and scenario using Claude (Haiku).
 *
 *   If the Anthropic API key is not configured, or the Claude call fails
 *   for any reason, the endpoint falls back to a rule-based heuristic that
 *   scores by response length.
 *
 * Response shape:
 *   {
 *     score:         number  (0–1)
 *     feedback:      string  (one-sentence learner-facing feedback)
 *     rationale:     string  (brief explanation of the score)
 *     scoringMethod: 'claude' | 'fallback'
 *   }
 */

import { Hono } from 'hono';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const scoringRoutes = new Hono<AppEnv>();

// ─── Validation ───────────────────────────────────────────────────────────────

const transferScoreSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  userResponse: z.string().min(1, 'userResponse is required'),
  concept: z.string().min(1, 'concept is required'),
  scenario: z.string().min(1, 'scenario is required'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferScoreResult {
  score: number;
  feedback: string;
  rationale: string;
  scoringMethod: 'claude' | 'fallback';
}

// ─── Fallback heuristic ───────────────────────────────────────────────────────

/**
 * Rule-based fallback scorer.
 * Uses response length as a proxy for engagement quality.
 *   > 200 chars → 0.8 (substantial attempt)
 *   > 100 chars → 0.7 (moderate attempt)
 *   >  50 chars → 0.6 (brief attempt)
 *   ≤  50 chars → 0.4 (minimal attempt)
 */
function fallbackScore(userResponse: string): TransferScoreResult {
  const len = userResponse.trim().length;

  let score: number;
  let rationale: string;

  if (len > 200) {
    score = 0.8;
    rationale = 'Response is substantial (>200 chars); length suggests meaningful engagement.';
  } else if (len > 100) {
    score = 0.7;
    rationale = 'Response is moderate (>100 chars); demonstrates some engagement.';
  } else if (len > 50) {
    score = 0.6;
    rationale = 'Response is brief (>50 chars); partial engagement detected.';
  } else {
    score = 0.4;
    rationale = 'Response is very short (≤50 chars); limited engagement detected.';
  }

  return {
    score,
    feedback:
      'Your response has been recorded. Review the example application to compare your approach.',
    rationale,
    scoringMethod: 'fallback',
  };
}

// ─── Claude scorer ────────────────────────────────────────────────────────────

/**
 * Calls the Anthropic API to evaluate whether the learner's response
 * demonstrates understanding of the concept applied to the scenario.
 *
 * Expects Claude to return a strict JSON object so we can parse it reliably.
 */
async function claudeScore(
  userResponse: string,
  concept: string,
  scenario: string,
): Promise<TransferScoreResult> {
  const client = new Anthropic();

  const systemPrompt = `You are an expert learning assessment engine evaluating a learner's transfer challenge response.

A transfer challenge asks learners to apply a concept to a new, unfamiliar scenario. You must evaluate whether the response demonstrates genuine understanding of the concept applied to the specific scenario.

Scoring criteria:
- 0.9–1.0: Exceptional — insightful, accurate, shows novel application and deep understanding
- 0.7–0.89: Good — clearly applies the concept to the scenario with some depth
- 0.5–0.69: Adequate — partially applies the concept; some relevant elements present
- 0.3–0.49: Weak — minimal application; mostly generic or surface-level
- 0.0–0.29: Poor — does not apply the concept or is off-topic

You MUST respond with ONLY a valid JSON object matching this exact structure (no markdown, no extra text):
{
  "score": <number between 0 and 1>,
  "feedback": "<one-sentence, encouraging, learner-facing feedback>",
  "rationale": "<brief internal explanation of the score, 1-2 sentences>"
}`;

  const userMessage = `Concept: ${concept}

Scenario: ${scenario}

Learner's response:
${userResponse}

Evaluate this response and return the JSON assessment.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in Claude response');
  }

  const raw = textBlock.text.trim();

  // Strip any accidental markdown fences
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(jsonText) as {
    score?: unknown;
    feedback?: unknown;
    rationale?: unknown;
  };

  const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : null;
  const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : null;
  const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : null;

  if (score === null || feedback === null || rationale === null) {
    throw new Error('Claude response JSON is missing required fields');
  }

  return {
    score,
    feedback,
    rationale,
    scoringMethod: 'claude',
  };
}

// ─── POST /transfer ───────────────────────────────────────────────────────────

/**
 * POST /api/scoring/transfer
 *
 * Scores a learner's transfer challenge response using Claude (Haiku) if
 * ANTHROPIC_API_KEY is set; otherwise falls back to a rule-based heuristic.
 *
 * Request body:
 *   {
 *     sessionId:    string  — the learning session ID (for logging/audit)
 *     userResponse: string  — the learner's written response
 *     concept:      string  — the concept being transferred
 *     scenario:     string  — the novel scenario presented to the learner
 *   }
 *
 * Response (200):
 *   {
 *     score:         number  (0–1)
 *     feedback:      string  (learner-facing one-sentence feedback)
 *     rationale:     string  (brief explanation of the score)
 *     scoringMethod: 'claude' | 'fallback'
 *   }
 *
 * Errors:
 *   400 – validation failure
 *   500 – unexpected server error
 */
scoringRoutes.post('/transfer', authMiddleware, async (c) => {
  // ── 1. Parse and validate body ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Bad Request', message: 'Request body must be valid JSON' }, 400);
  }

  const parseResult = transferScoreSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400,
    );
  }

  const { userResponse, concept, scenario } = parseResult.data;

  // ── 2. Attempt Claude scoring; fall back to heuristic on any failure ───────
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!hasApiKey) {
    // No key configured — use fallback immediately, no Claude call needed
    const result = fallbackScore(userResponse);
    return c.json(result);
  }

  try {
    const result = await claudeScore(userResponse, concept, scenario);
    return c.json(result);
  } catch (err) {
    // Log the error but return a graceful fallback to the learner
    console.error('scoring/transfer: Claude API error, using fallback:', err);
    const result = fallbackScore(userResponse);
    return c.json(result);
  }
});
