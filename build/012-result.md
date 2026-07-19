Implemented the separate static demo site. All build/type gates pass, and the authenticated app/worker behavior remains untouched.

## Architecture

The public site is an isolated Next App Router target under [site/](C:/Users/jeffk/hq/dev/journeyman/site/README.md:1), configured with `output: "export"` in [next.config.ts](C:/Users/jeffk/hq/dev/journeyman/site/next.config.ts:5).

This keeps `/app`, `/login`, API routes, Prisma, and authentication out of the static build graph. `npm run site:build` builds only `site/`, then validates its exported link graph.

A narrowly scoped preload adapter handles Next’s function-valued export configuration when using worker threads on this Windows host; it does not alter Next or worker runtime code.

## Source tree

```text
site/
├── README.md
├── next.config.ts
├── next-env.d.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── demo/page.tsx
│   ├── t/[slug]/page.tsx
│   └── whitepaper/page.tsx
├── components/
│   ├── site-shell.tsx
│   └── transcript-reader.tsx
├── lib/
│   ├── routes.ts
│   └── site-data.ts
└── public/brand/
    ├── journeyman-mark.svg
    └── owl/
        ├── checking.webp
        ├── planning.webp
        ├── protecting.webp
        ├── shipping.webp
        └── teaching.webp

styles/
└── journeyman-tokens.css

scripts/
├── check-site-links.ts
└── next-thread-worker-sanitize.cjs
```

Modified existing files:

- [package.json](C:/Users/jeffk/hq/dev/journeyman/package.json:19) and `package-lock.json`: site scripts and self-hosted Fontsource packages.
- [app/globals.css](C:/Users/jeffk/hq/dev/journeyman/app/globals.css:1): imports shared tokens without changing app behavior.
- [demo-snapshot.ts](C:/Users/jeffk/hq/dev/journeyman/lib/demo-snapshot.ts:1): typed attempts, hints, gap analysis, rubrics, and domain statuses.
- [export-demo-snapshot.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/export-demo-snapshot.ts:1): exports the current active plan and public `demo` alias.
- `data/demo-snapshot.json`: regenerated current redacted snapshot.
- [check-site-links.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/check-site-links.ts:1): validates routes, both navigation regions, self-links, fragments, `href`, `src`, `srcset`, and CSS `url(...)` assets.

## Design tokens

Defined in one source: [journeyman-tokens.css](C:/Users/jeffk/hq/dev/journeyman/styles/journeyman-tokens.css:1).

- Ink: `#0e1116`, `#151a21`, `#1b2129`, `#232b35`
- Parchment: `#fbf5e9`, `#f3ead9`, `#d4c8b5`
- Slate: `#a9b2bf`, `#8995a5`
- Amber: `#f6ca70`, `#dfa33f`, `#9a6420`
- Espresso `#3b2721`, cream `#fff3de`, rust `#e18b68`, teal `#69aaa1`
- Fraunces Variable for display; Inter Variable for body
- Spacing: `0.25rem` through `8rem`
- Focus ring: nested ink and amber rings

The flagged small slate text now measures 5.33:1; rust on espresso measures 5.40:1. The five owl files are 640×640 ARGB WebPs, retaining alpha on the dark background.

## Snapshot

Regeneration output:

```text
> journeyman@0.1.0 snapshot
> node --experimental-strip-types scripts/export-demo-snapshot.ts

Wrote C:\Users\jeffk\hq\dev\journeyman\data\demo-snapshot.json: 4 milestones, 17 tasks, 2 attempts, 2 hints, 0 transcript entries.
```

Exported data:

- 4 milestones
- 17 tasks
- 2 real attempts
- 2 real hints
- 7 ranked gap-analysis items
- 0 persisted transcript entries

The current database contains no persisted refusal event. I removed the fabricated refusal discovered during review. The hero and transcript now identify that snapshot boundary explicitly and render only the real attempt/hint text verbatim. Producing a historical refusal would require changing persistence behavior or supplying another source, both outside this pass.

## Gate outputs

`npm run site:build`:

```text
> journeyman@0.1.0 site:build
> node --require ./scripts/next-thread-worker-sanitize.cjs ./node_modules/next/dist/bin/next build site && npm run site:check

   ▲ Next.js 15.5.20
   - Experiments (use with caution):
     · cpus: 1
     ✓ workerThreads
     ⨯ webpackBuildWorker

   Creating an optimized production build ...
 ✓ Compiled successfully in 4.4s
   Skipping validation of types
   Skipping linting
   Collecting page data ...
   Generating static pages (0/7) ...
   Finalizing page optimization ...
   Collecting build traces ...
   Exporting (0/2) ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      131 B         102 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /demo                                  131 B         102 kB
├ ● /t/[slug]                            1.14 kB         103 kB
├   └ /t/demo
└ ○ /whitepaper                            131 B         102 kB
+ First Load JS shared by all             102 kB
  ├ chunks/131-dffa7e2f75ffb069.js       45.5 kB
  ├ chunks/c7879cf7-b5ab1053c1d9a2e7.js  54.2 kB
  └ other shared chunks (total)          1.97 kB


○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)


> journeyman@0.1.0 site:check
> node --experimental-strip-types scripts/check-site-links.ts site/out

site:links passed — 4 pages, 6 HTML files, 93 internal references, 2 nav regions per page.
```

`npx tsc --noEmit`: exit 0, no stdout.

`npm run worker:check`:

```text
> journeyman@0.1.0 worker:check
> tsc --project worker/tsconfig.json --noEmit
```

## Emitted pages

```text
site/out/index.html
site/out/demo/index.html
site/out/t/demo/index.html
site/out/whitepaper/index.html
```

## Deferred deliberately

- Pass B: replay mode, chat replay, rung illumination, scroll/terminal animation.
- Pass C: final owl composition, crop/placement polish, and final social art.
- Separate whitepaper pass: full whitepaper content.
- Later authenticated-app pass: full `/app` dark dashboard parity. This pass shares the tokens but does not restyle its existing light dashboard.

🟡 Build complete; current DB has no persisted refusal to render verbatim.