'use client';

/**
 * AuthGuard
 *
 * Client-side authentication boundary. Checks for a JWT token in localStorage
 * on every mount. If no token is found (and the current path is not a public
 * auth route) the user is redirected to /login.
 *
 * Public routes: /login, /signup
 *
 * This component must be a Client Component because it reads localStorage
 * and uses Next.js navigation hooks.
 */

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

/** Routes that do not require authentication. */
const PUBLIC_PATHS = new Set(['/login', '/signup']);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Start invisible — we need to check auth before showing anything.
  // This avoids a flash of protected content before a redirect.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.has(pathname);
    const hasToken = getToken() !== null;

    if (!isPublic && !hasToken) {
      // Store the intended destination so we can redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hemisphere_redirect', pathname);
      }
      router.replace('/login');
      return;
    }

    if (isPublic && hasToken) {
      // Already logged in — send straight to dashboard
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [pathname, router]);

  // Render nothing while the auth check + redirect is in flight.
  // The brief blank flash is preferable to exposing protected routes.
  if (!ready) return null;

  return <>{children}</>;
}
