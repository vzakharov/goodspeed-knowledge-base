import classes from './hover-dim.module.scss';

// Exported here rather than declared as a global class, so a slice reaches it
// through `shared/ui` like anything else it shares.
export const hoverDim = classes['hoverDim'];
