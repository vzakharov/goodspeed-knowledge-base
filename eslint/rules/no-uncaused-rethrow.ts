import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import * as ts from 'typescript';

import { hasTypeServices, type TypeServices } from './type-services';

const ERROR_SYMBOL = 'Error';
const CAUSE = 'cause';

/**
 * Whether `type` is an `Error` a consumer can read a stack off. The structural
 * fallback (`message` + `stack`) admits error-likes that never extend `Error`,
 * which is what most SDKs throw. `any`/`unknown` fail — the bare catch binding is
 * the shape that drops everything when an SDK throws a string.
 */
function isErrorType(type: ts.Type, seen: Set<ts.Type>): boolean {
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return false;
  }
  if (type.isUnion())
    return type.types.every((part) => isErrorType(part, seen));
  if (type.isIntersection()) {
    return type.types.some((part) => isErrorType(part, seen));
  }

  // A declaration cycle is invalid TS, but the checker still returns types.
  if (seen.has(type)) return false;
  seen.add(type);

  if (type.getSymbol()?.getName() === ERROR_SYMBOL) return true;
  if (type.getBaseTypes()?.some((base) => isErrorType(base, seen)) === true) {
    return true;
  }
  return (
    type.getProperty('message') !== undefined &&
    type.getProperty('stack') !== undefined
  );
}

/** The `cause` property of an object literal, or null when it has none. */
function causeProperty(node: ESTree.ObjectExpression): ESTree.Property | null {
  for (const property of node.properties) {
    if (property.type !== 'Property' || property.computed) continue;
    const { key } = property;
    const name =
      key.type === 'Identifier'
        ? key.name
        : key.type === 'Literal'
          ? key.value
          : null;
    if (name === CAUSE) return property;
  }
  return null;
}

/** True if the literal spreads another object, hiding whatever it contributes. */
function hasSpread(node: ESTree.ObjectExpression): boolean {
  return node.properties.some((property) => property.type === 'SpreadElement');
}

/**
 * Require a caught error to be carried forward as `{ cause }` when a `catch` block
 * throws a *new* error, and require that cause to be a real `Error`.
 *
 *   catch (error) { throw new HttpError(403, 'Invalid origin') }              // missingCause
 *   catch { throw new HttpError(413, 'Upload too large') }                    // unboundCatch
 *   catch (error) { throw new UserFacingError(msg, { cause: error }) }        // causeNotError
 *
 * A wrapper thrown without `{ cause }` starts its stack at the `throw` site, so
 * the failure that triggered it is gone from the logs. Interpolating
 * `getErrorMessage(error)` into the message is not a substitute: it keeps one line
 * and drops the original frames.
 *
 * Checking the cause's *type*, not just its presence, is what makes the rule worth
 * having: a non-Error cause carries no stack, and under
 * `useUnknownInCatchVariables` a bare `{ cause: error }` is exactly that case — so
 * presence alone would bless the one form most likely to be wrong. It's the test
 * `@typescript-eslint/only-throw-error` already applies to the `throw` position,
 * one argument over.
 *
 * A `throw` belongs to its innermost enclosing `catch`, so a nested `try`/`catch`
 * is judged against its own binding. A bare `throw error` is never flagged — only
 * `throw new …` loses information. Without type information the rule keeps its two
 * syntactic reports and skips `causeNotError`.
 *
 * The one fix is a suggestion, never an autofix, and only on `missingCause` with a
 * binding already narrowed to an `Error`. Appending an options argument to a
 * constructor that doesn't declare `ErrorOptions` emits code that doesn't compile,
 * and the real fix — widening the constructor — is beyond any fixer.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require { cause } carrying the caught Error when throwing a new error from a catch block',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingCause:
        'Throwing a new error from a catch block without `{ cause }` discards the original error and its stack. Pass the caught error as `cause`.',
      unboundCatch:
        'This catch block discards the caught error and throws a new one, so the original error and its stack are lost. Bind the error and pass it as `cause`.',
      causeNotError:
        '`cause` must be an `Error` — a cause that is not one carries no stack, so this loses the original failure. Wrap it in an `Error` before passing it.',
      addCause: 'Pass the caught error as `cause`.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    // Absent type information, the rule keeps its syntactic reports and treats any
    // `cause` as satisfying rather than going silent.
    const typeServices: TypeServices | null = hasTypeServices(services)
      ? services
      : null;

    function isError(node: ESTree.Node): boolean {
      if (typeServices === null) return true;
      return isErrorType(typeServices.getTypeAtLocation(node), new Set());
    }

    /**
     * Whether a non-literal argument might already carry a cause — an
     * `ErrorOptions` forwarded through a variable. Unreadable statically, so the
     * rule leaves it alone rather than report what it can't prove wrong.
     */
    function mayCarryCause(node: ESTree.Node): boolean {
      if (typeServices === null) return false;
      return (
        typeServices.getTypeAtLocation(node).getProperty(CAUSE) !== undefined
      );
    }

    /** The innermost `catch` clause `node` sits lexically inside, if any. */
    function enclosingCatch(node: ESTree.Node): ESTree.CatchClause | null {
      // `Program.parent` is null rather than absent, so both cases end the walk.
      type Linked = ESTree.Node & { parent?: ESTree.Node | null };
      let current = (node as Linked).parent;
      while (current !== undefined && current !== null) {
        if (current.type === 'CatchClause') return current;
        current = (current as Linked).parent;
      }
      return null;
    }

    /**
     * Inserts `, { cause: <expr> }` as a new final argument. Withheld when the
     * constructor is called with no arguments: `ErrorOptions` is never the first
     * parameter, so there is no sound place to put it.
     */
    function appendCause(
      fixer: Rule.RuleFixer,
      newExpression: ESTree.NewExpression,
      expression: string,
    ): Rule.Fix | null {
      const lastArgument = newExpression.arguments.at(-1);
      if (lastArgument === undefined) return null;
      return fixer.insertTextAfter(
        lastArgument,
        `, { ${CAUSE}: ${expression} }`,
      );
    }

    /**
     * Whether the binding is provably an `Error` where the cause would be inserted.
     * Narrowing is only observable at a *reference* and the declaration is always
     * `unknown`, so this reads a reference already inside the `new` expression
     * (`new HttpError(400, error.message)` under an `instanceof` guard). With none
     * to read it assumes the worst, which costs only the suggestion — the report
     * still fires.
     */
    function isNarrowedToError(
      clause: ESTree.CatchClause,
      newExpression: ESTree.NewExpression,
    ): boolean {
      const [variable] = sourceCode.getDeclaredVariables(clause);
      const [start, end] = newExpression.range!;
      const reference = variable?.references.find(({ identifier }) => {
        const [from, to] = identifier.range!;
        return from >= start && to <= end;
      });
      return reference !== undefined && isError(reference.identifier);
    }

    function reportMissingCause(
      clause: ESTree.CatchClause,
      newExpression: ESTree.NewExpression,
      binding: ESTree.Identifier,
    ): void {
      // Threading an `unknown` binding straight through would only trade this
      // report for `causeNotError`, so the suggestion is offered only where the
      // binding is already narrowed to an `Error`.
      const suggestable = isNarrowedToError(clause, newExpression);
      context.report({
        node: newExpression,
        messageId: 'missingCause',
        suggest: suggestable
          ? [
              {
                messageId: 'addCause',
                fix: (fixer) => {
                  const append = appendCause(
                    fixer,
                    newExpression,
                    binding.name,
                  );
                  return append === null ? [] : [append];
                },
              },
            ]
          : [],
      });
    }

    function reportUnboundCatch(newExpression: ESTree.NewExpression): void {
      context.report({ node: newExpression, messageId: 'unboundCatch' });
    }

    function reportCauseNotError(value: ESTree.Node): void {
      context.report({ node: value, messageId: 'causeNotError' });
    }

    return {
      ThrowStatement(node: ESTree.ThrowStatement) {
        if (node.argument.type !== 'NewExpression') return;
        const newExpression = node.argument;
        const clause = enclosingCatch(node);
        if (clause === null) return;

        for (const argument of newExpression.arguments) {
          if (argument.type === 'SpreadElement') return; // unreadable statically
          if (argument.type !== 'ObjectExpression') {
            if (mayCarryCause(argument)) return;
            continue;
          }
          if (hasSpread(argument)) return; // an options object we can't read
          const property = causeProperty(argument);
          if (property === null) continue;
          if (property.value.type === 'AssignmentPattern') return;
          if (isError(property.value)) return;
          reportCauseNotError(property.value);
          return;
        }

        const { param } = clause;
        if (param === null) {
          reportUnboundCatch(newExpression);
          return;
        }
        // A destructured binding has no name to pass along; report it, but there's
        // nothing for a suggestion to insert.
        if (param.type !== 'Identifier') {
          context.report({ node: newExpression, messageId: 'missingCause' });
          return;
        }
        reportMissingCause(clause, newExpression, param);
      },
    };
  },
};

export default rule;
