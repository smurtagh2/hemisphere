# Authentication API

This document describes the authentication endpoints implemented in the Hemisphere API.

## Overview

The authentication system uses:
- **JWT tokens** for stateless authentication
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

## JWT Token Details

- **Algorithm:** HS256
- **Expiration:** 7 days
- **Payload:**
  - `userId`: User's UUID
  - `email`: User's email address
  - `role`: User's role (e.g., "learner", "admin")
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp

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
2. **Token Security:** JWT tokens are signed with HS256 algorithm
3. **Environment Variables:** Always set a strong `JWT_SECRET` in production
4. **HTTPS:** Always use HTTPS in production to protect tokens in transit
5. **Token Expiration:** Tokens expire after 7 days and must be refreshed
6. **Account Status:** Inactive accounts cannot log in

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
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3001/api/protected \
  -H "Authorization: Bearer $TOKEN"
```

## Database Schema

The authentication system uses the `users` table:

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
