import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { db, schema } from '@hemisphere/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hemisphere-dev-secret-change-in-production'
);

/**
 * Auth middleware to protect routes
 * Validates JWT token and attaches user info to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      },
      401
    );
  }

  try {
    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Verify user exists and is active
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId as string))
      .limit(1);

    if (!user || !user.isActive) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token or user is inactive',
        },
        401
      );
    }

    // Attach user to context for use in route handlers
    c.set('user', {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      },
      401
    );
  }
}

/**
 * Role-based authorization middleware
 * Requires authMiddleware to run first
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
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
          message: 'Insufficient permissions',
        },
        403
      );
    }

    await next();
  };
}
