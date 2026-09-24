/**
 * The home for a member more than one named type declares: `pnpm type-overlap`
 * fails on the duplicate, and intersecting a base from here fixes it. Names
 * follow the families in scripts/type-overlap-check.README.md; a base whose
 * declarers all sit in one module belongs in that module instead.
 */

import type { ReactNode } from 'react';

export type Named = { name: string };

export type WithId = { id: string };

/** The short name a thing is shown or logged under. */
export type Labeled = { label: string };

/** Rendered or authored text, as opposed to a title or a label. */
export type WithText = { text: string };

/** What cancels the work a call starts. */
export type WithAbortSignal = { signal: AbortSignal };

/** Extra classes a caller merges into the component's own. */
export type WithOptionalClassName = { className?: string };

/** What a wrapper component renders inside itself. */
export type WithChildren = { children: ReactNode };

/** Where an anchor points. */
type Linked = { href: string };

/** An anchor whose label is a string rather than markup. */
export type LabeledLink = Labeled & Linked;

/** An anchor whose content is its own label — markup rather than a string. */
export type Anchored = Linked & WithChildren;
