import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { db, schema } from '@hemisphere/db';
import { eq } from 'drizzle-orm';

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

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hemisphere-dev-secret-change-in-production'
);
const JWT_EXPIRATION = '7d'; // 7 days

// Helper function to generate JWT
async function generateToken(userId: string, email: string, role: string) {
  const token = await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);

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

    // Generate JWT token
    const token = await generateToken(newUser.id, newUser.email, newUser.role);

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
        token,
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

    // Generate JWT token
    const token = await generateToken(user.id, user.email, user.role);

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
      token,
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
