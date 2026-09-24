'use client';

// The aggregate, not one sheet per component: `.claude/rules/styling.md`
// § Styling carries why.
import '@mantine/core/styles.layer.css';
import '@mantine/dropzone/styles.layer.css';

import { type CSSVariablesResolver, MantineProvider } from '@mantine/core';

import type { WithChildren } from '@/shared/typings';
import { cssColor } from '@/shared/ui';

import { theme } from '../styles/theme';

// Every `--mantine-*` override belongs here, not in a stylesheet: Mantine's own
// `:root` block is a `<style>` at the top of `<body>`, so a stylesheet's `:root`
// loses to it on document order.
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
