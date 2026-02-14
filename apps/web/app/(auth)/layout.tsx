/**
 * Auth route group layout
 *
 * Minimal layout for /login and /signup — no navigation chrome.
 * The (auth) route group is purely organisational and adds no URL segment.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
