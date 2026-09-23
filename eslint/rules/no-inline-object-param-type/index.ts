import type { Rule } from 'eslint';

import {
  type FunctionNode,
  isRedundantDefaultedObjectParam,
  leadingInsertPos,
  objectTypedParams,
  topLevelAnchor,
} from './ast';
import {
  buildAliasName,
  collectDeclaredNames,
  deriveBaseName,
  deriveSuffix,
} from './naming';
import { blockLocalBindings, collectTypeofRoots } from './scope';
import {
  collectInScopeTypeParams,
  collectTypeReferences,
  referencedTypeParams,
} from './type-params';

// Prohibits inline object type literals (`{ … }`) used directly as a function
// parameter's type annotation. Inline shapes can't be referenced, reused, or
// named at call sites and bloat signatures; a named `type` alias reads better
// and is reusable.
//
// Autofix (only when exactly one parameter is object-typed and a name can be
// derived for the alias). Two shapes:
//   - When the annotation is redundant — a destructured param whose fields all
//     have defaults and which itself defaults to `{}` — the fix drops the
//     annotation entirely (TypeScript infers the same shape from the defaults).
//   - Otherwise the literal is extracted to an alias named `<Base><Suffix>`:
//     - Base is the nearest enclosing name walking out from the function — its
//       own name (`FunctionDeclaration`/named-`FunctionExpression` id, or the
//       `const … = …` declarator), else a class/object **method** key
//       (`createProvider(settings:{…})` → `CreateProviderSettings`), a
//       `constructor` mapping to the enclosing class name, else the nearest
//       enclosing declarator/method/function name (covers nameless callbacks,
//       returned arrows, ternaries, curry chains — no library-specific casing).
//     - Suffix prefers the parameter's own name (`writeCsv(options:{…})` →
//       `WriteCsvOptions`), after stripping leading underscores (`_settings` →
//       `Settings`) and normalizing abbreviations (`opts` → `Options`, `ctx` →
//       `Context`); destructured-in-place / single-letter params fall back to a
//       role suffix (`Props` for a PascalCase/component base, else
//       `Options`/`Params`).
//
// The alias is inserted before the nearest top-level statement (always a legal
// spot for a `type`). Generic functions are handled precisely: if the literal
// references no in-scope type parameter it is hoisted plainly; if it references
// some, the alias carries exactly those (with their constraints/defaults
// mirrored) and is annotated `Alias<…>` at the use site, which resolves because
// the site is still lexically inside the enclosing scope.
//
// A function with more than one object-typed parameter is still flagged (each
// literal reported) but not auto-fixed — the names would be ambiguous, so the
// author extracts each to its own alias. Multiplicity itself is not the offense;
// the inline-ness of each literal is.

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Disallow inline object type literals in function parameters — extract them to a named type alias',
    },
    schema: [],
    messages: {
      extract:
        'Inline object type in a function parameter. Extract it to a named type alias (`type {{name}} = …`).',
      extractManual:
        'Inline object type in a function parameter. Extract it to a named type alias.',
      redundant:
        'Inline object type is redundant — every field has a default and the parameter defaults to `{}`, so the annotation can be dropped and inferred.',
      extractMultiple:
        'Inline object type in a function parameter, and this function has more than one — extract each to its own named type alias.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    // Alias names already claimed by an earlier report in this pass. Combined
    // with the module-scope collision guard, this makes two siblings that derive
    // the same name resolve to "first fixed, rest report-only" rather than both
    // emitting a colliding alias.
    const claimedAliasNames = new Set<string>();

    const checkFunction = (fn: FunctionNode): void => {
      const objectParams = objectTypedParams(fn);
      if (objectParams.length === 0) return;

      if (objectParams.length > 1) {
        for (const { literal } of objectParams) {
          context.report({ node: literal, messageId: 'extractMultiple' });
        }
        return;
      }

      const {
        literal,
        annotation,
        carrier,
        optional,
        paramName,
        paramDefault,
      } = objectParams[0]!;

      // Redundant annotation: destructured param, all fields defaulted, `= {}`.
      // Drop the annotation instead of extracting an alias.
      if (isRedundantDefaultedObjectParam(carrier, paramDefault, literal)) {
        context.report({
          node: literal,
          messageId: 'redundant',
          fix: (fixer) => fixer.remove(annotation),
        });
        return;
      }

      const base = deriveBaseName(fn);
      if (base === null) {
        context.report({ node: literal, messageId: 'extractManual' });
        return;
      }

      const aliasName = buildAliasName(
        base,
        deriveSuffix(paramName, base, optional),
      );

      // Collision guard: skip if the alias name is already declared at module
      // scope or claimed by an earlier report in this pass — extracting would
      // shadow/duplicate it. Report without a fix.
      if (
        collectDeclaredNames(sourceCode.ast).has(aliasName) ||
        claimedAliasNames.has(aliasName)
      ) {
        context.report({ node: literal, messageId: 'extractManual' });
        return;
      }

      const anchor = topLevelAnchor(fn);
      const inScope = collectInScopeTypeParams(fn, anchor, sourceCode);
      const referenced = referencedTypeParams(literal, inScope);

      // Safety guard: withhold if the literal references a binding a module-level
      // alias couldn't resolve — a type (directly, or via a mirrored constraint/
      // default) or a value (via `typeof`) declared in an intervening scope.
      const { typeNames: localTypes, valueNames: localValues } =
        blockLocalBindings(fn, anchor);
      if (localTypes.size > 0 || localValues.size > 0) {
        const typeRefs = new Set(collectTypeReferences(literal));
        for (const param of referenced) {
          for (const ref of param.constraintRefs) typeRefs.add(ref);
        }
        const valueRefs = collectTypeofRoots(literal);
        const unresolvable =
          [...typeRefs].some((ref) => localTypes.has(ref)) ||
          [...valueRefs].some((ref) => localValues.has(ref));
        if (unresolvable) {
          context.report({ node: literal, messageId: 'extractManual' });
          return;
        }
      }

      const typeParamDecl =
        referenced.length > 0
          ? `<${referenced.map((param) => param.text).join(', ')}>`
          : '';
      const useSiteArgs =
        referenced.length > 0
          ? `<${referenced.map((param) => param.name).join(', ')}>`
          : '';

      claimedAliasNames.add(aliasName);
      context.report({
        node: literal,
        messageId: 'extract',
        data: { name: aliasName },
        fix(fixer) {
          const aliasText = `type ${aliasName}${typeParamDecl} = ${sourceCode.getText(literal)};\n\n`;
          const pos = leadingInsertPos(sourceCode, anchor);
          return [
            fixer.insertTextBeforeRange([pos, pos], aliasText),
            fixer.replaceText(literal, `${aliasName}${useSiteArgs}`),
          ];
        },
      });
    };

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};

export default rule;
