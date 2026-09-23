/**
 * The home for a member more than one named type declares: `pnpm type-overlap`
 * fails on the duplicate, and intersecting a base from here fixes it. Names
 * follow the families in scripts/type-overlap-check.README.md; a base whose
 * declarers all sit in one module belongs in that module instead.
 */

import type { ReactNode } from 'react';

export type Named = { name: string };

export type WithId = { id: string };

export type Titled = { title: string };

/** An image's intrinsic pixel size — what reserves its box before it loads. */
export type Sized = {
  width: number;
  height: number;
};

/** A title that may be absent — a document's is derived, so it exists only once read. */
export type MaybeTitled = { title?: string };

export type Described = { description: string };

/** The short name a thing is shown or logged under. */
export type Labeled = { label: string };

/** Rendered or authored text, as opposed to a title or a label. */
export type WithText = { text: string };

/** The one line under a name — what is on offer, said once. */
export type WithTagline = { tagline: string };

/** A name and the line it is billed under. */
export type Billed = Named & WithTagline;

/** Extra classes a caller merges into the component's own. */
export type WithOptionalClassName = { className?: string };

/** What a wrapper component renders inside itself. */
export type WithChildren = { children: ReactNode };

/** The same, for a wrapper that stands on its own when nothing is put in it. */
export type WithOptionalChildren = { children?: ReactNode };

/** A heading and whatever renders under it. */
export type TitledBlock = Titled & WithChildren;

/** Where an anchor points. */
export type Linked = { href: string };

/** An anchor whose label is a string rather than markup. */
export type LabeledLink = Labeled & Linked;

/** Where an anchor points, when there is anywhere. */
export type WithOptionalLink = { href?: string };

/** The muted line above a title, saying what the thing under it is before it is read. */
export type WithOptionalEyebrow = { eyebrow?: string };

/** What a Next route hands the page it resolves to, its segments still raw. */
export type WithParams<Params> = { params: Promise<Params> };

/** An anchor whose content is its own label — markup rather than a string. */
export type Anchored = Linked & WithChildren;

/**
 * A key either present with a value or wholly absent. Unlike a plain
 * `{ key?: Value }`, there is no present-but-`undefined` middle state — a reader
 * tests the key's presence, never a nullable slot.
 */
export type PresentOrAbsent<Key extends string, Value> =
  Record<Key, Value> | Partial<Record<Key, never>>;
