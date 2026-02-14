/**
 * Hemisphere API Client
 *
 * Typed wrapper for all backend API calls. The API runs on localhost:3001
 * during development. JWT tokens are stored in localStorage under the key
 * "hemisphere_token".
 */

import {
  getCurrentRetrievability,
  type FsrsCard,
  type FsrsCardState,
} from '@hemisphere/shared';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'hemisphere_token';
const USER_KEY = 'hemisphere_user';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON regardless of status to surface error messages
  let data: unknown;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const err = data as { code?: string; message?: string; error?: string };
    throw new ApiError(
      res.status,
      err.code ?? 'UNKNOWN_ERROR',
      err.message ?? err.error ?? `HTTP ${res.status}`,
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth types & calls
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  setToken(res.token);
  setStoredUser(res.user);
  return res;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  setToken(res.token);
  setStoredUser(res.user);
  return res;
}

export function logout(): void {
  removeToken();
}

// ---------------------------------------------------------------------------
// Session types & calls
// ---------------------------------------------------------------------------

export interface ActiveSessionInfo {
  sessionId: string | null;
  dueReviewCount: number;
  nextTopicId: string | null;
  nextTopicTitle: string | null;
}

export type SessionLoopType = 'quick' | 'standard' | 'extended';

export interface SessionStartPayload {
  topicId: string;
  sessionType?: SessionLoopType;
}

export interface SessionRecord {
  id: string;
  topicId: string;
  topicTitle: string;
  sessionType?: SessionLoopType;
  startedAt: string;
  completedAt: string | null;
  accuracy: number | null;
  itemCount: number;
}

export interface SessionCompletePayload {
  sessionId: string;
  accuracy: number;
  itemsCompleted: number;
  anchorText?: string;
}

export interface SessionCompleteResult {
  sessionId: string;
  accuracy: number;
  itemsCompleted: number;
  reviewsScheduled: number;
  nextReviewAt: string | null;
}

export async function getActiveSession(): Promise<ActiveSessionInfo> {
  return request<ActiveSessionInfo>('/api/session/active');
}

export async function startSession(
  payload: SessionStartPayload,
): Promise<SessionRecord> {
  return request<SessionRecord>('/api/session/start', {
    method: 'POST',
    body: payload,
  });
}

export async function getSession(sessionId: string): Promise<SessionRecord> {
  return request<SessionRecord>(`/api/session/${sessionId}`);
}

export async function completeSession(
  payload: SessionCompletePayload,
): Promise<SessionCompleteResult> {
  return request<SessionCompleteResult>('/api/session/complete', {
    method: 'POST',
    body: payload,
  });
}

export async function listSessions(): Promise<SessionRecord[]> {
  return request<SessionRecord[]>('/api/session/list');
}

// ---------------------------------------------------------------------------
// Topic types & calls
// ---------------------------------------------------------------------------

export interface Topic {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export async function listTopics(): Promise<Topic[]> {
  return request<Topic[]>('/api/topics');
}

// ---------------------------------------------------------------------------
// Review queue types & calls
// ---------------------------------------------------------------------------

export interface ReviewQueueItem {
  itemId: string;
  kcId: string;
  dueDate: string;
  retrievability: number;
  overdueDays: number;
  isNew: boolean;
  priority: number;
}

export interface ReviewQueueMeta {
  total: number;
  newCount: number;
  dueCount: number;
  generatedAt: string;
}

export interface ReviewQueueResponse {
  queue: ReviewQueueItem[];
  meta: ReviewQueueMeta;
}

type DueReviewState = {
  itemId: string;
  kcId: string;
  stability: number;
  difficulty: number;
  retrievability: number;
  state: string;
  nextReview: string | null;
  lastReview: string | null;
  reviewCount: number;
  lapseCount: number;
};

interface DueReviewsResponse {
  dueReviews: DueReviewState[];
}

interface CachedReviewState {
  itemId: string;
  kcId: string;
  stability: number;
  difficulty: number;
  retrievability: number;
  state: FsrsCardState;
  nextReview: string | null;
  lastReview: string | null;
  reviewCount: number;
  lapseCount: number;
}

interface CachedReviewQueueState {
  generatedAt: string;
  items: CachedReviewState[];
}

const REVIEW_QUEUE_CACHE_KEY = 'hemisphere:review:fsrs-state:v1';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function isFsrsCardState(value: string): value is FsrsCardState {
  return value === 'new' || value === 'learning' || value === 'review' || value === 'relearning';
}

function toCachedReviewState(items: DueReviewState[]): CachedReviewState[] {
  return items
    .map((item) => {
      if (!isFsrsCardState(item.state)) return null;
      return {
        itemId: item.itemId,
        kcId: item.kcId,
        stability: item.stability,
        difficulty: item.difficulty,
        retrievability: item.retrievability,
        state: item.state,
        nextReview: item.nextReview,
        lastReview: item.lastReview,
        reviewCount: item.reviewCount,
        lapseCount: item.lapseCount,
      };
    })
    .filter((item): item is CachedReviewState => item !== null);
}

function saveCachedReviewQueueState(items: DueReviewState[]): void {
  if (typeof window === 'undefined') return;

  try {
    const snapshot: CachedReviewQueueState = {
      generatedAt: new Date().toISOString(),
      items: toCachedReviewState(items),
    };
    localStorage.setItem(REVIEW_QUEUE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort cache; ignore storage failures.
  }
}

function loadCachedReviewQueueState(): CachedReviewQueueState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(REVIEW_QUEUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedReviewQueueState;
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.generatedAt !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildClientReviewQueue(
  items: CachedReviewState[],
  limit?: number,
  now: Date = new Date()
): ReviewQueueResponse {
  const MAX_LIMIT = 50;
  const requestedLimit = limit ?? 20;
  const effectiveLimit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

  const candidates = items
    .map((item) => {
      const lastReviewDate = item.lastReview ? new Date(item.lastReview) : null;
      const nextReviewDate = item.nextReview ? new Date(item.nextReview) : null;
      const card: FsrsCard = {
        stability: item.stability,
        difficulty: item.difficulty,
        retrievability: item.retrievability,
        state: item.state,
        lastReview: lastReviewDate,
        reviewCount: item.reviewCount,
        lapseCount: item.lapseCount,
      };

      const liveRetrievability = clamp01(getCurrentRetrievability(card, now));
      const isNew = card.state === 'new' || nextReviewDate === null;
      const dueDate = nextReviewDate ?? now;
      const due = isNew || dueDate.getTime() <= now.getTime();
      if (!due) return null;

      const overdueDays = isNew
        ? 0
        : Math.max(0, (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const priority = overdueDays * 10 + (1 - liveRetrievability) * 5 + (isNew ? 1 : 0);

      return {
        itemId: item.itemId,
        kcId: item.kcId,
        dueDate: dueDate.toISOString(),
        retrievability: liveRetrievability,
        overdueDays,
        isNew,
        priority,
      } satisfies ReviewQueueItem;
    })
    .filter((item): item is ReviewQueueItem => item !== null)
    .sort((a, b) => b.priority - a.priority);

  const queue = candidates.slice(0, effectiveLimit);
  const newCount = candidates.filter((item) => item.isNew).length;

  return {
    queue,
    meta: {
      total: candidates.length,
      newCount,
      dueCount: candidates.length - newCount,
      generatedAt: now.toISOString(),
    },
  };
}

export async function getReviewQueue(limit?: number): Promise<ReviewQueueResponse> {
  try {
    const response = await request<DueReviewsResponse>('/api/learner/due-reviews');
    saveCachedReviewQueueState(response.dueReviews);
    return buildClientReviewQueue(toCachedReviewState(response.dueReviews), limit);
  } catch (err) {
    const cached = loadCachedReviewQueueState();
    if (cached && (typeof navigator === 'undefined' || navigator.onLine === false)) {
      return buildClientReviewQueue(cached.items, limit);
    }

    // Fallback for environments where /due-reviews is unavailable.
    const path = limit !== undefined
      ? `/api/review/queue?limit=${encodeURIComponent(limit)}`
      : '/api/review/queue';

    try {
      return await request<ReviewQueueResponse>(path);
    } catch (secondaryErr) {
      if (cached) {
        return buildClientReviewQueue(cached.items, limit);
      }
      throw secondaryErr instanceof Error ? secondaryErr : err;
    }
  }
}

// ---------------------------------------------------------------------------
// Scoring types & calls
// ---------------------------------------------------------------------------

export interface TransferScorePayload {
  sessionId: string;
  userResponse: string;
  concept: string;
  scenario: string;
}

export interface TransferScoreResult {
  score: number;
  feedback: string;
  rationale: string;
  scoringMethod: 'claude' | 'fallback';
}

export async function scoreTransferChallenge(
  payload: TransferScorePayload,
): Promise<TransferScoreResult> {
  return request<TransferScoreResult>('/api/scoring/transfer', {
    method: 'POST',
    body: payload,
  });
}
