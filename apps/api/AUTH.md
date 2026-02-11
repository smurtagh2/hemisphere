# Authentication API

This document describes the authentication endpoints implemented in the Hemisphere API.

## Overview

The authentication system uses:
- **JWT access tokens** for stateless authentication (15-minute expiration)
- **Refresh tokens** for obtaining new access tokens (30-day expiration)
- **Token rotation** for enhanced security (refresh tokens are rotated on each use)
- **bcrypt** for password hashing with 10 salt rounds
- **jose** library for JWT operations (secure and modern)
- **zod** for request validation

## Environment Variables

- `JWT_SECRET` - Secret key for JWT signing (default: 'hemisphere-dev-secret-change-in-production')
- `DATABASE_URL` - PostgreSQL connection string (required)

## Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe"
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Minimum 8 characters
- `displayName`: Required, minimum 1 character

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "learner",
    "createdAt": "2026-02-11T20:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `409 Conflict` - User already exists
- `500 Internal Server Error` - Server error

### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "learner",
    "avatarUrl": null,
    "timezone": "UTC",
    "lastLoginAt": "2026-02-11T20:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account disabled
- `500 Internal Server Error` - Server error

### GET /api/auth/verify

Verify a JWT token and get user information.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "learner",
    "avatarUrl": null,
    "timezone": "UTC"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing, invalid, or expired token

### POST /api/auth/refresh

Refresh an access token using a refresh token. Implements token rotation for security.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "x9y8z7w6v5u4...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "learner"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed (missing refresh token)
- `401 Unauthorized` - Invalid, expired, or revoked refresh token
- `401 Unauthorized` - Token reuse detected (all tokens revoked for security)
- `500 Internal Server Error` - Server error

**Security Notes:**
- Each refresh token can only be used once (token rotation)
- If a revoked token is reused, all tokens for the user are revoked (prevents token theft)
- Old refresh token is marked with `replacedBy` field for audit trail

### POST /api/auth/logout

Revoke a refresh token to log out the user.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed (missing refresh token)
- `500 Internal Server Error` - Server error

**Notes:**
- Logout always returns success, even if the token is invalid or already revoked
- Client should discard both access and refresh tokens after logout
- Access tokens remain valid until expiration (15 minutes)

## Token Details

### Access Tokens (JWT)

- **Algorithm:** HS256
- **Expiration:** 15 minutes
- **Payload:**
  - `userId`: User's UUID
  - `email`: User's email address
  - `role`: User's role (e.g., "learner", "admin")
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp

### Refresh Tokens

- **Format:** 128-character random hex string
- **Expiration:** 30 days
- **Storage:** Database with revocation support
- **Rotation:** New token issued on each refresh
- **Security:** One-time use with reuse detection

## Middleware

### authMiddleware

Protects routes by validating JWT tokens.

**Usage:**
```typescript
import { authMiddleware } from './middleware/auth.js';

app.get('/protected', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

### requireRole

Checks if authenticated user has required role(s).

**Usage:**
```typescript
import { authMiddleware, requireRole } from './middleware/auth.js';

app.get('/admin', authMiddleware, requireRole('admin'), (c) => {
  return c.json({ message: 'Admin access granted' });
});
```

## Security Considerations

1. **Password Storage:** Passwords are hashed using bcrypt with 10 salt rounds
2. **Token Security:**
   - Access tokens are signed with HS256 algorithm
   - Refresh tokens use cryptographically secure random generation
3. **Environment Variables:** Always set a strong `JWT_SECRET` in production
4. **HTTPS:** Always use HTTPS in production to protect tokens in transit
5. **Token Expiration:**
   - Access tokens expire after 15 minutes
   - Refresh tokens expire after 30 days
6. **Token Rotation:** Refresh tokens are rotated on each use to prevent token theft
7. **Reuse Detection:** If a revoked token is reused, all user tokens are revoked
8. **Account Status:** Inactive accounts cannot log in or refresh tokens
9. **Token Storage:**
   - Store access tokens in memory only (not localStorage)
   - Store refresh tokens in httpOnly cookies or secure storage
10. **Logout:** Always call logout endpoint to revoke refresh tokens

## Example Usage

### Signup Flow
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "displayName": "John Doe"
  }'
```

### Login Flow
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

### Using Protected Route
```bash
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3001/api/protected \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Refresh Token Flow
```bash
REFRESH_TOKEN="a1b2c3d4e5f6..."

curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

### Logout Flow
```bash
REFRESH_TOKEN="a1b2c3d4e5f6..."

curl -X POST http://localhost:3001/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

## Database Schema

The authentication system uses the `users` and `refresh_tokens` tables:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'learner',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  replaced_by TEXT
);
```

**Refresh Token Fields:**
- `id`: Primary key
- `user_id`: Reference to user who owns the token
- `token`: The refresh token string (128-char hex)
- `expires_at`: When the token expires (30 days from creation)
- `created_at`: When the token was created
- `revoked_at`: When the token was revoked (null if active)
- `replaced_by`: Token string that replaced this one (for audit trail)
