import { RootProvider } from 'fumadocs-ui/provider/next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './global.css';

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Callsheet Docs',
    template: '%s | Callsheet Docs',
  },
  description: '',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${monoFont.variable} flex min-h-screen flex-col`}
      >
        <RootProvider
          search={{
            enabled: false,
          }}
        >
          <div className="fd-page-texture" aria-hidden="true" />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
