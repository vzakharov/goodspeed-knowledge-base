// Next ships no declaration for plain stylesheets, which `noUncheckedSideEffectImports`
// demands of any binding-less import. Declaring only the extensions its bundler owns
// keeps the flag's coverage for every other side-effect import. Both carry the CSS
// module shape too, so a `*.module.*` import is typed whichever pattern TypeScript
// picks — and keyed access stays explicit, as `noPropertyAccessFromIndexSignature` asks.
declare module '*.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.scss' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
