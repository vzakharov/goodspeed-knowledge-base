import type * as ESTree from 'estree';
import type * as ts from 'typescript';

/**
 * The type-aware members of ESLint's `SourceCode.parserServices`. Present only
 * when the parser builds a TypeScript program (`projectService`), so a rule that
 * reads types must narrow through {@link hasTypeServices} and define what it does
 * without them — degrade to syntactic checks or stay silent, never guess.
 */
export type TypeServices = {
  getTypeAtLocation: (node: ESTree.Node) => ts.Type;
  program: ts.Program;
};

/**
 * Narrows the `any`-typed `parserServices` cast-free via the type predicate. Both
 * members come from the same project-service setup, so requiring `program` costs a
 * rule that only reads types nothing and hands it the checker for free.
 */
export function hasTypeServices(services: unknown): services is TypeServices {
  if (typeof services !== 'object' || services === null) return false;
  const candidate = services as {
    getTypeAtLocation?: unknown;
    program?: unknown;
  };
  return (
    typeof candidate.getTypeAtLocation === 'function' &&
    candidate.program !== null &&
    candidate.program !== undefined
  );
}
