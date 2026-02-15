'use client';
import { useServiceWorker } from '@/lib/hooks/useServiceWorker';

/**
 * Client component that registers the service worker.
 * Rendered inside the server RootLayout to bridge the server/client boundary.
 */
export function ServiceWorkerRegistrar() {
  useServiceWorker();
  return null;
}
