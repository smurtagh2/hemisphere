import type { Metadata } from 'next';
import '@/styles/globals.css';
// import { AuthGuard } from '@/components/AuthGuard'; // disabled for local preview
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Hemisphere Learning',
  description: 'A hemisphere-aware learning platform',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-stage="encounter" data-theme="dark">
        {/* WCAG 2.1 AA — Skip navigation link (visible on focus, hidden offscreen otherwise) */}
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          onFocus={(e) => {
            e.currentTarget.style.cssText =
              'position:fixed;top:0;left:0;z-index:9999;padding:8px 16px;background:var(--bg-secondary);color:var(--text-primary);text-decoration:none;';
          }}
          onBlur={(e) => {
            e.currentTarget.style.cssText =
              'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
          }}
        >
          Skip to main content
        </a>
        <ServiceWorkerRegistrar />
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
