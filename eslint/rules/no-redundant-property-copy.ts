import type { Rule } from 'eslint';
import type { JSXAttribute } from 'estree-jsx';

// React reserves `key` and `ref`: they're stripped from spread props and can't
// be forwarded via pick/spread, so `key={obj.key}` has no non-redundant
// rewrite — flagging it just forces an awkward local rename. Exempt them.
const RESERVED_JSX_ATTRS = new Set(['key', 'ref']);

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow copying a property verbosely when the key matches the member name (prefer destructuring or pick)',
    },
    schema: [],
    messages: {
      redundantCopy:
        'Prefer destructuring or pick({{source}}, ...) over {{key}}: {{source}}.{{key}}.',
      redundantJsxCopy:
        'Prefer pick({{source}}, ...) over {{attr}}={{{source}}.{{attr}}}}.',
    },
  },

  create(context) {
    return {
      ObjectExpression(node) {
        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const { key, value } = prop;

          // Get the key name from either an Identifier or a string Literal.
          let keyName;
          if (key.type === 'Identifier') {
            keyName = key.name;
          } else if (key.type === 'Literal' && typeof key.value === 'string') {
            keyName = key.value;
          } else {
            continue;
          }

          // Value must be a non-computed MemberExpression whose property name matches the key.
          if (
            value.type !== 'MemberExpression' ||
            value.computed ||
            value.property.type !== 'Identifier' ||
            value.property.name !== keyName
          ) {
            continue;
          }

          const source = context.sourceCode.getText(value.object);

          context.report({
            node: prop,
            messageId: 'redundantCopy',
            data: { key: keyName, source },
          });
        }
      },

      JSXAttribute(node: JSXAttribute) {
        // Skip namespace attributes (e.g. xml:lang).
        if (node.name.type !== 'JSXIdentifier') return;
        const attrName = node.name.name;
        if (RESERVED_JSX_ATTRS.has(attrName)) return;

        if (node.value?.type !== 'JSXExpressionContainer') return;
        const { expression } = node.value;

        // Value must be a non-computed MemberExpression whose property name matches the attr.
        if (
          expression.type !== 'MemberExpression' ||
          expression.computed ||
          expression.property.type !== 'Identifier' ||
          expression.property.name !== attrName
        )
          return;

        const source = context.sourceCode.getText(expression.object);

        context.report({
          node,
          messageId: 'redundantJsxCopy',
          data: { attr: attrName, source },
        });
      },
    };
  },
};

export default rule;
