# Journeyman — Product Specification

**The AI that won't do your homework.**

An apprenticeship agent for adult career-changers. It handles everything except the
learning — gap analysis, planning, daily tasks, artifact review, accountability —
and refuses to do the learning for you. Hints are earned by demonstrated effort.
Learning is proven, not claimed, via a public proof-of-learning transcript.

- Track: **Education** (OpenAI Build Week, deadline 2026-07-21 5:00 PM PDT)
- Strategy, rules, and judge map: [BRIEF.md](./BRIEF.md)
- Builder: Codex (CLI), directed by Jeff. Runtime: Codex CLI on ChatGPT auth. **$0 API spend.**
- First user: Jeff, live, goal = *"Ship a production-grade agentic product with Codex + GPT-5.6."*

---

## 1. Problem and user

AI made answers free. For a career-changer, that's a trap: any agent can produce the
portfolio, so the portfolio proves nothing, and the learner who outsources the reps
arrives at the interview hollow. What's scarce is *verified* learning — evidence
that a human did the work and understood it.

**User:** adults retooling mid-career — especially learners with constraints
(health, caregiving, jobs) who can't do fixed-schedule bootcamps. They need
async-first, self-paced structure with continuity that survives a bad week.

**First user's need is real and testable:** Jeff is shipping an agentic product in 4
days. Journeyman structures that as an apprenticeship and produces the transcript.

## 2. Design principles

1. **Earn the answer.** The agent never answers cold. Help is unlocked by
   demonstrated effort (§5.5). This is structural, not a prompt pinky-swear.
2. **The agent does everything *except* the learning.** Research, planning,
   scheduling, review, accountability = agent. Reps = human.
3. **Proactive, in tools they already use.** The agent initiates (morning task,
   stall nudge) in Telegram. The human never has to remember to check in.
4. **Proof over claims.** Every skill assertion links to raw evidence: attempts,
   hints used, defense scores, commit patterns.
5. **No orchestration theater.** One strong agent + a few sharp tools. No subagent
   swarms, no RAG pipelines, no framework cosplay.
6. **Accessible by default.** Async-first, chat-first (low-typing), large readable
   surfaces, no time-pressure mechanics anywhere.

## 3. The core loop (7 stages)

```
onboard ──► gap analysis ──► plan ──► daily task ──► struggle (ladder)
                                              │            │
                                              ▼            ▼
                                     artifact review ◄── attempts
                                              │
                                              ▼
                                     defense (viva) ──► transcript entry
```

Stages 1–3 run once per goal; 4–7 repeat per milestone. Everything persists; the
agent carries full context forward week over week.

## 4. Actors and surfaces

- **Web app** (Next.js): landing, auth, dashboard, plan, task detail, review
  reports, own transcript, public transcript, read-only demo tenant.
- **Telegram bot**: onboarding conversation, daily task delivery, struggle sessions,
  defenses, nudges. The proactive nervous system.
- **Worker** (Node, long-running on Jeff's machine): Telegram long-poll, cron
  schedule, executes all agent runs via the Codex CLI, writes results to DB.
- **Codex CLI** (`codex exec`): the entire reasoning engine — mentor voice *and*
  repo-review eyes. No other model provider. No paid API.

## 5. Feature specs

### 5.1 Onboarding (web + Telegram)
Conversational intake in Telegram: goal statement, target role, background,
constraints (hours/week, schedule limits), current self-assessed skills.
- Output: `LearnerProfile` row.
- Acceptance: a new user can go from `/start` to a stored profile in <5 minutes;
  profile is editable.

### 5.2 Gap analysis
User pastes 3–5 real job posts (text or URLs; text-first, fetching URLs is
best-effort). Agent extracts required skills per post, intersects them, diffs
against the profile.
- Output: ranked gap list (skill, why it matters, evidence quotes from posts).
- Acceptance: given 3 real posts, the gap list names ≥5 concrete skills with
  citations; no invented requirements.

### 5.3 Plan
Agent proposes a milestone plan: 2–6 milestones, each producing a real artifact;
each milestone = 2–8 tasks. User confirms or asks for changes in chat.
- Output: `Plan` + `Milestone` + `Task` rows; first task scheduled.
- Acceptance: every milestone has an explicit deliverable spec and a review rubric
  (used by §5.6); plan renders on the web dashboard.

### 5.4 Daily task + proactivity (worker cron)
- 07:00 local: today's task card via Telegram (title, brief, deliverable spec, why
  it matters).
- 19:00 local: if no activity on the active task today, one nudge. Never more than
  one nudge/day. Tone: coach, not hall monitor.
- Commands: `/task` (current), `/plan`, `/progress`, `/transcript`, `/pause`,
  `/resume`, `/help`.
- Acceptance: messages fire on schedule against a test chat; pause/resume works;
  nudge respects pause.

### 5.5 Struggle engine — the show-your-work ladder
All mid-task help happens in Telegram. Policy:

- **Never answers cold.** Any "how do I…" / "just tell me" gets: *"Show me what
  you've tried."*
- Hints are **earned**: the user posts an attempt (text snippet, error output, or a
  repo link + commit). Each genuine attempt unlocks the next ladder level:
  1. Socratic question that targets the misconception
  2. Pointer to the exact concept to look up
  3. Worked analogy from a different domain
  4. Partial scaffold (structure, not solution)
  5. Full solution — **only** inside a defense-style wrap-up where the user explains
     it back before it's confirmed (§5.7)
- The agent references the user's actual attempt in every hint (no generic tips).
- The agent tracks and displays ladder position ("you're at level 2 on this task").
- Acceptance: scripted scenario tests — cold ask → refused; fake attempt ("idk you
  tell me") → refused; real attempt → level-1 hint that quotes the attempt; ladder
  state persisted across sessions.

### 5.6 Artifact review — the Eyes
User links a GitHub repo (+ optional ref). Worker runs `codex exec` in a sandboxed
clone with a review prompt (§11): run the tests, review against the milestone
rubric, and produce **commit-trace forensics** — does the git history read like
incremental human learning (small commits, mistakes, fixes) or a paste-job (one
giant commit, no process)?
- Output: `Review` row — rubric scores, test results, forensic summary with
  evidence (commit hashes), strengths, next-step guidance. Rendered as a web report
  page; summary sent in Telegram.
- Acceptance: given a seeded "human" repo and a seeded "paste-job" repo, the
  forensic verdicts differ and cite commit evidence; full review stored (raw log +
  parsed JSON); report page renders without re-running the agent.

### 5.7 Defense (viva)
On milestone completion: a 5–8 question viva in Telegram. Explain decisions, trace
code, predict behavior, extend a feature. Answers scored against a rubric.
- Output: `Defense` row (transcript + per-question scores + overall).
- Acceptance: scoring rubric applied consistently; weak answers trigger follow-up
  probes before scoring; final summary states what was and wasn't demonstrated.

### 5.8 Proof-of-learning transcript
The north-star artifact. Public, no-auth page at `/t/<slug>`: per skill/milestone —
artifact links, defense scores, hints-used count, commit-forensic verdict, timeline.
Raw evidence linked, not just claims.
- Output: `TranscriptEntry` rows; public page; owner view adds export (Markdown).
- Acceptance: page renders from DB alone (no agent calls); a stranger can verify
  each claim by following evidence links; Jeff's real transcript exists by Monday.

## 6. Architecture

```
┌────────────┐   HTTPS    ┌──────────────────┐
│ Telegram   │ ◄────────► │ Worker (Node)     │     ┌─────────────┐
│ (users)    │            │  grammY long-poll │     │ Codex CLI   │
└────────────┘            │  node-cron        ├────►│ codex exec  │
                          │  agent runner     │     │ (GPT-5.6    │
┌────────────┐   HTTPS    │  outbound queue   │     │  on ChatGPT │
│ Web users  │ ◄────────► └───────┬──────────┘     │  auth)      │
│ + judges   │                    │ Prisma         └─────────────┘
└────────────┘            ┌───────▼──────────┐
                          │ PostgreSQL 17    │      ┌─────────────┐
┌────────────┐   HTTPS    │ local service,   │      │ Bellamente  │
│ Web app    │ ◄────────► │ trust-auth       │      │ (bella      │
│ Next.js on │            └──────────────────┘      │  serve)     │
│ Vercel     │            ┌──────────────────┐      │ mentor      │
└────────────┘            │ Worker ──────────┼────► │ long-term   │
                          │  memory adapter  │HTTP  │ memory      │
                          └──────────────────┘      └─────────────┘
```

- **Web:** Next.js 15.5.21 Maintenance LTS (App Router, TypeScript), Tailwind,
  deployed Vercel free tier.
- **DB:** **local PostgreSQL 17** (existing Windows service, trust-auth on
  loopback). Prisma ORM. Single source of truth — the web app never calls the
  agent; it renders DB state. No cloud database anywhere (see §9).
- **Mentor memory:** **Bellamente** (`bella serve`, `127.0.0.1:8080`) — the
  mentor's durable long-term memory of the learner (struggles, what landed,
  corrections). Worker calls its HTTP API (`POST /search`, `POST /memories`)
  around agent runs; graceful no-op when not running. Never the primary store;
  never secrets (per Bellamente's own contract).
- **Worker:** Node + tsx; grammY long-poll (no public webhook needed); node-cron;
  runs on Jeff's machine. All agent execution lives here.
- **Agent runner (`CodexService`):** spawns `codex exec` with a prompt file +
  working dir; enforces sandbox flags for repo review; parses JSON output against
  Zod schemas (one retry on malformed output); caches everything.
- **Config (no `.env` — deliberately):** the only secrets are
  `TELEGRAM_BOT_TOKEN` and `SESSION_SECRET`, provided as **user environment
  variables** (Windows `setx`; Vercel dashboard in prod). `DATABASE_URL` is
  credential-free (`postgresql://postgres@127.0.0.1:5432/journeyman`) and exists
  only as an overridable code default. There is no `.env` file in this project.
- **Auth:** Telegram-link — web shows a one-time code, user sends `/link <code>` to
  the bot, session cookie set. No email provider, no passwords. Public surfaces
  (landing, `/t/<slug>`, demo tenant) need no auth.

## 7. Data model (Prisma — names indicative)

`User(id, slug, telegramId?, telegramUsername?, createdAt)`
`LearnerProfile(id, userId, goal, targetRole, background, constraints, hoursPerWeek)`
`JobPost(id, userId, url?, rawText, parsedSkills Json)`
`Plan(id, userId, title, summary, status, createdAt)`
`Milestone(id, planId, idx, title, description, deliverableSpec, rubric Json, status)`
`Task(id, milestoneId, idx, title, brief, deliverableSpec, status, assignedAt?, completedAt?)`
`Attempt(id, taskId, userId, kind[text|link|commit], content, createdAt)`
`HintEvent(id, taskId, userId, level Int, content, attemptId, createdAt)`
`Artifact(id, userId, taskId?, repoUrl, ref?, createdAt)`
`Review(id, artifactId, engine, summary, rubricScores Json, forensics Json, rawLog, createdAt)`
`Defense(id, userId, milestoneId, status, qaTranscript Json, scores Json, createdAt)`
`TranscriptEntry(id, userId, kind[milestone|defense|review|skill], title, body, evidence Json, createdAt)`
`OutboundMessage(id, userId, channel, body, status, sentAt?)`
`AgentRun(id, kind, inputRef, promptVersion, status, output?, rawLog?, startedAt, finishedAt?)`

## 8. Web pages

| Route | Purpose |
|---|---|
| `/` | Landing: pitch, 3-step loop, demo video embed, request-access stub |
| `/login` | Telegram-link code flow |
| `/app` | Dashboard: current task, streak, milestone progress, latest review |
| `/app/plan` | Full plan, milestones, tasks, rubrics |
| `/app/tasks/[id]` | Task detail: attempts, hint ladder timeline, linked artifacts |
| `/app/reviews/[id]` | Review report: rubric scores, tests, commit-forensics viz |
| `/app/transcript` | Own transcript + Markdown export |
| `/t/[slug]` | **Public proof-of-learning transcript** (no auth) |
| `/demo` | Read-only demo tenant (Jeff's real data, snapshot) — the judge path |

## 9. Deployment and judge access (local-first, no cloud DB)

Three access modes, all honest:

1. **Live (Jeff):** local web (`next dev`) + local PostgreSQL 17 + worker on Jeff's
   machine + Telegram bot. This is what the video shows.
2. **Judge browsing (zero-setup):** the Vercel deploy serves the landing page plus
   `/demo` and `/t/<slug>` rendered from a **committed static snapshot**
   (`data/demo-snapshot.json`, produced by `scripts/export-demo-snapshot.ts` from
   Jeff's real local data). No database, no env vars, works with nothing installed,
   alive through Aug 5. The snapshot is regenerated before submission so judges see
   the real week.
3. **Judge live-run (~10 min):** README quickstart — clone, `npm i`, any local
   Postgres (or the trust-auth steps for the bundled instructions), own bot token +
   own OpenAI account with Codex; `npm run worker`. Judges are OpenAI employees
   with Codex; the product runs on *their* auth. This satisfies "functioning demo /
   test build" without violating ChatGPT-auth terms (we never serve third parties
   from Jeff's subscription).

## 10. Non-goals (scope lock — Saturday)

No adaptive mastery calibration · no multi-user social/cohort features · no email or
push channels · no mobile apps · no payments · no voice · no non-GitHub integrations
· no i18n · no scraping infra beyond best-effort URL fetch · no multi-tenant admin
tooling. Additions after Saturday require deleting something of equal size.

## 11. Prompt contracts (`prompts/` directory)

One file per agent task; each returns JSON validated by a Zod schema; each versioned
(`AgentRun.promptVersion`):

- `mentor.system.md` — persona, tone (direct, warm, coach), the ladder policy,
  refusal rules, accessibility stance. Included in every conversational run.
- `gap-analysis.md` — job posts + profile → ranked gaps with evidence quotes.
- `plan.md` — profile + gaps → milestones/tasks with deliverable specs + rubrics.
- `daily-task.md` — plan state + recent attempts → today's task card.
- `hint.md` — task + attempt + ladder level → next-level hint referencing the attempt.
- `review.md` — repo clone + milestone rubric → rubric scores, test results,
  commit-trace forensics with cited commit hashes.
- `defense.md` — milestone + artifacts → viva questions; then answers → scores.
- `transcript-entry.md` — milestone evidence bundle → transcript entry (claim +
  evidence links only, no inflation).

## 12. Build schedule

| Day | Deliverables (acceptance-tested) |
|---|---|
| Fri 7/17 | Repo, this spec, skeleton deploy (web+DB+bot echo), `codex exec` round-trip from worker, `mentor.system.md` v1, Jeff's profile created |
| Sat 7/18 | §5.1–§5.5 vertical slice live; dogfooding begins; **scope lock** |
| Sun 7/19 | §5.6–§5.8: reviews, defenses, public transcript |
| Mon 7/20 | Polish, `/demo` tenant, README, video recording, `$prepare-submission` audit |
| Tue 7/21 | Edit + publish video, `/feedback` ID, submit before noon PT |

## 13. Open questions (resolve Friday)

- Exact `codex exec` flags for headless JSON output + sandboxing (read Codex CLI
  docs; record the working invocation in README).
- Model identifier exposed by Codex on Plus/Pro auth, for accurate README claims.
- Task scheduling when a task spans multiple days (carry vs. regenerate) — default:
  carry, note in plan.
- Slug/public-page privacy toggle — default: public (it's the point), owner can
  unpublish.
- ~~Cloud DB choice~~ → resolved 2026-07-17: none. Local PostgreSQL 17 + static
  demo snapshot; no `.env` (user env vars for the two secrets).
- Bellamente adapter depth — v1: recall-on-agent-run + write-after-review/defense;
  anything richer is post-deadline.
