import { Context, Next, MiddlewareHandler } from 'hono';
import { jwtVerify, errors as joseErrors } from 'jose';
import { db, schema } from '@hemisphere/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hemisphere-dev-secret-change-in-production'
);

/**
 * Shape of the user object attached to context by authMiddleware.
 * Access via `c.get('user')` in protected route handlers.
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

/**
 * Hono environment type.  Declare the `Variables` map so that
 * `c.get('user')` and `c.set('user', …)` are fully type-safe.
 */
export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * Extract a Bearer token from an Authorization header value.
 * Returns the raw token string, or null if the header is absent or malformed.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * authMiddleware — validates the JWT access token and attaches the user to context.
 *
 * Handles distinct failure cases with appropriate HTTP responses:
 *   • Missing / malformed Authorization header → 401 (no token)
 *   • Expired token                            → 401 (token expired)
 *   • Invalid signature / other JWT error      → 401 (invalid token)
 *   • Valid token but user not found / inactive → 401 (user inactive)
 *
 * On success the handler can call `c.get('user')` to retrieve the AuthUser.
 *
 * Usage:
 *   app.get('/protected', authMiddleware, handler);
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (
  c: Context<AppEnv>,
  next: Next
) => {
  const token = extractBearerToken(c.req.header('Authorization'));

  if (!token) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
      },
      401
    );
  }

  let userId: string;
  let email: string;
  let role: string;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // All three claims are required in access tokens
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Token payload is missing required claims',
        },
        401
      );
    }

    userId = payload.userId;
    email = payload.email;
    role = payload.role;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Token has expired. Please refresh your access token.',
        },
        401
      );
    }

    if (
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWSInvalid ||
      err instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Token signature is invalid',
        },
        401
      );
    }

    // Unknown JWT / crypto error
    console.error('authMiddleware: unexpected JWT error:', err);
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Token validation failed',
      },
      401
    );
  }

  // Verify the user still exists and is active in the database
  let user: AuthUser;

  try {
    const [row] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        role: schema.users.role,
        isActive: schema.users.isActive,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!row || !row.isActive) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'User account not found or has been deactivated',
        },
        401
      );
    }

    user = { id: row.id, email: row.email, displayName: row.displayName, role: row.role };
  } catch (err) {
    console.error('authMiddleware: database lookup error:', err);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred while validating credentials',
      },
      500
    );
  }

  // Attach user context — available via c.get('user') in downstream handlers
  c.set('user', user);

  // Sanity check: email / role in token should match the database record.
  // Log a warning if they diverge (token was issued before a role change, etc.)
  if (user.email !== email || user.role !== role) {
    console.warn(
      `authMiddleware: token claims (email=${email}, role=${role}) differ from DB ` +
        `(email=${user.email}, role=${user.role}) for userId=${userId}`
    );
  }

  await next();
};

/**
 * requireRole — role-based authorization guard.
 * Must be applied after authMiddleware (relies on `c.get('user')`).
 *
 * Usage:
 *   app.get('/admin', authMiddleware, requireRole('admin'), handler);
 *   app.get('/staff', authMiddleware, requireRole('admin', 'moderator'), handler);
 */
export function requireRole(...allowedRoles: string[]): MiddlewareHandler<AppEnv> {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * requireAuth — convenience helper: returns an array of middleware that
 * combines authMiddleware with an optional requireRole guard.
 *
 * Usage:
 *   // Authentication only:
 *   app.get('/me', ...requireAuth(), handler);
 *
 *   // Authentication + role check:
 *   app.get('/admin', ...requireAuth('admin'), handler);
 */
export function requireAuth(...roles: string[]): MiddlewareHandler<AppEnv>[] {
  const guards: MiddlewareHandler<AppEnv>[] = [authMiddleware];
  if (roles.length > 0) {
    guards.push(requireRole(...roles));
  }
  return guards;
}
