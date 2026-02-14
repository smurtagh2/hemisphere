/**
 * Root page — redirects to /dashboard.
 *
 * AuthGuard in the root layout handles the /login redirect if no token is
 * present, so we just need to send authenticated users to the dashboard.
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
