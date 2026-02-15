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
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
