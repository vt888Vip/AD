import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Viewport configuration
export const viewport: Viewport = {
  // Only supported properties in Next.js Viewport type
  themeColor: '#1e40af',
  // Viewport meta tag will be handled by the meta tag in the head
};

// Admin Panel metadata configuration
export const metadata: Metadata = {
  title: 'Admin Panel - London HSC',
  description: 'Hệ thống quản lý Admin cho London HSC Trading Platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  other: {
    'msapplication-TileColor': '#1e40af',
  },
};

import ClientLayout from './ClientLayout';

// This is the root layout - required for all pages
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}