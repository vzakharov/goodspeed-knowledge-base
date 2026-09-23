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
 * Requires `program` too: both members come from the same project-service setup,
 * so it costs a rule that only reads types nothing and hands it the checker.
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
