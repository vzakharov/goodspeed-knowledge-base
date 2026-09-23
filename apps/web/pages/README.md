# Not a Pages Router

Next looks for a Pages Router at `pages/` before `src/pages/`, which is the FSD
pages layer. This empty one is found first and keeps Next off the layer; delete
it and the build fails with "`pages` and `app` directories should be under the
same folder". `.claude/rules/fsd.md` § "Traps" carries it.
