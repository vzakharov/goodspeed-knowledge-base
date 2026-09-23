import {
  createTheme,
  defaultVariantColorsResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';

import { cssColor } from '@/shared/ui';

import { breakpoints } from './breakpoints';
import classes from './theme.module.scss';

const foreground = cssColor('foreground');

// The palette is monochrome, so every shade is the same token. Mantine still
// wants ten.
const monochrome: MantineColorsTuple = [
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
  foreground,
];

// `variant="default"` is the site's only control skin: a square hairline box
// that inverts to solid foreground on hover. It has to live here rather than in
// a CSS module because Mantine emits variant colours as inline `style` vars.
const variantColorResolver: VariantColorsResolver = (input) =>
  input.variant === 'default'
    ? {
        background: 'transparent',
        hover: cssColor('foreground'),
        color: cssColor('foreground'),
        hoverColor: cssColor('background'),
        border: `1px solid ${cssColor('border-hairline-strong')}`,
      }
    : defaultVariantColorsResolver(input);

export const theme = createTheme({
  fontFamily: 'var(--font-merriweather), serif',
  fontFamilyMonospace: 'var(--font-mono), monospace',
  // Sizes live here rather than on call sites so that `print.scss` can re-key
  // them off `h1`–`h4`: a `fz` prop would render as an inline style no print
  // rule could reach.
  headings: {
    fontFamily: 'var(--font-merriweather), serif',
    sizes: {
      h1: { fontSize: '36px', lineHeight: '40px' },
      h2: { fontSize: '30px', lineHeight: '36px' },
      h3: { fontSize: '24px', lineHeight: '32px' },
      h4: { fontSize: '20px', lineHeight: '28px' },
    },
  },
  // The type scale, as `size` on Text and Anchor: each step carries its own
  // line height, so a size never has to be paired with an `lh`.
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
  },
  lineHeights: {
    xs: '1.3333',
    sm: '1.4286',
    md: '1.5',
    lg: '1.5556',
    xl: '1.4',
  },
  breakpoints,
  defaultRadius: 0,
  white: cssColor('background'),
  black: cssColor('foreground'),
  primaryColor: 'monochrome',
  colors: { monochrome },
  variantColorResolver,
  components: {
    // Structure only — a visual value in `defaultProps` renders as an inline
    // style that no CSS-module class can override.
    Button: {
      classNames: {
        root: classes['control'],
        section: classes['controlSection'],
      },
    },
    ActionIcon: { classNames: { root: classes['control'] } },
    Title: { classNames: { root: classes['title'] } },
    // The nav is the one place that opts out. Safe in `defaultProps` because it
    // renders as a data attribute, not the inline style a visual value becomes.
    Anchor: { defaultProps: { underline: 'always' } },
    // `List.Item` reads its class names off the List context, so the item
    // wrapper is styled from here rather than on the item.
    List: {
      classNames: {
        root: classes['list'],
        itemWrapper: classes['listItemWrapper'],
      },
    },
  },
});
