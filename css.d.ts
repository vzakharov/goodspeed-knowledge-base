// `noUncheckedSideEffectImports` needs a declaration for every binding-less import,
// and Next ships none for stylesheets; declaring only these extensions keeps the
// flag's coverage everywhere else. Each carries the CSS-module shape too, so a
// `*.module.*` import is typed whichever pattern TypeScript picks.
declare module '*.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.scss' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
