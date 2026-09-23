'use client';

// Core sheets first, then one per component in use — a component rendered
// without its sheet is invisible breakage, and `pnpm check:mantine-styles` is
// what catches it. `.claude/rules/styling.md` § Styling carries the rest.
//
// The component sheets are in Mantine's own order, not alphabetical: a
// composite's root carries its base's class, and the later sheet wins —
// `UnstyledButton` after `Button` strips the button's padding and border.
import '@mantine/core/styles/baseline.layer.css';
import '@mantine/core/styles/default-css-variables.layer.css';
import '@mantine/core/styles/global.layer.css';
import '@mantine/core/styles/UnstyledButton.layer.css';
import '@mantine/core/styles/ActionIcon.layer.css';
import '@mantine/core/styles/Text.layer.css';
import '@mantine/core/styles/Container.layer.css';
import '@mantine/core/styles/Stack.layer.css';
import '@mantine/core/styles/Title.layer.css';

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
