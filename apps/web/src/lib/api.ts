/**
 * Hemisphere API Client
 *
 * Typed wrapper for all backend API calls. The API runs on localhost:3001
 * during development. JWT tokens are stored in localStorage under the key
 * "hemisphere_token".
 */

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

export async function getReviewQueue(limit?: number): Promise<ReviewQueueResponse> {
  const path = limit !== undefined
    ? `/api/review/queue?limit=${encodeURIComponent(limit)}`
    : '/api/review/queue';
  return request<ReviewQueueResponse>(path);
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
