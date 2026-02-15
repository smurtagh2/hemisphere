import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { db, schema } from '@hemisphere/db';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const authRoutes = new Hono();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const googleOAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

const appleOAuthSchema = z.object({
  idToken: z.string().min(1, 'Apple ID token is required'),
  displayName: z.string().optional(),
});

// OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;

// Remote JWKS sets (lazily initialised as module-level singletons)
const googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hemisphere-dev-secret-change-in-production'
);
const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION_DAYS = 30; // 30 days

// Helper function to generate access token
async function generateAccessToken(userId: string, email: string, role: string) {
  const token = await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

// Helper function to generate refresh token
function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

// Helper function to create refresh token in database
async function createRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

  await db.insert(schema.refreshTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
authRoutes.post('/signup', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { email, password, displayName } = result.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json(
        {
          error: 'User already exists',
          message: 'An account with this email already exists',
        },
        409
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email,
        passwordHash,
        displayName,
        role: 'learner',
        isActive: true,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
      });

    // Generate access and refresh tokens
    const accessToken = await generateAccessToken(newUser.id, newUser.email, newUser.role);
    const refreshToken = await createRefreshToken(newUser.id);

    return c.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (error) {
    console.error('Signup error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during signup',
      },
      500
    );
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
authRoutes.post('/login', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { email, password } = result.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Invalid email or password',
        },
        401
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return c.json(
        {
          error: 'Account disabled',
          message: 'Your account has been disabled',
        },
        403
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Invalid email or password',
        },
        401
      );
    }

    // Update last login timestamp
    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id));

    // Generate access and refresh tokens
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await createRefreshToken(user.id);

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during login',
      },
      500
    );
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 */
authRoutes.get('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          error: 'Missing token',
          message: 'Authorization token is required',
        },
        401
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Get user from database
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId as string))
      .limit(1);

    if (!user || !user.isActive) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Token is invalid or user is inactive',
        },
        401
      );
    }

    return c.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return c.json(
      {
        error: 'Invalid token',
        message: 'Token verification failed',
      },
      401
    );
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token with rotation
 */
authRoutes.post('/refresh', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const result = refreshSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { refreshToken } = result.data;

    // Find refresh token in database
    const [tokenRecord] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, refreshToken))
      .limit(1);

    if (!tokenRecord) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Refresh token not found',
        },
        401
      );
    }

    // Check if token is revoked
    if (tokenRecord.revokedAt) {
      // Token reuse detected - revoke all tokens for this user
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.refreshTokens.userId, tokenRecord.userId),
            eq(schema.refreshTokens.revokedAt, null as any)
          )
        );

      return c.json(
        {
          error: 'Token reuse detected',
          message: 'All tokens have been revoked for security. Please log in again.',
        },
        401
      );
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      return c.json(
        {
          error: 'Token expired',
          message: 'Refresh token has expired. Please log in again.',
        },
        401
      );
    }

    // Get user information
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, tokenRecord.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return c.json(
        {
          error: 'Invalid user',
          message: 'User not found or inactive',
        },
        401
      );
    }

    // Generate new tokens
    const newAccessToken = await generateAccessToken(user.id, user.email, user.role);
    const newRefreshToken = await createRefreshToken(user.id);

    // Revoke old refresh token and mark replacement
    await db
      .update(schema.refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedBy: newRefreshToken,
      })
      .where(eq(schema.refreshTokens.id, tokenRecord.id));

    return c.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during token refresh',
      },
      500
    );
  }
});

/**
 * POST /api/auth/logout
 * Revoke refresh token and log out user
 */
authRoutes.post('/logout', async (c) => {
  try {
    // Parse request body
    const body = await c.req.json();
    const result = refreshSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { refreshToken } = result.data;

    // Find and revoke refresh token
    const [tokenRecord] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, refreshToken))
      .limit(1);

    if (tokenRecord && !tokenRecord.revokedAt) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.id, tokenRecord.id));
    }

    return c.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during logout',
      },
      500
    );
  }
});

/**
 * POST /api/auth/oauth/google
 * Authenticate with Google using an ID token from the Google Sign-In SDK.
 *
 * Body: { idToken: string }
 *
 * DB schema note: The users table does not yet have a `googleId` column.
 * A future migration should add:
 *   - googleId text UNIQUE (nullable)
 * Until then, lookup is by email only.
 */
authRoutes.post('/oauth/google', async (c) => {
  try {
    const body = await c.req.json();
    const result = googleOAuthSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { idToken } = result.data;

    let payload: Record<string, unknown>;
    try {
      const verifyOptions: Parameters<typeof jwtVerify>[2] = {
        algorithms: ['RS256'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
      };
      if (GOOGLE_CLIENT_ID) {
        verifyOptions.audience = GOOGLE_CLIENT_ID;
      }
      const verified = await jwtVerify(idToken, googleJWKS, verifyOptions);
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      console.error('Google token verification failed:', err);
      return c.json(
        { error: 'Invalid token', message: 'Google ID token verification failed' },
        401
      );
    }

    const email = payload['email'] as string | undefined;
    const name =
      (payload['name'] as string | undefined) ||
      (payload['given_name'] as string | undefined) ||
      'Google User';

    if (!email) {
      return c.json(
        { error: 'Invalid token', message: 'Google token does not contain an email address' },
        401
      );
    }

    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      // OAuth users have no password — store sentinel empty string.
      // A future migration adding oauthProvider + nullable passwordHash would be cleaner.
      const [created] = await db
        .insert(schema.users)
        .values({ email, passwordHash: '', displayName: name, role: 'learner', isActive: true })
        .returning();
      user = created;
    }

    if (!user.isActive) {
      return c.json({ error: 'Account disabled', message: 'Your account has been disabled' }, 403);
    }

    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));

    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await createRefreshToken(user.id);

    return c.json({
      message: 'Google login successful',
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return c.json(
      { error: 'Internal server error', message: 'An error occurred during Google authentication' },
      500
    );
  }
});

/**
 * POST /api/auth/oauth/apple
 * Authenticate with Sign in with Apple using an identity token.
 *
 * Body: { idToken: string, displayName?: string }
 *
 * Apple only sends the user's name on the very first sign-in, so displayName
 * should be provided by the client on first sign-in and omitted thereafter.
 *
 * DB schema note: The users table does not yet have an `appleId` column.
 * A future migration should add:
 *   - appleId text UNIQUE (nullable)
 * Apple's `sub` claim is the stable user identifier (not the email, which can
 * be a relay address). Until that column exists, lookup falls back to email only.
 */
authRoutes.post('/oauth/apple', async (c) => {
  try {
    const body = await c.req.json();
    const result = appleOAuthSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const { idToken, displayName: clientDisplayName } = result.data;

    let applePayload: Record<string, unknown>;
    try {
      const verifyOptions: Parameters<typeof jwtVerify>[2] = {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
      };
      if (APPLE_CLIENT_ID) {
        verifyOptions.audience = APPLE_CLIENT_ID;
      }
      const verified = await jwtVerify(idToken, appleJWKS, verifyOptions);
      applePayload = verified.payload as Record<string, unknown>;
    } catch (err) {
      console.error('Apple token verification failed:', err);
      return c.json(
        { error: 'Invalid token', message: 'Apple identity token verification failed' },
        401
      );
    }

    const email = applePayload['email'] as string | undefined;

    if (!email) {
      return c.json(
        { error: 'Invalid token', message: 'Apple token does not contain an email address' },
        401
      );
    }

    const displayName = clientDisplayName || email.split('@')[0] || 'Apple User';

    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      const [created] = await db
        .insert(schema.users)
        .values({ email, passwordHash: '', displayName, role: 'learner', isActive: true })
        .returning();
      user = created;
    }

    if (!user.isActive) {
      return c.json({ error: 'Account disabled', message: 'Your account has been disabled' }, 403);
    }

    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));

    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await createRefreshToken(user.id);

    return c.json({
      message: 'Apple login successful',
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Apple OAuth error:', error);
    return c.json(
      { error: 'Internal server error', message: 'An error occurred during Apple authentication' },
      500
    );
  }
});
