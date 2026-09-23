# Not a Pages Router

Next looks for a Pages Router at `pages/`, then at `src/pages/` — and
`src/pages/` is the FSD pages layer. This empty directory is found first, so
Next reads an empty Pages Router here and leaves the layer alone. Delete it and
the build fails with "`pages` and `app` directories should be under the same
folder". `.claude/rules/fsd.md` § "Traps" carries it.
