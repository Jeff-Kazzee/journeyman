# Pass 12 (Site Pass A) — public demo site: skeleton + design system

Read `DEMO-SITE-DESIGN.md` at the repo root FIRST — it is the complete target
(brand, palette, type, six-beat landing, /demo, /t/<slug>, dashboard parity
§8, navigation contract §4b, static-export caveat in the header, asset
manifest §6). This pass builds the SKELETON + DESIGN SYSTEM: every page,
every section, all copy and layout in place, tokens established — NO
animations yet (Pass B) and NO final art placement beyond what exists (owl
assets land fully in Pass C, but wire the ones already available).

## Scope

1. **Resolve the static-target architecture** per the header caveat: the
   authenticated app (`app/api`, `app/login`, `/app`) is not
   export-compatible. Choose and implement the cleanest structure for a
   separate static demo target (own Next config with `output: 'export'` and
   its own route group/app dir, or equivalent) that can build alongside the
   dev app without breaking it. Document the choice in a short comment/README
   note.
2. **Design tokens** (one source): workshop-at-night palette (deep ink
   charcoal base, warm amber accent, parchment text, restrained slate;
   espresso/cream/rust/teal accents harmonizing with the TLAC kit), Fraunces
   (display) + Inter (body) self-hosted subsets, spacing scale, focus rings.
   Dark theme is the design; keep WCAG AA contrast.
3. **Pages, all reachable, per the §4b nav contract:** Home (six beats of
   §3, real copy, static chat markup for the hero — replay animation comes in
   Pass B), `/demo` (dashboard snapshot: plan, milestones with array rubrics,
   task states), `/t/<slug>` (transcript reader mode: all messages, refusal +
   hint margin markers; replay mode is Pass B), `/whitepaper` (stub page with
   title + abstract placeholder — content lands separately). Global header
   nav + footer on every page listing every page; the CURRENT page renders as
   a non-clickable "you are here" marker, never a self-link; external links:
   GitHub repo, "Try the bot" (https://t.me/JourneyJohnbot), Video and
   Devpost as disabled placeholders marked "coming".
4. **Snapshot wiring:** regenerate the committed snapshot from the CURRENT
   local DB via the existing `scripts/export-demo-snapshot.ts` (Jeff now has
   an ACTIVE plan, milestones with array rubrics, real attempts + hints —
   the old snapshot predates all of it). Respect the exporter's existing
   redaction rules; do not invent new data. `/demo` and `/t/<slug>` render
   ONLY from the snapshot (no DB at build/runtime for the static target).
   Use the real refusal + hint moments from the transcript as the landing's
   hero chat content (verbatim).
5. **Link-graph build gate** (§4b): a script (`scripts/check-site-links.ts`
   or similar) that walks the exported output and FAILS if any page lacks
   nav links to all other pages, contains a self-link in the nav, or has any
   broken internal link/asset reference. Wire it into the static target's
   build script (`npm run site:build` = export + check).
6. **Owl assets available now:** copy from
   `C:\Users\jeffk\hq\dev\the-little-ai-company\TLAC\public\brand\` into the
   static target's public dir: the mark SVG (favicon + header), and mascot
   poses per the §6 manifest mapping (protecting/checking/teaching/planning/
   shipping). Place protecting on the hero and one pose per section at
   skeleton fidelity (final art direction polish is Pass C). Verify alpha
   renders cleanly on the dark background.

## Constraints

- The running WORKER must not be touched; the web `next dev` server has been
  stopped by the director for this pass — you MAY run builds. Do not start
  long-running dev servers and leave them running.
- Do not modify worker code, prompts, schemas, or the authenticated app's
  behavior (styling refactors that share tokens are allowed if they don't
  change auth/data logic — dashboard restyle itself is a later pass).
- No new heavyweight deps: Tailwind (already present) + framer-motion may be
  ADDED for Pass B use, but no UI kits, no component libraries.
- No git operations. Temp files in build\tmp\.

## Gates (run and paste output)

1. `npm run site:build` (or the script you define): static export builds
   clean AND the link-graph check passes.
2. `npx tsc --noEmit` green.
3. The dev app still typechecks (`npm run worker:check` untouched-green) and
   the exported output contains: index, demo, at least one /t/<slug>,
   whitepaper — list the emitted files.

## Report

Architecture choice + why; files created (tree); token values chosen;
snapshot regeneration stats (counts of milestones/tasks/attempts/hints
exported); gate outputs verbatim; anything from the design doc deliberately
deferred to Pass B/C.
