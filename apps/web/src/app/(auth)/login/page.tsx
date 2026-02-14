'use client';

/**
 * Login Page
 *
 * Posts credentials to /api/auth/login, stores the JWT in localStorage,
 * and redirects to /dashboard on success.
 */

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-stage="encounter"
      className="min-h-screen flex items-center justify-center px-4 bg-bg-primary"
    >
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            Hemisphere
          </h1>
          <p className="text-text-secondary font-body">
            Your hemisphere-aware learning companion
          </p>
        </div>

        <Card glow padding="lg">
          <CardHeader>
            <CardTitle as="h2">Sign in</CardTitle>
            <CardDescription>
              Continue where you left off.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />

              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />

              {error && (
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                Sign in
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-text-secondary text-center">
              No account yet?{' '}
              <a
                href="/signup"
                className="text-accent-primary hover:underline font-medium"
              >
                Create one
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
