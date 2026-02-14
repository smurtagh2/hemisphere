/**
 * Integration tests for JWT auth middleware and route guards.
 *
 * Strategy: spin up a lightweight in-process Hono app for each test group,
 * mock the @hemisphere/db module so we never touch a real database, and use
 * the real `jose` library to sign genuine JWTs — this means the token-
 * verification path is exercised for real, not faked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import {
  authMiddleware,
  requireRole,
  requireAuth,
  extractBearerToken,
  type AuthUser,
  type AppEnv,
} from './auth.js';

// ─── DB mock ──────────────────────────────────────────────────────────────────
// We mock the entire @hemisphere/db package so tests never need a live
// PostgreSQL connection. The `mockDbExec` function controls what the DB
// "returns" for individual tests.

const mockDbExec = vi.fn();

vi.mock('@hemisphere/db', () => {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: mockDbExec,
      })),
    })),
  }));

  return {
    db: { select },
    schema: {
      users: {
        id: 'id',
        email: 'email',
        displayName: 'display_name',
        role: 'role',
        isActive: 'is_active',
      },
    },
  };
});

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const SECRET = new TextEncoder().encode('hemisphere-dev-secret-change-in-production');

async function signToken(
  payload: Record<string, unknown>,
  expiresIn: string = '15m'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

const VALID_USER: AuthUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'learner',
};

// ─── Response body helper ─────────────────────────────────────────────────────

// res.json() returns `unknown` in strict TS; cast once here so tests stay concise.
async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

// ─── Test app factory ─────────────────────────────────────────────────────────

function makeApp() {
  const app = new Hono<AppEnv>();

  app.get('/protected', authMiddleware, (c) => {
    const user = c.get('user');
    return c.json({ ok: true, user });
  });

  app.get('/admin-only', authMiddleware, requireRole('admin'), (c) => {
    const user = c.get('user');
    return c.json({ ok: true, user });
  });

  app.get('/staff', authMiddleware, requireRole('admin', 'moderator'), (c) => {
    const user = c.get('user');
    return c.json({ ok: true, user });
  });

  app.use('/helper-auth', ...requireAuth());
  app.get('/helper-auth', (c) => {
    const user = c.get('user');
    return c.json({ ok: true, user });
  });

  app.use('/helper-admin', ...requireAuth('admin'));
  app.get('/helper-admin', (c) => {
    const user = c.get('user');
    return c.json({ ok: true, user });
  });

  return app;
}

// ─── extractBearerToken unit tests ───────────────────────────────────────────

describe('extractBearerToken', () => {
  it('returns null when header is undefined', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null when header is empty string', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null when header does not start with "Bearer "', () => {
    expect(extractBearerToken('Token abc123')).toBeNull();
    expect(extractBearerToken('bearer abc123')).toBeNull(); // case-sensitive
    expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
  });

  it('returns null when token part is empty after "Bearer "', () => {
    expect(extractBearerToken('Bearer ')).toBeNull();
    expect(extractBearerToken('Bearer    ')).toBeNull(); // only whitespace
  });

  it('returns the token string for a valid Bearer header', () => {
    expect(extractBearerToken('Bearer mytoken123')).toBe('mytoken123');
    expect(extractBearerToken('Bearer eyJhbGciOiJIUzI1NiJ9.abc.def')).toBe(
      'eyJhbGciOiJIUzI1NiJ9.abc.def'
    );
  });
});

// ─── authMiddleware tests ─────────────────────────────────────────────────────

describe('authMiddleware', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  // — missing / malformed header ——————————————————————————————————————————————

  it('returns 401 when Authorization header is absent', async () => {
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
    expect(String(body.message)).toMatch(/Missing or invalid Authorization header/);
  });

  it('returns 401 when Authorization header uses wrong scheme', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Token some-opaque-token' },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Bearer token is empty', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  });

  // — token verification errors ——————————————————————————————————————————————

  it('returns 401 with expired-specific message for an expired token', async () => {
    const token = await signToken(
      { userId: VALID_USER.id, email: VALID_USER.email, role: VALID_USER.role },
      '-1s'
    );
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(String(body.message)).toMatch(/expired/i);
  });

  it('returns 401 for a token with a tampered signature', async () => {
    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    // Corrupt the signature segment
    const parts = token.split('.');
    parts[2] = parts[2]!.split('').reverse().join('');
    const tampered = parts.join('.');

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${tampered}` },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 for a completely invalid (non-JWT) token string', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer not-a-jwt-at-all' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when JWT payload is missing required claims', async () => {
    const token = await signToken({ sub: 'user123' }); // missing userId / email / role
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(String(body.message)).toMatch(/missing required claims/i);
  });

  // — database validation ————————————————————————————————————————————————————

  it('returns 401 when user is not found in the database', async () => {
    mockDbExec.mockResolvedValueOnce([]); // empty result set

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(String(body.message)).toMatch(/not found or has been deactivated/i);
  });

  it('returns 401 when the user account is inactive', async () => {
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: false }]);

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(String(body.message)).toMatch(/deactivated/i);
  });

  it('returns 500 when the database throws an error', async () => {
    mockDbExec.mockRejectedValueOnce(new Error('DB connection lost'));

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe('Internal Server Error');
  });

  // — happy path ——————————————————————————————————————————————————————————————

  it('calls next and attaches user to context on success', async () => {
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: true }]);

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    const user = body.user as AuthUser;
    expect(user.id).toBe(VALID_USER.id);
    expect(user.email).toBe(VALID_USER.email);
    expect(user.role).toBe(VALID_USER.role);
  });

  it('does not expose passwordHash or other sensitive fields in context user', async () => {
    // DB row contains extra sensitive fields — middleware should strip them
    mockDbExec.mockResolvedValueOnce([
      {
        ...VALID_USER,
        isActive: true,
        passwordHash: '$2b$10$secrethash',
        lastLoginAt: new Date(),
      },
    ]);

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    const user = body.user as Record<string, unknown>;
    expect(user['passwordHash']).toBeUndefined();
    expect(user['lastLoginAt']).toBeUndefined();
  });
});

// ─── requireRole tests ────────────────────────────────────────────────────────

describe('requireRole', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  it('returns 401 when called without prior authMiddleware (no user in context)', async () => {
    // A bare app where requireRole is applied without authMiddleware
    const bareApp = new Hono<AppEnv>();
    bareApp.get('/role-only', requireRole('admin'), (c) => c.json({ ok: true }));

    const res = await bareApp.request('/role-only');
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
    expect(String(body.message)).toMatch(/Authentication required/);
  });

  it('returns 403 when user does not have the required role', async () => {
    // VALID_USER has role "learner" — admin route should be forbidden
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: true }]);

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/admin-only', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toBe('Forbidden');
    expect(String(body.message)).toMatch(/admin/);
  });

  it('allows access when the user has a role in the allowed list (single role)', async () => {
    const adminUser = { ...VALID_USER, role: 'admin' };
    mockDbExec.mockResolvedValueOnce([{ ...adminUser, isActive: true }]);

    const token = await signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    const res = await app.request('/admin-only', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
  });

  it('allows access when the user has one of multiple allowed roles', async () => {
    const moderator = { ...VALID_USER, role: 'moderator' };
    mockDbExec.mockResolvedValueOnce([{ ...moderator, isActive: true }]);

    const token = await signToken({
      userId: moderator.id,
      email: moderator.email,
      role: moderator.role,
    });
    const res = await app.request('/staff', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('denies access when user role is not in the multi-role allowed list', async () => {
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: true }]); // role=learner

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/staff', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(String(body.message)).toMatch(/admin.*moderator|moderator.*admin/);
  });
});

// ─── requireAuth helper tests ─────────────────────────────────────────────────

describe('requireAuth helper', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated request on requireAuth() route', async () => {
    const res = await app.request('/helper-auth');
    expect(res.status).toBe(401);
  });

  it('allows authenticated user through requireAuth() with no role restriction', async () => {
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: true }]);

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/helper-auth', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
  });

  it('returns 403 for a learner hitting a requireAuth("admin") route', async () => {
    mockDbExec.mockResolvedValueOnce([{ ...VALID_USER, isActive: true }]); // role=learner

    const token = await signToken({
      userId: VALID_USER.id,
      email: VALID_USER.email,
      role: VALID_USER.role,
    });
    const res = await app.request('/helper-admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('allows an admin through requireAuth("admin") route', async () => {
    const adminUser = { ...VALID_USER, role: 'admin' };
    mockDbExec.mockResolvedValueOnce([{ ...adminUser, isActive: true }]);

    const token = await signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    const res = await app.request('/helper-admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('requireAuth() returns an array with authMiddleware as the first element', () => {
    const guards = requireAuth();
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(authMiddleware);
  });

  it('requireAuth("admin") returns an array with authMiddleware and a role guard', () => {
    const guards = requireAuth('admin');
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(authMiddleware);
    expect(typeof guards[1]).toBe('function');
  });
});
