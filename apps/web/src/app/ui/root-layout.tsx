import '../styles/globals.scss';

import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import { JetBrains_Mono, Merriweather } from 'next/font/google';

import { ThemeCorner } from './theme-corner';
import { ThemeProvider } from './theme-provider';

const merriweather = Merriweather({
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

/**
 * What a route without metadata of its own publishes. Next reads it only
 * through `app/layout.tsx`'s re-export — as it reads each page's through its
 * route module — so a `metadata` the route file does not re-export is ignored.
 */
export const rootMetadata: Metadata = {
  title: 'Knowledge Base',
};

export function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The font variables have to be on <html>: a custom property resolves in the
  // scope it is declared in, and Mantine declares `--mantine-font-family` —
  // which reads them — on `:root`.
  return (
    <html
      lang="en"
      className={`${merriweather.variable} ${jetbrainsMono.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <ThemeProvider>
          <ThemeCorner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
