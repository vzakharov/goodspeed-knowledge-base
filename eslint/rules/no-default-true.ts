import type { Rule } from 'eslint';

// Flags boolean parameters that default to `true` — function/method params,
// destructured options, and component props (`x = true`). The mental model
// "something is always on unless it's switched off" is backwards: an option
// should default to off/clear and be explicitly enabled. Invert the parameter
// so the default is `false` (e.g. `enabled = true` → `disabled = false`), or
// drop the default and make it required where every caller already passes it.
//
// Only assignment-pattern defaults are flagged, so logical fallbacks
// (`x ?? true`), explicit call-site values (`foo({ x: true })`) and builder
// calls (`.default(true)`) are all left alone.
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow boolean parameters that default to true — default options off and enable them explicitly',
    },
    schema: [],
    messages: {
      noDefaultTrue:
        'Avoid a parameter that defaults to `true`. Options should default to off/false and be explicitly enabled — invert this parameter (e.g. `enabled = true` → `disabled = false`) or make it required.',
    },
  },

  create(context) {
    return {
      AssignmentPattern(node) {
        if (node.right.type === 'Literal' && node.right.value === true) {
          context.report({ node: node.right, messageId: 'noDefaultTrue' });
        }
      },
    };
  },
};

export default rule;
