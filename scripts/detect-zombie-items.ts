#!/usr/bin/env tsx
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../packages/db/src/index.js';
import {
  computeZombieScore,
  isZombieItem,
  selectRemediationType,
  type ZombieDetectionSignals,
} from '../packages/shared/src/index.js';

interface CliOptions {
  dryRun: boolean;
  threshold: number;
  minReviews: number;
  limit: number | null;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let threshold = 0.5;
  let minReviews = 8;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--threshold=')) {
      const parsed = Number(arg.slice('--threshold='.length));
      if (Number.isFinite(parsed)) threshold = Math.max(0, Math.min(1, parsed));
      continue;
    }
    if (arg.startsWith('--min-reviews=')) {
      const parsed = Number(arg.slice('--min-reviews='.length));
      if (Number.isFinite(parsed) && parsed >= 1) minReviews = Math.floor(parsed);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (Number.isFinite(parsed) && parsed >= 1) limit = Math.floor(parsed);
    }
  }

  return { dryRun, threshold, minReviews, limit };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function responseLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const now = new Date();

  const candidatesRaw = await db
    .select({
      userId: schema.fsrsMemoryState.userId,
      itemId: schema.fsrsMemoryState.itemId,
      kcId: schema.fsrsMemoryState.kcId,
      reviewCount: schema.fsrsMemoryState.reviewCount,
      state: schema.fsrsMemoryState.state,
    })
    .from(schema.fsrsMemoryState)
    .where(eq(schema.fsrsMemoryState.state, 'review'));

  const candidates = candidatesRaw
    .filter((row) => row.reviewCount >= options.minReviews && row.state === 'review')
    .slice(0, options.limit ?? undefined);

  if (candidates.length === 0) {
    console.log(
      `[detect-zombies] No candidate items (minReviews=${options.minReviews}, limit=${options.limit ?? 'all'}).`
    );
    return;
  }

  const activeQueueRows = await db
    .select({
      id: schema.remediationQueue.id,
      userId: schema.remediationQueue.userId,
      itemId: schema.remediationQueue.itemId,
      status: schema.remediationQueue.status,
    })
    .from(schema.remediationQueue)
    .where(eq(schema.remediationQueue.detectionType, 'zombie_item'));
  const activeQueueByKey = new Map(
    activeQueueRows.map((row) => [`${row.userId}:${row.itemId}`, row] as const)
  );

  const userLatencyCache = new Map<string, number[]>();
  const kcStateCache = new Map<string, {
    lhAccuracy: number;
    rhScore: number;
    difficultyTier: number;
  } | null>();

  let flagged = 0;
  let dismissed = 0;

  for (const candidate of candidates) {
    const key = `${candidate.userId}:${candidate.itemId}`;

    const kcCacheKey = `${candidate.userId}:${candidate.kcId}`;
    let kcState = kcStateCache.get(kcCacheKey);
    if (kcState === undefined) {
      const [kcRow] = await db
        .select({
          lhAccuracy: schema.learnerKcState.lhAccuracy,
          rhScore: schema.learnerKcState.rhScore,
          difficultyTier: schema.learnerKcState.difficultyTier,
        })
        .from(schema.learnerKcState)
        .where(
          and(
            eq(schema.learnerKcState.userId, candidate.userId),
            eq(schema.learnerKcState.kcId, candidate.kcId)
          )
        )
        .limit(1);
      kcState = kcRow ?? null;
      kcStateCache.set(kcCacheKey, kcState);
    }
    if (!kcState) continue;

    const itemEvents = await db
      .select({
        responseType: schema.assessmentEvents.responseType,
        isCorrect: schema.assessmentEvents.isCorrect,
        score: schema.assessmentEvents.score,
        latencyMs: schema.assessmentEvents.latencyMs,
        learnerResponse: schema.assessmentEvents.learnerResponse,
      })
      .from(schema.assessmentEvents)
      .where(
        and(
          eq(schema.assessmentEvents.userId, candidate.userId),
          eq(schema.assessmentEvents.contentItemId, candidate.itemId)
        )
      );

    const signals: ZombieDetectionSignals = {
      lhRhDivergence: kcState.lhAccuracy >= 0.8 && kcState.rhScore < 0.4,
      formatDependence: false,
      speedWithoutDepth: false,
      stalledDifficulty:
        candidate.reviewCount >= 8 && kcState.difficultyTier <= 2 && kcState.lhAccuracy >= 0.75,
    };

    const typeStats = new Map<string, { attempts: number; correct: number }>();
    for (const event of itemEvents) {
      if (event.isCorrect === null) continue;
      const current = typeStats.get(event.responseType) ?? { attempts: 0, correct: 0 };
      current.attempts += 1;
      if (event.isCorrect) current.correct += 1;
      typeStats.set(event.responseType, current);
    }
    if (typeStats.size >= 2) {
      const ranked = [...typeStats.entries()].sort((a, b) => b[1].attempts - a[1].attempts);
      const [primaryType, primaryStats] = ranked[0];
      const primaryAccuracy =
        primaryStats.attempts > 0 ? primaryStats.correct / primaryStats.attempts : 0;
      const alternativeWeak = ranked
        .filter(([type, stats]) => type !== primaryType && stats.attempts >= 2)
        .some(([, stats]) => stats.correct / stats.attempts < 0.5);

      signals.formatDependence = primaryAccuracy >= 0.8 && alternativeWeak;
    }

    let userLatencies = userLatencyCache.get(candidate.userId);
    if (!userLatencies) {
      const rows = await db
        .select({ latencyMs: schema.assessmentEvents.latencyMs })
        .from(schema.assessmentEvents)
        .where(eq(schema.assessmentEvents.userId, candidate.userId));
      userLatencies = rows.map((row) => row.latencyMs);
      userLatencyCache.set(candidate.userId, userLatencies);
    }

    const itemLatencies = itemEvents.map((event) => event.latencyMs);
    const avgItemLatency =
      itemLatencies.length > 0
        ? itemLatencies.reduce((sum, value) => sum + value, 0) / itemLatencies.length
        : 0;
    const latencyP25 = percentile(userLatencies, 0.25);

    const elaborationEvents = itemEvents.filter((event) => event.responseType === 'free_text');
    const elaborationScoreAvg =
      elaborationEvents.length > 0
        ? elaborationEvents.reduce((sum, event) => sum + (event.score ?? 0), 0) /
          elaborationEvents.length
        : 1;
    const elaborationLengthAvg =
      elaborationEvents.length > 0
        ? elaborationEvents.reduce((sum, event) => sum + responseLength(event.learnerResponse), 0) /
          elaborationEvents.length
        : 100;
    const lowDepth = elaborationScoreAvg < 0.5 || elaborationLengthAvg < 40;
    signals.speedWithoutDepth = avgItemLatency > 0 && avgItemLatency < latencyP25 && lowDepth;

    const zombieScore = computeZombieScore(signals);
    const zombie = isZombieItem(signals, options.threshold);

    if (!zombie) {
      const existing = activeQueueByKey.get(key);
      if (
        existing &&
        (existing.status === 'pending' || existing.status === 'in_progress') &&
        !options.dryRun
      ) {
        await db
          .update(schema.remediationQueue)
          .set({
            status: 'dismissed',
            resolvedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.remediationQueue.id, existing.id));
        dismissed += 1;
      }
      continue;
    }

    const remediationType = selectRemediationType(signals);

    if (options.dryRun) {
      console.log(
        `[dry-run] zombie user=${candidate.userId} item=${candidate.itemId} score=${zombieScore.toFixed(2)} remediation=${remediationType}`
      );
      flagged += 1;
      continue;
    }

    await db
      .insert(schema.remediationQueue)
      .values({
        userId: candidate.userId,
        itemId: candidate.itemId,
        kcId: candidate.kcId,
        detectionType: 'zombie_item',
        zombieScore,
        signals,
        remediationType,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      })
      .onConflictDoUpdate({
        target: [
          schema.remediationQueue.userId,
          schema.remediationQueue.itemId,
          schema.remediationQueue.detectionType,
        ],
        set: {
          zombieScore,
          signals,
          remediationType,
          status: 'pending',
          resolvedAt: null,
          updatedAt: now,
        },
      });

    flagged += 1;
  }

  console.log(
    `[detect-zombies] scanned=${candidates.length} flagged=${flagged} dismissed=${dismissed} dryRun=${options.dryRun}`
  );
}

run().catch((err) => {
  console.error('[detect-zombies] Failed:', err);
  process.exitCode = 1;
});
