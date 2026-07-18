# Journeyman — OpenAI Build Week: Hackathon Brief

**The AI that won't do your homework.**

- **Event:** OpenAI Build Week — https://openai.devpost.com/
- **Track:** Education (one track per project; locked)
- **Deadline:** Tuesday 2026-07-21, 5:00 PM PDT (Submission Period Jul 13 9:00 AM – Jul 21 5:00 PM PT)
- **Judging:** Jul 22 10:00 AM – Aug 5 5:00 PM PT. Winners ~Aug 12 2:00 PM PT.
- **Prize targeted:** 1st Place Education — $15,000 + 2 DevDay passes (Sep 29, SF) + Codex team meeting + 1yr Pro. (2nd = $10,000.)
- **Field:** ~36,900 registered participants.
- **Entrant:** Jeff (solo). Project is new, created inside the Submission Period — clean eligibility.
- **Product spec:** see [SPEC.md](./SPEC.md). This file is the strategy; that file is the build.

---

## 1. The lane and why we chose it

**What we build:** an apprenticeship agent for adult career-changers. It handles
everything *except* the learning — gap analysis, planning, daily tasks, artifact
review, accountability — and it **refuses to do the learning for you**. Hints are
earned by demonstrated effort. Learning is proven, not claimed, via a public
proof-of-learning transcript.

**Why Education:**

- Emptiest track by every observable signal (forum scan, guide scan, zero visible
  education builds; Developer Tools is the most contested — Codex-native audience).
- The only track with a judge whose agenda is fully, publicly documented (Belsky).
- "Potential Impact" stories come easiest here (workforce readiness, access).
- FAQ explicitly welcomes non-traditional education projects and learners.

**The inversion that makes it novel:** every entrant will show AI doing more. We
show AI strategically doing *less* — withholding answers so the human grows. The
refusal mechanic and the anti-cheating verification mechanic are the *same
mechanism* (show-your-work). Nobody else will build that.

**Demo strategy — the inception loop:** Jeff is the demo user, dogfooding live
during the build. Declared learning goal: *"Ship a production-grade agentic product
with Codex + GPT-5.6."* The artifact is this project; the transcript's final entry
is the submission itself. Real user, real need, real evidence — zero seed-data work.

**Design stance (also a differentiator):** built from day one for learners with
constraints — health, caregiving, jobs. Async-first (no fixed schedules), chat-first
(low-friction input), agent-carried continuity (the plan survives your bad week).
Universal framing; no personal disclosure required anywhere public.

---

## 2. Rules digest — the binding constraints

Source: Official Rules + FAQs (fetched 2026-07-17). Rules prevail over the Devpost
plugin and any summary, including this one.

| Requirement | What it binds | Our compliance |
|---|---|---|
| Must use **Codex** | ChatGPT app, CLI, IDE ext, or SDK all count. Verified via `/feedback` Session ID from the thread where the *majority of core functionality* was built. | Codex CLI writes the code. One primary build thread from day one; `/feedback` ID captured before submission. README documents the collaboration. |
| Must use **GPT-5.6** | Must be *meaningful*, not decorative. FAQ: other models allowed for parts if 5.6 is genuinely used. Judges look for evidence in video + repo + README. | All mentor reasoning runs on Codex (GPT-5.6 family) on Plus/Pro auth. README names exactly where. |
| Third-party libs/SDKs | Allowed with license compliance; **disclose** third-party/pre-existing work. | Standard OSS stack (Next.js, Prisma, grammY…). README disclosure section. |
| **Video** | <3:00, public YouTube, English, **voiceover required** (AI narration OK), must cover what it does + how Codex was used + how GPT-5.6 is used. Showing Codex UI briefly = strong signal. FAQ: *record as you go*. | Dogfooding gives real footage daily. Cold-open on the refusal beat. Short Codex UI clip included. |
| **Repo** | Public (with license) or private shared with `testing@devpost.com` + `build-week-event@openai.com`. | Public, MIT, from day one. |
| **README** | Setup, sample data, how to test, **Codex-collaboration narrative**, GPT-5.6 integration points. Directly feeds judging. | README skeleton Monday; final pass Tuesday. |
| **Testing access** | Must provide link / functioning demo / test build, free of charge, kept alive **until judging ends (Aug 5)**. Judges not required to test. | Vercel deploy = landing + `/demo` + `/t/<slug>` from a committed static snapshot of Jeff's real data — no cloud DB, nothing to keep alive. Plus README ~10-minute local-run path (judge's own Postgres + own Codex auth). See SPEC §9. |
| One track per project | Enter Education only. | Locked. |
| Multiple submissions | Allowed if substantially different. | Not planned; one focused entry. |
| IP | Original work, solely owned; contracting for technical assistance allowed if work is the entrant's. OpenAI gets non-exclusive judging license + promo rights for 3 yrs. | All new code, Jeff-owned. |
| Credits | $100 free Codex credits — **form closed Jul 17 noon PT, will not reopen**. | Unclaimed. Runtime is $0 via existing Plus/Pro auth. No paid API usage. |

**Eligibility notes:** solo is fine; US resident fine; no conflict-of-interest
triggers. Devpost plugin is optional but its `$prepare-submission` command is a free
final audit — worth running Monday night.

**Judging mechanics (from rules):** Stage 1 = pass/fail (fits theme + reasonably
applies Codex/GPT-5.6). Stage 2 = four equally-weighted criteria; ties broken in
this order: Technological Implementation → Design → Potential Impact → Quality of
Idea. Judges "may or may not be listed individually" and may use "automated
AI-driven analysis" — build for the criteria first, the named judges second.

---

## 3. Judge map (the five listed judges)

Judges may change; treat this as optimization, not gospel. Sources cited.

### Thibault Sottiaux — Head of Product & Platform (created/led Codex)
- Super-app thesis: ChatGPT + Codex merging into a personal agent; goal "the world's
  best personal agent," "delightfully proactive." Delighted by *non-developer* Codex
  use. Success = "economic value per unit of time." Safe sandboxing non-negotiable;
  avoid opinionated frameworks. (Wired 2026; Fortune 2026-06; SE Daily #1898)
- **We press:** a personal agent producing real outcomes for a non-specialist; Codex
  as runtime, not just builder.

### Kath Korevec — Member of Product Staff, Codex (ex-GitHub, Vercel, Google Jules)
- "Stop managing AI": proactive systems must observe, personalize, act at the right
  moment, live in tools people already use. "Trust is now the most important DevEx
  feature." Polish over sprawl; respect developers, reduce friction. (kathykorevec.substack.com)
- **We press:** morning task + stall nudges in Telegram (a tool they already use);
  verified outputs (reviews, defenses) = trust.

### Tara Seshan — Member of Product Staff (ex-Stripe: Radar, Billing, Treasury GM; Thiel Fellow)
- Review Q1: "Who is the target user?" Demands evidence a need is real, "not a
  made-up need." Delegation frame: "describe the outcome → agent gathers context →
  polished artifact," with boundaries + review. Crisp success metrics. (First Round Review; Forbes 2026-06-30)
- **We press:** one named user (Jeff, live), a measurable artifact (transcript URL),
  demo structured as her delegation arc.

### Leah Belsky — VP & GM of Education (ex-Coursera CRO)
- No "answer machines" — AI must expand critical thinking; productive struggle must
  be engineered in (Study Mode). "Creation literacy" — students must learn to
  *create* with AI. Workforce readiness is her current obsession (ChatGPT Work).
  Access/equity framing; learning happens outside classrooms. (Business Insider 2025-08; OpenAI Podcast Ep. 4)
- **We press:** structural productive struggle (show-your-work ladder), learner
  creates real artifacts, weeks-long carried work, constrained-learner access.

### Peter Steinberger — Member of Technical Staff ("Clawfather", OpenClaw creator)
- Agents that *actually do things*, end-to-end, and close their own loop. CLI-first
  ("almost all MCPs should be CLIs"). Hates orchestration theater (subagent swarms,
  RAG cosplay). Build for yourself → open source. Next mission: "an agent even my
  mum can use." Local-first sympathies. (steipete.me; TechCrunch 2026-01/02)
- **We press:** the agent *acts* (reads repos, runs tests, messages you first);
  runtime shells out to the Codex CLI; scratch-our-own-itch origin; MIT repo.

---

## 4. Optimization map — criterion → feature → evidence

| Criterion (equal weight; tie-break order) | Our answer | Where judges see it |
|---|---|---|
| **1. Technological Implementation** | Built *by* Codex AND *on* Codex: the runtime's reasoning is Codex CLI sessions (voice) and repo review is `codex exec` clone+test+commit-trace (eyes). Commit-forensics = a genuinely novel Codex use. | `/feedback` session ID; commit history; README narrative; video shows Codex UI + architecture diagram. |
| **2. Design** | Full 7-stage loop, thin-but-real everywhere, deep on the two wow beats (artifact review, struggle engine). Polished dashboard + public transcript page. Async-first, chat-first, accessible. | Video walkthrough; live demo tenant; transcript page. |
| **3. Potential Impact** | Workforce readiness for adults retooling mid-career — including learners with constraints traditional programs exclude. Credible because it's real: the builder is the user. | Video problem statement + Jeff's live transcript; impact paragraph in description. |
| **4. Quality of the Idea** | The inversion: AI that refuses. Show-your-work = struggle + verification in one mechanism. "Your git history is your exam." Inception-loop demo. | Cold-open refusal beat; transcript forensics; closing loop shot. |

**Narrative assets:** tagline ("The AI that won't do your homework"), the gym line
("Using AI to do your learning is like sending a robot to the gym for you"), the
guild line ("a journeyman proved their craft with a masterwork — this is yours").

---

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Codex CLI latency/reliability in runtime path | Queue + retry in worker; degraded-mode notice; demo tenant pre-rendered so judging never depends on a live run. |
| ChatGPT-auth rate limits during heavy build days | Sequence heavy review jobs off-peak; cache all agent outputs in DB (never re-run for display). |
| Scope creep | **Scope locks Saturday.** Non-goals list in SPEC §10 is final. |
| Video overruns | Record as you go (per FAQ); Monday is recording day, Tuesday is edit+submit only. |
| Devpost upload failure at deadline | Submit Tuesday morning; draft submission early. |
| Judges can't run it live (no API credits) | Static-snapshot demo + public transcript + README local-run path (their own Postgres + their own Codex auth, ~10 min). See SPEC §9. |
| Stage-1 pass/fail | Codex/GPT-5.6 usage is structural, evidenced three ways (session ID, README, video). |

---

## 6. Submission checklist (Tuesday, before 5:00 PM PDT)

- [ ] Track selected: **Education**
- [ ] Text description (features + functionality, impact paragraph)
- [ ] Public YouTube video <3:00 with voiceover covering: what it does, how Codex was used, how GPT-5.6 is integrated
- [ ] Repo public (MIT) — or private + shared with `testing@devpost.com`, `build-week-event@openai.com`
- [ ] README: setup, sample data, how to test, Codex-collaboration story, GPT-5.6 points, third-party disclosure
- [ ] `/feedback` Codex Session ID from the primary build thread
- [ ] Live demo link + demo tenant credentials/path (kept alive through Aug 5)
- [ ] Devpost plugin `$prepare-submission` audit run Monday night (optional but free)
- [ ] Draft saved early; final submit **before noon PT** Tuesday

---

## 7. Calendar

| Day | Focus |
|---|---|
| **Fri 7/17** | Register (Join Hackathon). Repo + docs (this brief + SPEC). Next.js + Neon + Vercel skeleton. Telegram bot created (BotFather). First `codex exec` round-trip from worker. Master prompt v1. Jeff declares his goal in-product (dogfood day 0). |
| **Sat 7/18** | Core loop vertical slice: onboarding → gap analysis → plan → daily Telegram task → struggle engine. **Dogfooding begins. SCOPE LOCKS.** |
| **Sun 7/19** | The Eyes: artifact review (`codex exec` clone/test/forensics) + defense sessions + public transcript page. |
| **Mon 7/20** | Polish (Design criterion). Demo tenant seeded. README. Record video footage. `$prepare-submission` audit. |
| **Tue 7/21** | Edit video, publish, capture `/feedback` ID, final README, submit before noon PT. Buffer. |
