import { Owl, SiteShell } from "../../components/site-shell";

const abstract = "Every capable AI assistant will complete a learner's homework on request. That is precisely why none of them can teach. Journeyman is an AI apprenticeship mentor built on an inverted premise: the product's core feature is a refusal. Cold requests for answers are declined instantly and without model involvement; genuine attempts, and only genuine attempts, earn graduated help through a five-level hint ladder that never reaches “here is the solution” until the learner has defended their own understanding. Around that refusal sit three supporting disciplines: learning plans derived from verbatim evidence in real job postings rather than invented curricula; a local-first architecture in which the learner's data and compute never leave their machine; and a build process in which the mentor itself was constructed by directing one AI agent through bounded, gated passes while a second AI acted as tech lead, with every pass prompt and result committed publicly. The mentor that demands shown work was built by a process that shows its work.";

type Block = { kind: "p" | "quote" | "list"; text?: string; items?: string[] };
type PaperSection = { num: string; title: string; blocks: Block[] };

const sections: PaperSection[] = [
  {
    num: "01",
    title: "The problem: answers got cheap, evidence got expensive",
    blocks: [
      { kind: "p", text: "The cost of a correct answer has collapsed. Any learner with a chat window can produce working code, a finished essay, or a passable design document in seconds. Three consequences follow." },
      { kind: "p", text: "First, the traditional homework loop stopped producing learning. When the artifact can be generated without the struggle, completing the artifact no longer certifies the skill." },
      { kind: "p", text: "Second, employers noticed. Job postings in AI-adjacent engineering now ask for demonstrated evidence: incremental commit history, explained tradeoffs, tests that prove behavior, the ability to walk through a system's failure modes out loud. The postings Journeyman analyzes say this in plain text. One asks for candidates who “can show an incremental commit history demonstrating how they solved problems.” Another says “We care about clean architecture and evidence of shipped, maintainable work.” The market is repricing from answers to receipts." },
      { kind: "p", text: "Third, learners are caught between the two. The tool that makes practice unnecessary is the same tool they will be expected to use expertly, on top of fundamentals they never built. What a learner needs is not another answer engine. It is a mentor that holds the line their own discipline cannot, while leaving a trail of evidence an employer can inspect." },
    ],
  },
  {
    num: "02",
    title: "The refusal is the feature",
    blocks: [
      { kind: "p", text: "Journeyman's central interaction is deliberately uncomfortable. When a learner with an active task sends a message that contains no work, the mentor declines. From a real session:" },
      { kind: "quote", text: "Learner: can you just write the scope doc for me?\n\nJourneyman: I won't do “Choose One Narrow Agent Job” for you. You said: “can you just write the scope doc for me?”. Show me what you've tried. Paste the code, error output, a link, or a commit, and you earn the next hint." },
      { kind: "p", text: "Three design decisions inside that exchange are worth naming." },
      { kind: "p", text: "The refusal is deterministic, not model-generated. A message with no evidence of effort never reaches the model. The gate is a classifier in ordinary code: it recognizes solution-seeking (“just tell me”, “do it for me”), recognizes honest admissions (“I'm stuck”, “I did not do it”), and routes everything ambiguous toward the generous path. This has four properties a model-based gate would not have. It is instant. It is free, so a persistent user cannot burn the operator's compute by begging. It is ungameable by prompt injection, because there is no prompt. And it is auditable, because the exact conditions for refusal are readable in the source." },
      { kind: "p", text: "The refusal is not a wall; it is a price list. Every refusal states what earns help: code, error output, a link, a commit. Honest admissions of being stuck get a different response entirely, one that shrinks the task and reminds the learner that even a broken fragment earns a hint. The system distinguishes “give me the answer” from “I am struggling,” because conflating those two is how real mentors lose students. This distinction was not in the first implementation. Live use exposed that identical canned refusals, repeated verbatim, read as scripted and shamed users who were honestly stuck. The classifier was rebuilt the same night: refusal phrasings rotate and name the active task, admissions get supportive nudges, escalation triggers only on consecutive cold asks, and any message carrying technical content routes to the hint path. The bias is explicit: a false hint costs one model call; a false refusal silently discards a learner's real work." },
      { kind: "p", text: "Help is graduated, never total. A genuine attempt earns exactly one rung of a five-level ladder: a Socratic question aimed at the misconception in the actual attempt; an exact concept to look up; a worked analogy from another domain; a partial scaffold with structure and checkpoints but no solution; and finally a defense, in which the learner explains the approach back and predicts behavior before it is confirmed. No full solution appears before the learner has done the explaining. From the same session, an attempt containing a real function and a real error (“RequestError [HttpError]: Not Found” on a private repository) earned this level-two hint:" },
      { kind: "quote", text: "Look up GitHub REST API “authentication” and “404 Not Found for private resources.” Focus on how Octokit receives authentication when the client is constructed, not in listCommits, and why GitHub may conceal the existence of a private repository from an unauthenticated or unauthorized caller." },
      { kind: "p", text: "That is a mentor's move: name the concept, point at the exact seam in the learner's own code, explain why the confusing behavior is intentional, and stop." },
    ],
  },
  {
    num: "03",
    title: "Plans that cite their sources",
    blocks: [
      { kind: "p", text: "Most AI-generated learning plans are confident hallucinations: plausible curricula for an imagined job market. Journeyman constrains plan generation with an evidence rule enforced at the schema level." },
      { kind: "p", text: "The learner pastes real job postings for roles they actually want. The gap analysis that follows must rank concrete skill gaps, and every gap must carry verbatim quotes from those postings, with an index pointing at which posting each quote came from. The output schema requires the quotes; the mentor's prompt forbids invented requirements; rendered output shows the receipts under every claim. If the postings do not support a gap, the gap does not appear." },
      { kind: "p", text: "The plan built from those gaps follows the same discipline. Each milestone must define an inspectable deliverable and a review rubric of observable criteria, phrased so a third party could check them: “A reviewer can stop the service during a workflow, restart it, and resume without losing completed steps.” Tasks are bounded, asynchronous, and sized to the learner's stated hours per week. The unit of progress is never “watched the course.” It is an artifact someone can open." },
      { kind: "p", text: "This matters beyond pedagogy. The learner's transcript of attempts, hints, and artifacts becomes exactly the evidence trail the job postings ask for. The product's output and the market's demand are the same object." },
    ],
  },
  {
    num: "04",
    title: "Local-first: the architecture is the privacy policy",
    blocks: [
      { kind: "p", text: "Journeyman runs entirely on the learner's machine: a Telegram bot for the conversation, a local PostgreSQL database for state, a web dashboard for the plan, and the OpenAI Codex CLI (running on GPT-5.6) for mentor reasoning, authenticated with the learner's own account. The consequences are structural rather than contractual." },
      { kind: "list", items: [
        "Privacy. Job postings, attempts, struggle history, and every hint live in a database the learner owns. There is no server to breach and no operator who could read the data if they wanted to. Public sharing exists, but as an explicit act: a transcript page a learner can choose to publish, rendered from a committed snapshot.",
        "Cost. Compute follows the user. Each learner's mentor reasoning runs on their own model authentication, so the operator pays for exactly one user: themselves. There is no marginal cost per learner and no incentive to degrade the mentor to protect a margin. A multi-tenant hosted version with metered billing is a straightforward roadmap item, not a prerequisite.",
        "Honest failure modes. Agent calls are long (a real plan generation takes one to three minutes) and sometimes fail. Every agent invocation writes a forensic log capturing the final message, stdout, and stderr for every attempt; conversation state persists intermediate results the moment they exist; and on startup the worker sweeps for conversations stranded mid-run by a crash and moves them to a retryable state without sending a word. A design rule learned the hard way: recovery is best-effort and must never be able to block boot.",
        "Accessibility as a default, not a feature. The interface is chat-first and asynchronous. Tasks arrive on the learner's schedule; missed days produce no shame mechanics; every mentor message is plain text that works with screen readers and low-bandwidth connections.",
      ] },
    ],
  },
  {
    num: "05",
    title: "Building an agent with an agent",
    blocks: [
      { kind: "p", text: "Journeyman's construction is a second argument for its thesis. All product code was written by OpenAI Codex, directed through bounded passes: a written prompt stating scope, constraints, and verification gates; an isolated execution with workspace-write sandboxing; a written result report; and independent verification of the gates before the pass counts. Claude acted as tech lead: writing pass prompts, reviewing diffs, running end-to-end drives with a scripted fake user against the real system, and refusing to accept “should work” in place of observed behavior. Every pass prompt and result is committed to the public repository, in build/." },
      { kind: "p", text: "The process caught what solo velocity would have shipped. A sample from the actual log:" },
      { kind: "list", items: [
        "Structured-output schemas silently truncate long constant strings at roughly 39 characters, which produced a bug that could never round-trip validation. Proven with isolated reproductions; fixed by keeping constants out of schemas and asserting equality in calling code.",
        "The structured-output endpoint rejects JSON Schema propertyNames, which Zod emits for records with constrained keys, and separately rejects record-style objects whose emitted schema leaves a property out of properties while required still lists it. Two distinct HTTP 400s, diagnosed from raw logs after the surfaced error message pointed somewhere else entirely. The fix replaced the record with an array of criterion/description objects across every consumer.",
        "An error-handling wrapper that re-threw only the last failure source manufactured misleading JSON syntax errors and misdirected a full day of debugging. It was replaced with an error that names every source's failure.",
        "End-to-end drives with a fake user proved the full loop twice on real model calls, onboarding through refusal through earned hint, and caught a coupling bug in which a successful gap analysis was silently suppressed when the subsequent plan step failed.",
        "Every merge to the integration branch passed an adversarial review: multiple independent reviewer agents with distinct lenses (schema contracts, runtime resilience, security and content quality), each required to prove findings with file-and-line evidence, each verdict posted publicly on the pull request. Reviews found, among other things, a boot path that could take the whole bot down and a classifier regression that would have discarded genuine attempts. Both were fixed before merge.",
      ] },
      { kind: "p", text: "None of this is a claim that agents build software unsupervised. It is the opposite claim, and the same claim the product makes about learning: the agent produces; the value is created by the gate that demands evidence. Direction, verification, and refusal to accept unshown work are where the quality comes from." },
    ],
  },
  {
    num: "06",
    title: "Limitations and future work",
    blocks: [
      { kind: "list", items: [
        "The attempt classifier is heuristic. It is tuned to prefer false hints over false refusals, and live use has already forced one rebuild. Adversarial learners can defeat it; the cost of their success is a hint, not a solution.",
        "Artifact review is the next frontier. Rubrics exist in every milestone; the pipeline that reviews a learner's actual repository against them, with the same evidence discipline, is designed but not yet shipped, along with defense sessions in which the learner explains their work before a milestone closes.",
        "Single-tenant by design, for now. The local-first architecture serves one learner per installation. Multi-tenancy is a hosting and billing problem, deliberately deferred.",
        "Model dependence. Mentor quality is bounded by the underlying model's judgment. The system constrains shape, grounding, and generosity, but it cannot make a weak model wise.",
      ] },
    ],
  },
  {
    num: "07",
    title: "Conclusion",
    blocks: [
      { kind: "p", text: "The interesting question about AI and learning was never whether AI can do the work. It obviously can. The question is what structure turns an infinitely helpful machine into something that makes a person more capable instead of less. Journeyman's answer is a set of refusals: refuse cold asks, refuse invented curricula, refuse to hold user data, refuse unverified code, and refuse the pretense that any of it works until a real session proves it end to end." },
      { kind: "p", text: "Show your work. The mentor did." },
    ],
  },
];

export default function WhitepaperPage() {
  return (
    <SiteShell current="whitepaper">
      <section className="page-hero whitepaper-hero section-dark">
        <div className="shell split-section">
          <div>
            <p className="eyebrow">White paper</p>
            <h1>An AI mentor that refuses to do the work.</h1>
            <p className="abstract-label">Abstract</p>
            <p className="abstract">{abstract}</p>
            <div className="paper-meta"><span>Journeyman · July 2026</span><span>MIT licensed</span><span>Every quote drawn from committed logs and real sessions</span></div>
          </div>
          <Owl pose="teaching" alt="Journeyman owl teaching beside the white paper" />
        </div>
      </section>
      <section className="paper-body section-dark">
        <div className="shell paper-prose">
          {sections.map((section) => (
            <article className="paper-section" id={`section-${section.num}`} key={section.num}>
              <h2><span className="paper-num">{section.num}</span>{section.title}</h2>
              {section.blocks.map((block, index) => {
                if (block.kind === "quote") return <blockquote className="paper-quote" key={index}>{block.text}</blockquote>;
                if (block.kind === "list") return <ul className="paper-list" key={index}>{block.items?.map((item, i) => <li key={i}>{item}</li>)}</ul>;
                return <p key={index}>{block.text}</p>;
              })}
            </article>
          ))}
          <p className="paper-colophon">Every quoted mentor response, error message, and process detail in this paper is drawn from the repository's committed build logs, pull request reviews, and real session transcripts. Nothing was composed for illustration.</p>
        </div>
      </section>
    </SiteShell>
  );
}
