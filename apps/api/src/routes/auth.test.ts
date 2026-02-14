/**
 * Integration tests for auth routes: POST /api/auth/signup, /login, /refresh,
 * /logout and GET /api/auth/verify.
 *
 * Strategy:
 * - Mount authRoutes directly under /api/auth on a lightweight Hono app.
 * - Mock @hemisphere/db entirely with vi.mock() — no live database required.
 * - Mock bcrypt so we avoid the native binary dependency in test environments.
 * - Use the real `jose` library so JWT signing/verification is genuine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { authRoutes } from './auth.js';

// ─── Hoisted mock handles ─────────────────────────────────────────────────────
//
// vi.mock() factories are hoisted to the top of the compiled output, which means
// they execute before any `const` declarations in this file.  We use vi.hoisted()
// to create the mock functions inside the hoisting boundary so they are ready
// when the factory closures run.

const { mockBcryptCompare, mockBcryptHash, mockSelect, mockInsert, mockUpdate } = vi.hoisted(
  () => ({
    mockBcryptCompare: vi.fn(),
    mockBcryptHash: vi.fn(),
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
  })
);

// ─── bcrypt mock ──────────────────────────────────────────────────────────────
//
// The native bcrypt binding may not be available in all CI/test environments.
// We mock the module so tests never touch the native binary.

vi.mock('bcrypt', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));

// ─── DB mock infrastructure ───────────────────────────────────────────────────
//
// The auth routes call three distinct Drizzle patterns:
//
//   1. db.select().from().where().limit()       — SELECT queries
//   2. db.insert().values().returning()         — INSERT
//   3. db.update().set().where()                — UPDATE (fire-and-forget)
//
// We expose one mock function per operation type and route each call there via
// a thin builder-chain proxy.  Tests override return values with mockResolvedValueOnce.

vi.mock('@hemisphere/db', () => {
  // SELECT builder: .select().from().where().limit()
  const buildSelect = () => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: mockSelect,
      })),
    })),
  });

  // INSERT builder: .insert().values().returning()
  const buildInsert = () => ({
    values: vi.fn(() => ({
      returning: mockInsert,
    })),
  });

  // UPDATE builder: .update().set().where()
  const buildUpdate = () => ({
    set: vi.fn(() => ({
      where: mockUpdate,
    })),
  });

  return {
    db: {
      select: vi.fn(buildSelect),
      insert: vi.fn(buildInsert),
      update: vi.fn(buildUpdate),
    },
    schema: {
      users: {
        id: 'id',
        email: 'email',
        displayName: 'display_name',
        role: 'role',
        isActive: 'is_active',
        passwordHash: 'password_hash',
        avatarUrl: 'avatar_url',
        timezone: 'timezone',
        lastLoginAt: 'last_login_at',
      },
      refreshTokens: {
        id: 'id',
        userId: 'user_id',
        token: 'token',
        expiresAt: 'expires_at',
        revokedAt: 'revoked_at',
        replacedBy: 'replaced_by',
      },
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = new TextEncoder().encode('hemisphere-dev-secret-change-in-production');

async function signAccessToken(
  payload: Record<string, unknown>,
  expiresIn: string = '15m'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

/** POST helper that sends JSON with the correct Content-Type. */
function post(app: Hono, path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** GET helper with optional Bearer token. */
function get(app: Hono, path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return app.request(path, { method: 'GET', headers });
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PASSWORD = 'correct-horse-battery';
// A sentinel hash value stored in mock DB rows. bcrypt.hash/compare are mocked
// so the real hashing algorithm is never invoked.
const PASSWORD_HASH = '$2b$10$mockedhashvalue_for_tests_only';

const BASE_USER = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'learner' as const,
  avatarUrl: null as string | null,
  timezone: 'UTC',
  lastLoginAt: null as Date | null,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const BASE_REFRESH_TOKEN = {
  id: 'rt-uuid-1',
  userId: BASE_USER.id,
  token: 'valid-refresh-token-hex',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  createdAt: new Date(),
  revokedAt: null as Date | null,
  replacedBy: null as string | null,
};

// ─── App factory ──────────────────────────────────────────────────────────────

function makeApp(): Hono {
  const app = new Hono();
  app.route('/api/auth', authRoutes);
  return app;
}

// ─── Module-level setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: UPDATE calls succeed silently.
  mockUpdate.mockResolvedValue([]);
  // Default: bcrypt.hash returns the sentinel hash.
  mockBcryptHash.mockResolvedValue(PASSWORD_HASH);
  // Default: bcrypt.compare returns false (override in tests that need true).
  mockBcryptCompare.mockResolvedValue(false);
});

// =============================================================================
// POST /api/auth/signup
// =============================================================================

describe('POST /api/auth/signup', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  it('201 – creates user and returns tokens on valid input', async () => {
    // No existing user found.
    mockSelect.mockResolvedValueOnce([]);
    // Insert returns the new user row.
    mockInsert.mockResolvedValueOnce([
      {
        id: BASE_USER.id,
        email: BASE_USER.email,
        displayName: BASE_USER.displayName,
        role: BASE_USER.role,
        createdAt: BASE_USER.createdAt,
      },
    ]);
    // Insert refresh token (insert().values().returning() called with no returning columns).
    mockInsert.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/signup', {
      email: BASE_USER.email,
      password: PASSWORD,
      displayName: BASE_USER.displayName,
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.message).toBe('User created successfully');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    const user = body.user as Record<string, unknown>;
    expect(user.email).toBe(BASE_USER.email);
    expect(user.id).toBe(BASE_USER.id);
    // Sensitive fields must never be exposed
    expect(user['passwordHash']).toBeUndefined();
  });

  it('409 – rejects duplicate email', async () => {
    // Existing user found for this email.
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER, passwordHash: PASSWORD_HASH }]);

    const res = await post(app, '/api/auth/signup', {
      email: BASE_USER.email,
      password: PASSWORD,
      displayName: 'New Alice',
    });

    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error).toBe('User already exists');
  });

  it('400 – rejects an invalid email address', async () => {
    const res = await post(app, '/api/auth/signup', {
      email: 'not-an-email',
      password: PASSWORD,
      displayName: BASE_USER.displayName,
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
    const details = body.details as Array<{ field: string; message: string }>;
    expect(details.some((d) => d.field === 'email')).toBe(true);
  });

  it('400 – rejects a password shorter than 8 characters', async () => {
    const res = await post(app, '/api/auth/signup', {
      email: BASE_USER.email,
      password: 'short',
      displayName: BASE_USER.displayName,
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
    const details = body.details as Array<{ field: string; message: string }>;
    expect(details.some((d) => d.field === 'password')).toBe(true);
  });

  it('400 – rejects request with missing required fields', async () => {
    const res = await post(app, '/api/auth/signup', {
      email: BASE_USER.email,
      // password and displayName omitted
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
  });

  it('400 – rejects malformed JSON body', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is not valid json',
    });

    // Route catches the JSON parse error → 500 from the try/catch, or Hono may
    // return 400; either way it must not be 2xx.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// =============================================================================
// POST /api/auth/login
// =============================================================================

describe('POST /api/auth/login', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  it('200 – returns tokens and user on valid credentials', async () => {
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER, passwordHash: PASSWORD_HASH }]);
    mockBcryptCompare.mockResolvedValueOnce(true); // correct password
    // Update lastLoginAt
    mockUpdate.mockResolvedValueOnce([]);
    // Insert refresh token
    mockInsert.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/login', {
      email: BASE_USER.email,
      password: PASSWORD,
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBe('Login successful');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    const user = body.user as Record<string, unknown>;
    expect(user.email).toBe(BASE_USER.email);
    expect(user['passwordHash']).toBeUndefined();
  });

  it('401 – rejects wrong password', async () => {
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER, passwordHash: PASSWORD_HASH }]);

    const res = await post(app, '/api/auth/login', {
      email: BASE_USER.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Authentication failed');
    expect(String(body.message)).toMatch(/Invalid email or password/);
  });

  it('401 – rejects non-existent user', async () => {
    mockSelect.mockResolvedValueOnce([]); // no user found

    const res = await post(app, '/api/auth/login', {
      email: 'ghost@example.com',
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Authentication failed');
  });

  it('403 – rejects inactive user before checking password', async () => {
    mockSelect.mockResolvedValueOnce([
      { ...BASE_USER, passwordHash: PASSWORD_HASH, isActive: false },
    ]);

    const res = await post(app, '/api/auth/login', {
      email: BASE_USER.email,
      password: PASSWORD,
    });

    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toBe('Account disabled');
  });

  it('400 – rejects invalid email format', async () => {
    const res = await post(app, '/api/auth/login', {
      email: 'not-valid',
      password: PASSWORD,
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
  });

  it('400 – rejects missing fields', async () => {
    const res = await post(app, '/api/auth/login', {});

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
  });

  it('400 – rejects malformed JSON body', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json at all',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// =============================================================================
// POST /api/auth/refresh
// =============================================================================

describe('POST /api/auth/refresh', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  it('200 – issues new token pair and rotates the old refresh token', async () => {
    // 1st select: fetch the refresh token record
    mockSelect.mockResolvedValueOnce([{ ...BASE_REFRESH_TOKEN }]);
    // 2nd select: fetch the user
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER }]);
    // 1st insert: new refresh token persisted
    mockInsert.mockResolvedValueOnce([]);
    // 1st update: old token revoked
    mockUpdate.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/refresh', {
      refreshToken: BASE_REFRESH_TOKEN.token,
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBe('Token refreshed successfully');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    // The new refresh token must differ from the original
    expect(body.refreshToken).not.toBe(BASE_REFRESH_TOKEN.token);
  });

  it('401 – rejects an unknown / never-issued refresh token', async () => {
    mockSelect.mockResolvedValueOnce([]); // token not found

    const res = await post(app, '/api/auth/refresh', {
      refreshToken: 'completely-made-up-token',
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
    expect(String(body.message)).toMatch(/not found/i);
  });

  it('401 – detects token reuse and revokes all tokens for the user', async () => {
    // Token was already revoked (revokedAt is set)
    mockSelect.mockResolvedValueOnce([
      { ...BASE_REFRESH_TOKEN, revokedAt: new Date('2025-06-01T00:00:00Z') },
    ]);
    // The mass-revocation update call
    mockUpdate.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/refresh', {
      refreshToken: BASE_REFRESH_TOKEN.token,
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Token reuse detected');
    expect(String(body.message)).toMatch(/revoked/i);
  });

  it('401 – rejects an expired refresh token', async () => {
    // expiresAt is in the past
    mockSelect.mockResolvedValueOnce([
      {
        ...BASE_REFRESH_TOKEN,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
        revokedAt: null,
      },
    ]);

    const res = await post(app, '/api/auth/refresh', {
      refreshToken: BASE_REFRESH_TOKEN.token,
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Token expired');
    expect(String(body.message)).toMatch(/expired/i);
  });

  it('400 – rejects missing refreshToken field', async () => {
    const res = await post(app, '/api/auth/refresh', {});

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
  });

  it('400 – rejects malformed JSON body', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ bad json',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// =============================================================================
// POST /api/auth/logout
// =============================================================================

describe('POST /api/auth/logout', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  it('200 – revokes the refresh token and confirms logout', async () => {
    mockSelect.mockResolvedValueOnce([{ ...BASE_REFRESH_TOKEN }]);
    mockUpdate.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/logout', {
      refreshToken: BASE_REFRESH_TOKEN.token,
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBe('Logged out successfully');
  });

  it('200 – succeeds silently for an unknown / already-invalidated token (idempotent)', async () => {
    // Token not found — route should still return success.
    mockSelect.mockResolvedValueOnce([]);

    const res = await post(app, '/api/auth/logout', {
      refreshToken: 'unknown-token-value',
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBe('Logged out successfully');
  });

  it('200 – succeeds silently when token is already revoked (idempotent)', async () => {
    // Token found but already revoked — update must NOT be called again.
    mockSelect.mockResolvedValueOnce([
      { ...BASE_REFRESH_TOKEN, revokedAt: new Date('2025-06-01T00:00:00Z') },
    ]);

    const res = await post(app, '/api/auth/logout', {
      refreshToken: BASE_REFRESH_TOKEN.token,
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBe('Logged out successfully');
    // The update mock should NOT have been called for an already-revoked token.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('400 – rejects missing refreshToken field', async () => {
    const res = await post(app, '/api/auth/logout', {});

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
  });

  it('400 – rejects malformed JSON body', async () => {
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '<<< invalid',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// =============================================================================
// GET /api/auth/verify
// =============================================================================

describe('GET /api/auth/verify', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  it('200 – returns user info for a valid, non-expired access token', async () => {
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER }]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/auth/verify', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.valid).toBe(true);
    const user = body.user as Record<string, unknown>;
    expect(user.id).toBe(BASE_USER.id);
    expect(user.email).toBe(BASE_USER.email);
    expect(user['passwordHash']).toBeUndefined();
  });

  it('401 – rejects an expired access token', async () => {
    // Sign a token that expired 1 second ago.
    const token = await signAccessToken(
      { userId: BASE_USER.id, email: BASE_USER.email, role: BASE_USER.role },
      '-1s'
    );

    const res = await get(app, '/api/auth/verify', token);

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
  });

  it('401 – rejects a token with a tampered signature', async () => {
    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    // Flip the signature segment
    const parts = token.split('.');
    parts[2] = parts[2]!.split('').reverse().join('');
    const tampered = parts.join('.');

    const res = await get(app, '/api/auth/verify', tampered);

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
  });

  it('401 – rejects when no Authorization header is provided', async () => {
    const res = await get(app, '/api/auth/verify');

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Missing token');
  });

  it('401 – rejects when the user no longer exists in the database', async () => {
    mockSelect.mockResolvedValueOnce([]); // user deleted from DB

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/auth/verify', token);

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
  });

  it('401 – rejects when the user account is inactive', async () => {
    mockSelect.mockResolvedValueOnce([{ ...BASE_USER, isActive: false }]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/auth/verify', token);

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
  });

  it('401 – rejects a completely non-JWT token string', async () => {
    const res = await get(app, '/api/auth/verify', 'this-is-not-a-jwt');

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Invalid token');
  });
});
