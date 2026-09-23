import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import type {
  JSXAttribute,
  JSXOpeningElement,
  JSXSpreadAttribute,
} from 'estree-jsx';

import { RESERVED_JSX_ATTRS } from './jsx-reserved-attrs';

type Attribute = JSXAttribute | JSXSpreadAttribute;

/** A shorthand property (`{ foo }`): statically-known key, plain identifier read. */
type ShorthandProperty = ESTree.Property & {
  key: ESTree.Identifier;
  value: ESTree.Identifier;
};

/**
 * A spread with a statically-known key set of plain reads, none of them reserved
 * (`key`/`ref`) — foldable into another such spread.
 *
 * Any other spread is a barrier, but a barrier blocks *displacement*, not merging.
 * `checkSegment` folds later spreads up to the first one's position while the
 * attributes between them stay put, so a name can end up displaced past a barrier;
 * with its key set unknown (`{...rest}`, `{...pick(chat, 'a')}`) that could flip
 * which value wins, and the fold stops there. Adjacent spreads displace nothing, so
 * `checkAdjacentRun` absorbs the barrier into the merged literal instead.
 */
type MergeableSpread = JSXSpreadAttribute & {
  argument: ESTree.ObjectExpression & { properties: ShorthandProperty[] };
};

/**
 * `x as T` / `x!` / `x satisfies T` — @typescript-eslint node kinds absent from
 * the ESTree union. Type-level only, so purity is decided by the inner expression.
 */
type TsWrapperExpression = {
  type: 'TSAsExpression' | 'TSNonNullExpression' | 'TSSatisfiesExpression';
  expression: ESTree.Node;
};

/**
 * Merge JSX shorthand spreads that a sibling attribute split apart.
 *
 * `prefer-shorthand-spread` groups only *consecutive* eligible attributes, so
 * `{...{ a }} active {...{ b }}` sits at its fixpoint. This rule takes the
 * whole-element view: folding across attributes where that provably can't change
 * the resulting props (see `isPureExpression` and `MergeableSpread`), and merging
 * adjacent spreads outright, barriers and all.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Merge multiple JSX shorthand spreads on one element into a single spread',
    },
    fixable: 'code',
    schema: [],
    messages: {
      splitSpreads:
        'These shorthand spreads belong in one: {...{ {{props}} }}.',
    },
  },

  create(context) {
    const { sourceCode } = context;

    /**
     * Collapse `spreads` into a single `{...{ parts }}` at the first one's position.
     * `spreads` must be listed in source order.
     */
    function reportMerge(
      spreads: JSXSpreadAttribute[],
      parts: string[],
      fixable: boolean,
    ): void {
      const [first, ...rest] = spreads;

      context.report({
        node: first!,
        messageId: 'splitSpreads',
        data: { props: parts.join(', ') },
        fix: fixable
          ? (fixer) => [
              fixer.replaceTextRange(
                first!.range!,
                `{...{ ${parts.join(', ')} }}`,
              ),
              // Per-spread removal rather than one first-to-last replacement, so
              // the attributes and comments in between survive. Residual
              // whitespace is Prettier's job.
              ...rest.map((spread) =>
                fixer.removeRange([removalStart(spread), spread.range![1]]),
              ),
            ]
          : null,
      });
    }

    /** Fold the mergeable spreads of one barrier-free segment across attributes. */
    function checkSegment(segment: Attribute[], merged: Set<Attribute>): void {
      const spreads = segment.filter(isMergeableSpread);
      if (spreads.length < 2) return;

      const first = spreads[0]!;
      const last = spreads.at(-1)!;
      const span = segment.slice(
        segment.indexOf(first),
        segment.indexOf(last) + 1,
      );

      const spreadNames: string[] = [];
      const spanNames: string[] = [];
      // Folding moves the later spreads' property reads past the intervening
      // value expressions, which only an invocation in between could observe.
      let fixable = true;

      for (const attr of span) {
        if (isMergeableSpread(attr)) {
          for (const { key } of attr.argument.properties) {
            spreadNames.push(key.name);
            spanNames.push(key.name);
          }
        } else if (attr.type === 'JSXAttribute') {
          spanNames.push(attributeName(attr));
          if (!isPureAttributeValue(attr)) fixable = false;
        }
      }

      // A repeated name makes the split load-bearing: later attributes win in
      // JSX, so merging would change the resulting props. Deliberate, not a smell.
      if (new Set(spanNames).size !== spanNames.length) return;

      for (const spread of spreads) merged.add(spread);
      reportMerge(spreads, spreadNames, fixable);
    }

    /**
     * Merge a run of adjacent spreads, absorbing any barrier in source order.
     *
     * Nothing is displaced here, so the merge holds whatever the barrier's key set
     * is — `{...{ a }} {...rest} {...{ b }}` and `{...{ a, ...rest, b }}` emit the
     * same props object. No purity gate either: evaluation order is unchanged.
     */
    function checkAdjacentRun(
      run: JSXSpreadAttribute[],
      merged: ReadonlySet<Attribute>,
    ): void {
      // `checkSegment` runs first and wins any overlap, so its fold stays the
      // primary shape and this path never competes with it for the same spreads.
      if (run.some((spread) => merged.has(spread))) return;

      const mergeable = run.filter(isMergeableSpread);
      // Two shorthand spreads is the split this rule is named for; an all-mergeable
      // run is `checkSegment`'s already, so a barrier is what's left to absorb.
      if (mergeable.length < 2 || mergeable.length === run.length) return;
      if (run.some(hasReservedKey)) return;

      // The winner wouldn't change, but one literal holding `{ a, ...rest, a }`
      // reads as a duplicate-key mistake — and trips `no-dupe-keys`.
      const names = run.flatMap(knownNames);
      if (new Set(names).size !== names.length) return;

      reportMerge(
        run,
        run.map(mergedPart).filter((part) => part !== null),
        true,
      );
    }

    /** One run member's contribution to the merged literal. */
    function mergedPart(spread: JSXSpreadAttribute): string | null {
      const { argument } = spread;
      if (argument.type !== 'ObjectExpression') {
        return `...${sourceCode.getText(argument)}`;
      }
      const properties = argument.properties.map((property) =>
        sourceCode.getText(property),
      );
      return properties.length > 0 ? properties.join(', ') : null;
    }

    /**
     * Starts after the preceding token — or after the last comment before the
     * spread, so an explanatory comment is left behind rather than swallowed.
     */
    function removalStart(spread: JSXSpreadAttribute): number {
      const lastComment = sourceCode.getCommentsBefore(spread).at(-1);
      return lastComment
        ? lastComment.range![1]
        : sourceCode.getTokenBefore(spread)!.range[1];
    }

    return {
      JSXOpeningElement(node: JSXOpeningElement) {
        const merged = new Set<Attribute>();

        // Partition into displacement-safe segments, splitting at every barrier.
        let segmentStart = 0;
        for (const [index, attr] of node.attributes.entries()) {
          if (attr.type === 'JSXSpreadAttribute' && !isMergeableSpread(attr)) {
            checkSegment(node.attributes.slice(segmentStart, index), merged);
            segmentStart = index + 1;
          }
        }
        checkSegment(node.attributes.slice(segmentStart), merged);

        for (const run of adjacentRuns(node.attributes)) {
          checkAdjacentRun(run, merged);
        }
      },
    };
  },
};

function isMergeableSpread(attr: Attribute): attr is MergeableSpread {
  if (attr.type !== 'JSXSpreadAttribute') return false;
  const { argument } = attr;
  if (argument.type !== 'ObjectExpression') return false;
  if (argument.properties.length === 0) return false;

  return argument.properties.every(
    (property) =>
      property.type === 'Property' &&
      property.shorthand &&
      !property.computed &&
      property.kind === 'init' &&
      property.key.type === 'Identifier' &&
      property.value.type === 'Identifier' &&
      !RESERVED_JSX_ATTRS.has(property.key.name),
  );
}

/** Maximal sequences of two or more spreads with no attribute between them. */
function adjacentRuns(attributes: Attribute[]): JSXSpreadAttribute[][] {
  const runs: JSXSpreadAttribute[][] = [];
  let run: JSXSpreadAttribute[] = [];

  for (const attr of attributes) {
    if (attr.type === 'JSXSpreadAttribute') {
      run.push(attr);
      continue;
    }
    if (run.length > 1) runs.push(run);
    run = [];
  }
  if (run.length > 1) runs.push(run);

  return runs;
}

/** Whether the spread names a React-reserved prop, which must never be moved. */
function hasReservedKey(spread: JSXSpreadAttribute): boolean {
  const { argument } = spread;
  if (argument.type !== 'ObjectExpression') return false;

  return argument.properties.some(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      property.key.type === 'Identifier' &&
      RESERVED_JSX_ATTRS.has(property.key.name),
  );
}

/** The keys a spread contributes that can be read off the syntax. */
function knownNames(spread: JSXSpreadAttribute): string[] {
  const { argument } = spread;
  if (argument.type !== 'ObjectExpression') return [];

  return argument.properties.flatMap((property) =>
    property.type === 'Property' &&
    !property.computed &&
    property.key.type === 'Identifier'
      ? [property.key.name]
      : [],
  );
}

function attributeName(attr: JSXAttribute): string {
  return attr.name.type === 'JSXIdentifier'
    ? attr.name.name
    : `${attr.name.namespace.name}:${attr.name.name.name}`;
}

function isPureAttributeValue(attr: JSXAttribute): boolean {
  const { value } = attr;
  if (value === null) return true; // boolean shorthand, e.g. `active`
  if (value.type === 'Literal') return true;
  if (value.type === 'JSXExpressionContainer') {
    return isPureExpression(value.expression);
  }
  // A JSX element value — its own attributes may invoke.
  return false;
}

/** Evaluating one of these is a read, a constant, or a function *definition*. */
const NON_INVOKING_TYPES = new Set<string>([
  'Identifier',
  'Literal',
  'JSXEmptyExpression',
  'ArrowFunctionExpression',
  'FunctionExpression',
]);

/**
 * Whether evaluating `node` invokes anything. Property reads count as pure: we
 * do not chase side-effecting getters. Default-deny — an unrecognized node kind
 * is impure, so a new syntax form can't silently widen what gets autofixed.
 *
 * Sequential narrowing rather than a `switch`: the discriminant is the whole
 * ESTree node union, which no case list can exhaust.
 */
function isPureExpression(node: ESTree.Node | TsWrapperExpression): boolean {
  if (NON_INVOKING_TYPES.has(node.type)) return true;

  // Everything below is pure exactly when its sub-expressions are.
  if (node.type === 'TemplateLiteral') {
    return node.expressions.every(isPureExpression);
  }
  if (node.type === 'MemberExpression') {
    return (
      isPureExpression(node.object) &&
      (!node.computed || isPureExpression(node.property))
    );
  }
  if (
    node.type === 'ChainExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression'
  ) {
    return isPureExpression(node.expression);
  }
  if (node.type === 'UnaryExpression') {
    return isPureExpression(node.argument);
  }
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    return isPureExpression(node.left) && isPureExpression(node.right);
  }
  if (node.type === 'ConditionalExpression') {
    return (
      isPureExpression(node.test) &&
      isPureExpression(node.consequent) &&
      isPureExpression(node.alternate)
    );
  }
  if (node.type === 'ObjectExpression') {
    return node.properties.every(
      (property) =>
        property.type === 'Property' &&
        (!property.computed || isPureExpression(property.key)) &&
        isPureExpression(property.value),
    );
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.every(
      (element) => element === null || isPureExpression(element),
    );
  }

  return false;
}

export default rule;
