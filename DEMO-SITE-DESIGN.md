# Journeyman demo site — design spec

Design documentation for the public judging site (BRIEF §2 "Testing access",
SPEC §9). This is the target Codex builds to.

**Static-export caveat for Pass A:** the current app is NOT export-compatible
— `next.config.ts` uses `outputFileTracingIncludes` (server-only) and the app
carries `app/api` + `app/login` routes, which cannot coexist with
`output: 'export'`. The public site must either build as a separate static
target (own route group/app with its own config) or the demo build must strip
API/login routes. Decide in Pass A; don't discover it mid-build.

## 1. Purpose and hard constraints

- **Audience:** hackathon judges (Stage 2: four equally-weighted criteria;
  Design is the #2 tie-breaker) and anyone hitting the Devpost link. Judges may
  use automated AI analysis — the site's markup, copy, and README-linked code
  must read well to a machine, not just look good to a human.
- **Shape (locked):** landing + `/demo` + `/t/<slug>`, statically exported
  Next.js from a committed snapshot of Jeff's real data. No cloud DB, no
  backend, nothing that can fall over between Jul 22 and Aug 5.
- **Hosting:** Vercel (recommended — native Next static deploy). GitHub Pages
  is the fallback if Jeff prefers; nothing in this spec depends on the host.
- **Non-negotiables:** WCAG AA contrast, full keyboard navigation,
  `prefers-reduced-motion` honored everywhere (the product's accessibility
  stance is a stated differentiator — the demo site must embody it, not
  contradict it), LCP < 2s on 4G, zero layout shift, animations via
  transform/opacity only.

## 2. Brand

- **Name/line:** Journeyman — **"The AI that won't do your homework."**
- **Mascot:** the Journeyman Owl — the-little-ai-company's owl, specialized
  for this product: leather work apron, rolled sleeves, a craftsman's owl. He
  is the *agent* made visible. He never does the work for you; he inspects,
  points, and lights the way.
- **Owl pose set (generated with the OpenAI image API — on-brand: the whole
  build is the OpenAI stack):**
  1. **The Refusal** — wings crossed, head tilted, unimpressed. (Hero)
  2. **The Inspector** — loupe up to one eye, examining a document. (Receipts)
  3. **The Lantern** — holding out a single small lantern in the dark. (Hints:
     you get one light, not the sun)
  4. **The Signpost** — perched on a milestone marker. (Plan)
  5. **The Stamp** — pressing an approval seal. (Defense/ship)
  Consistent character across poses: same palette, same apron, flat-shaded
  illustration style with subtle grain — NOT photoreal, NOT 3D-render slop.
- **Palette — "workshop at night":** deep ink charcoal base (#0E1116-ish),
  warm amber craft accent (lantern light) for CTAs and highlights, parchment
  off-white for text, one restrained cool slate for secondary UI. **Explicitly
  banned:** the generic purple-gradient AI look. Warmth is the differentiator.
- **Type:** a characterful variable serif for display (e.g. Fraunces) — craft,
  print, apprenticeship — over a clean grotesk for body/UI (e.g. Inter or
  Space Grotesk). Self-hosted, subset, `font-display: swap`.

## 3. Landing page — a scroll-driven story in six beats

1. **Cold open / hero: the refusal, live.** A Telegram-style chat replays
   itself on load (typed-out messages, real timing): user pastes "Can you just
   tell me the answer?" → typing indicator → Journeyman's real refusal text
   (verbatim from the transcript). Beat lands with a subtle full-stop moment:
   the Refusal owl and the wordmark + tagline resolve in. One amber CTA:
   **"See the whole conversation"** → `/t/<slug>`.
2. **The thesis.** Two sentences, huge kinetic type, scroll-pinned: "Every AI
   will do your homework. Journeyman makes you do it — and proves you did."
3. **The receipts.** The real gap analysis: ranked gap cards that reveal on
   scroll, each flipping open to its verbatim job-post evidence quote with the
   quote text highlight-underlining itself. Inspector owl presides. Caption:
   "Nothing invented. Every gap cites the posting it came from."
4. **The ladder.** The 5-level struggle engine as an ascending rung diagram
   that lights one rung at a time: Socratic question → concept pointer →
   analogy → scaffold → defense. Lantern owl. Copy: "Real attempts earn one
   rung. Cold asks earn a refusal."
5. **The build story (Technological Implementation criterion).** Terminal-
   styled panel, typed-command animation: built by directing Codex
   (`codex exec` passes, resume thread), all mentor reasoning on GPT-5.6;
   the inception beat — the mentor that demands shown work was itself built by
   an agent that had to show its work (pass prompts + reports are public in
   `build/`). Links: repo, README integration map.
6. **Try it / footer.** Three cards: watch the video, open the live transcript,
   run it locally in ~10 min (README path). Stamp owl + MIT + Devpost link.

## 4. `/demo` and `/t/<slug>`

- **`/demo`** — the dashboard snapshot (plan, milestones with rubrics, task
  states) reskinned to the site palette. Static, real data, clearly labeled
  "snapshot of a real learner tenant — nothing staged."
- **`/t/<slug>`** — the public transcript: the full real conversation with a
  **replay mode** (play/pause/scrub; messages appear with original pacing) and
  a reader mode (all messages, searchable, anchor-linkable). Refusal and hint
  moments get subtle amber margin-markers so judges can jump straight to the
  wow beats. This page is the demo's soul: it is *evidence*, not marketing.

## 4b. Navigation contract (Jeff, 07-18: hard requirement)

- **One global nav, present on every page** (header; mirrored in the footer).
  It lists **every page of the site**: Home, Demo dashboard, Transcript (the
  canonical public slug), White paper — plus external: GitHub, Video,
  Devpost, and "Try the bot" (Telegram).
- **The current page's link disappears from the nav** — it renders as a
  plain "you are here" marker (non-clickable, visually distinct), never as a
  link to itself. Every other page is always one click away, from anywhere.
- No orphan pages, no dead ends: every page reachable from every page;
  consistent header/footer everywhere; the same nav order on all pages.
- **Automated gate (site passes):** a link-graph check in the build — every
  generated page must contain nav links to all other pages except itself,
  and zero broken internal links. Fails the build if violated.

## 5. Motion design rules

- Library: Framer Motion + CSS transforms; no scroll-jacking, no parallax
  soup. Motion serves the story: chat replay, reveal-on-scroll (60–120ms
  stagger), rung lighting, quote underlines, owl poses cross-fading per
  section.
- Every animation has a `prefers-reduced-motion` fallback: instant state, no
  autoplaying replay (shows a "play" affordance instead).
- Nothing blocks reading: all text is present in DOM at load (SEO + the
  automated-judge crawler), animation only decorates entry.

## 6. Asset manifest

| Asset | Source | Notes |
|---|---|---|
| Owl poses | **Existing TLAC brand kit** (`TLAC/public/brand/mascot/`): `protecting` = refusal/hero (owl locking the answer box), `checking` = receipts, `teaching` = ladder, `planning` = plan, `shipping`/`celebrating` = close; copied into `public/brand/owl/` | consistent production set already exists; OpenAI image gen only if a wings-crossed refusal or dark-bg treatment proves necessary |
| Hero OG image (1200×630) | `protecting` owl + tagline on workshop-dark | Devpost/social embeds |
| Favicon | TLAC owl mark SVG (existing) | |
| Chat replay data | real transcript JSON (snapshot) | verbatim, no editing beyond redaction rules |
| Terminal build-story clip | typed-text component, not video | keeps page static & light |

## 7. Judging alignment (why each beat exists)

| Criterion | Site evidence |
|---|---|
| Technological Implementation | Beat 5 terminal panel; README links; public `build/` pass logs |
| Design | The whole site: accessible, async-first, reduced-motion, polished loop presentation |
| Potential Impact | Beat 2 thesis + receipts (evidence-cited gaps → real employability skills) |
| Quality of Idea | Beat 1 refusal cold-open — the anti-homework mentor, instantly legible |

## 8. The dashboard wears the same system (Jeff, 07-18: non-negotiable)

The authenticated app (`/app`: plan, milestones, tasks, transcript) and the
public `/demo` (the same dashboard rendered from the snapshot) must meet the
SAME visual bar as the landing page — one design system, not a marketing site
with an admin panel behind it. Concretely:

- Shared tokens (palette, type, spacing, motion) live in one place; `/app`,
  `/demo`, and the landing all consume them. Dark workshop theme everywhere.
- Dashboard-specific polish: milestone cards with rubric reveal, task states
  with amber ACTIVE treatment, transcript with the same margin-markers as
  `/t/<slug>`, owl poses in empty states (e.g. `planning` before a plan
  exists, `celebrating` on milestone completion), skeleton loading states,
  keyboard focus everywhere.
- Access model (unchanged, and part of the pitch): magic-link from the bot →
  HMAC session cookie → every query user-scoped. Local-first: each user runs
  their own stack, so their data never leaves their machine and the operator
  pays nothing for other people's compute. Judges: static snapshot (free,
  Vercel) or README local-run on their own auth. Multi-tenant SaaS with
  metered billing is the stated post-hackathon roadmap, not a weekend build.

## 9. Build plan (Codex passes, per the standard workflow)

1. **Pass A — skeleton + design system:** palette/type tokens, layout, static
   export config, snapshot wiring, all copy in place unanimated. Gate:
   `next build` static export clean; Lighthouse ≥ 95 perf/a11y locally.
2. **Pass B — motion:** chat replay component, scroll reveals, ladder, reduced-
   motion fallbacks. Gate: interaction walkthrough recorded; a11y keyboard pass.
3. **Pass C — owl + art drop-in:** generated assets placed, OG/favicon, final
   polish. Gate: visual review by Jeff.
   Each pass lands feature-branch → PR into dev → adversarial review → merge.
