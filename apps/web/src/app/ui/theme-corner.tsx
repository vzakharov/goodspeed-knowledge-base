import { ThemeToggle } from '@/features/switch-theme';

import classes from './theme-corner.module.scss';

/**
 * The theme toggle's one home — `RootLayout` renders it for every page, so a
 * page renders nothing for it. It sits out of the flow in the top-right
 * corner, which a page's own first line has to clear.
 */
export function ThemeCorner() {
  return (
    <div className={classes['corner']}>
      <ThemeToggle label="Toggle theme" />
    </div>
  );
}
