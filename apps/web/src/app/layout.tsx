import type { Metadata } from 'next';
import '@/styles/globals.css';
// import { AuthGuard } from '@/components/AuthGuard'; // disabled for local preview

export const metadata: Metadata = {
  title: 'Hemisphere Learning',
  description: 'A hemisphere-aware learning platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-stage="encounter" data-theme="dark">
        {children}
      </body>
    </html>
  );
}
