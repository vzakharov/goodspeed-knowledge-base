// React strips `key` and `ref` from spread props, so folding `key={key}` into
// `{...{ key }}` silently drops the key. A spread carrying one is opaque.
export const RESERVED_JSX_ATTRS = new Set(['key', 'ref']);
