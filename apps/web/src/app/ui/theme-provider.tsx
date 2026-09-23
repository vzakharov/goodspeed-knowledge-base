'use client';

// The aggregate, not one sheet per component: `.claude/rules/styling.md`
// § Styling carries why.
import '@mantine/core/styles.layer.css';

import { type CSSVariablesResolver, MantineProvider } from '@mantine/core';

import type { WithChildren } from '@/shared/typings';
import { cssColor } from '@/shared/ui';

import { theme } from '../styles/theme';

// Every `--mantine-*` override belongs here rather than in a stylesheet:
// Mantine emits its own block as a `<style data-mantine-styles>` at the top of
// `<body>`, on `:root`, so a stylesheet's `:root` ties on specificity and loses
// on document order.
const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-color-body': cssColor('background'),
    '--mantine-color-text': cssColor('foreground'),
    '--mantine-color-anchor': cssColor('foreground'),
    '--mantine-color-default-border': cssColor('border-hairline-strong'),
  },
  light: {},
  dark: {},
});

export function ThemeProvider({ children }: WithChildren) {
  return (
    <MantineProvider
      {...{ theme, cssVariablesResolver }}
      defaultColorScheme="auto"
    >
      {children}
    </MantineProvider>
  );
}
