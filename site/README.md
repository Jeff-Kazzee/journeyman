# Journeyman static demo target

This directory is a separate Next.js 15.5.21 App Router target built with
`output: "export"`. It intentionally owns only the public judging routes and
imports the committed `../data/demo-snapshot.json`; the authenticated root app,
API handlers, login flow, Prisma client, and worker never enter this build.

Run `npm run snapshot` when intentionally refreshing the redacted local data,
then `npm run site:build` to produce and link-check `site/out/` without a
database or worker at build/runtime.

On this Windows host, Next process workers are blocked. The build preloads a
small repository-local adapter that removes Next's function-valued config
defaults only from the static-export thread message; application configuration
and output are otherwise unchanged.
