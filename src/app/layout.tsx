import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ledger — OSRS Flip Tracker',
  description: 'Real-time Grand Exchange margins, momentum, and alerts.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1b1712',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
