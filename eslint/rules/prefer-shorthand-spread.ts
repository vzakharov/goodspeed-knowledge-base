import type { Rule } from 'eslint';
import type {
  JSXAttribute,
  JSXExpressionContainer,
  JSXIdentifier,
  JSXOpeningElement,
  JSXSpreadAttribute,
} from 'estree-jsx';

import { RESERVED_JSX_ATTRS } from './jsx-reserved-attrs';

type ShorthandAttribute = JSXAttribute & {
  name: JSXIdentifier;
  value: JSXExpressionContainer;
};

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require shorthand spread syntax for JSX props where the name matches the value identifier',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferSpread:
        'Use spread syntax: {...{ {{props}} }} instead of {{longForm}}.',
    },
  },

  create(context) {
    function isShorthandEligible(
      attr: JSXAttribute | JSXSpreadAttribute,
    ): attr is ShorthandAttribute {
      return (
        attr.type === 'JSXAttribute' &&
        attr.name.type === 'JSXIdentifier' &&
        !RESERVED_JSX_ATTRS.has(attr.name.name) &&
        attr.value?.type === 'JSXExpressionContainer' &&
        attr.value.expression.type === 'Identifier' &&
        attr.value.expression.name === attr.name.name
      );
    }

    return {
      JSXOpeningElement(node: JSXOpeningElement) {
        const attrs = node.attributes;
        let i = 0;

        while (i < attrs.length) {
          if (!isShorthandEligible(attrs[i]!)) {
            i++;
            continue;
          }

          // Collect consecutive shorthand-eligible attributes into a run.
          const runStart = i;
          while (i < attrs.length && isShorthandEligible(attrs[i]!)) {
            i++;
          }

          const run = attrs.slice(runStart, i).filter(isShorthandEligible);
          const names = run.map((a) => a.name.name);

          context.report({
            node: run[0]!,
            messageId: 'preferSpread',
            data: {
              props: names.join(', '),
              longForm: names.map((n) => `${n}={${n}}`).join(', '),
            },
            fix(fixer) {
              const first = run[0]!;
              const last = run.at(-1)!;

              // Replace the full range from the first attribute to the last,
              // including any whitespace between them.
              return fixer.replaceTextRange(
                [first.range![0], last.range![1]],
                `{...{ ${names.join(', ')} }}`,
              );
            },
          });
        }
      },
    };
  },
};

export default rule;
