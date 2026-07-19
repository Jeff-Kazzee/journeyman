import { Owl, SiteShell } from "../components/site-shell";
import { externalPages, featuredAttempt, featuredHint, snapshot, transcriptSlug } from "../lib/site-data";
import { withBase } from "../lib/routes";

const ladder = [
  ["01", "Socratic question", "One question aimed at the misconception in the learner’s actual attempt."],
  ["02", "Concept pointer", "One exact idea to look up, without handing over the implementation."],
  ["03", "Worked analogy", "The same reasoning pattern, transferred into a different domain."],
  ["04", "Partial scaffold", "Structure, checkpoints, or pseudocode—never the finished solution."],
  ["05", "Defense", "The learner explains the approach and predicts behavior before confirmation."],
] as const;

export default function HomePage() {
  const github = externalPages.find((page) => page.label === "GitHub")?.href ?? "#";
  return (
    <SiteShell current="home">
      <section className="hero section-dark" aria-labelledby="hero-title">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">01 · The refusal</p>
            <h1 id="hero-title">The AI that <em className="serif-pop">won’t</em> do your homework.</h1>
            <p className="hero-lede">Journeyman turns “just tell me” into the next honest rep—and leaves a public trail a reviewer can inspect.</p>
            <a className="button button-primary" href={withBase(`/t/${transcriptSlug}/`)}>Read the persisted conversation <span aria-hidden="true">→</span></a>
            <Owl pose="protecting" alt="Journeyman owl protecting a locked answer box" className="hero-owl" loading="eager" />
          </div>
          <div className="hero-stage">
            <div className="chat-window" aria-label="The refusal, then a real persisted attempt and its earned hint">
              <div className="chat-head"><span className="status-dot" />Journeyman mentor · demo learner session</div>
              <div className="chat-message learner"><span>You · cold ask</span><p>can you just write the scope doc for me?</p></div>
              <div className="chat-message mentor refusal"><span>Journeyman · the refusal</span><p>I won’t do “Choose One Narrow Agent Job” for you. You said: “can you just write the scope doc for me?”. Show me what you’ve tried—code, text, an error, a link, or a commit—and you earn the next hint.</p></div>
              {featuredAttempt ? <div className="chat-message learner"><span>You · the real attempt</span><p>{featuredAttempt.content}</p></div> : null}
              {featuredHint ? <div className="chat-message mentor hint"><span>Journeyman · level {featuredHint.level}/5 hint · earned</span><p>{featuredHint.content}</p></div> : null}
            </div>
            <p className="chat-footnote">Assembled from the demo learner's real session, abridged: the attempt and hint are persisted records rendered from the committed snapshot; the cold ask and refusal are reconstructed exactly as the session played them, because refusals are never stored, by design. The full unabridged exchange is on the transcript page.</p>
          </div>
        </div>
      </section>

      <section className="thesis section-amber" aria-labelledby="thesis-title">
        <div className="shell split-section">
          <div><p className="eyebrow ink-eyebrow">02 · The thesis</p><h2 id="thesis-title">Every AI will do your homework.</h2><p className="thesis-second">Journeyman makes you do it—and proves you did.</p></div>
          <Owl pose="planning" alt="Journeyman owl planning the learner’s next milestone" />
        </div>
      </section>

      <section className="receipts section-dark" id="receipts" aria-labelledby="receipts-title">
        <span className="ghost-num" aria-hidden="true">03</span>
        <div className="shell">
          <div className="section-heading with-owl"><div><p className="eyebrow">03 · The receipts</p><h2 id="receipts-title">A plan that can cite its sources.</h2><p>{snapshot.gapAnalysis?.summary ?? "The committed snapshot contains no gap analysis yet."}</p></div><Owl pose="checking" alt="Journeyman owl inspecting a document with a loupe" /></div>
          <div className="gap-grid">
            {snapshot.gapAnalysis?.gaps.map((gap) => <article className="gap-card" key={gap.rank}>
              <div className="rank">{String(gap.rank).padStart(2, "0")}</div>
              <h3>{gap.skill}</h3><p>{gap.whyItMatters}</p>
              <details><summary>See posting evidence</summary><div className="evidence-list">{gap.evidenceQuotes.map((evidence, index) => <blockquote key={`${evidence.jobPostIndex}-${index}`}>“{evidence.quote}”<cite>Job post {evidence.jobPostIndex + 1}</cite></blockquote>)}</div></details>
            </article>)}
          </div>
          <p className="caption">Nothing invented. Every gap cites the posting it came from.</p>
        </div>
      </section>

      <section className="ladder section-slate" aria-labelledby="ladder-title">
        <span className="ghost-num" aria-hidden="true">04</span>
        <div className="shell split-section ladder-layout">
          <div><p className="eyebrow">04 · The struggle ladder</p><h2 id="ladder-title">One honest attempt. One earned rung.</h2><p className="section-lede">Real attempts earn one rung. Cold asks earn a refusal.</p>
            <ol className="rung-list">{ladder.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
          </div>
          <Owl pose="teaching" alt="Journeyman owl at a blackboard, teaching the ladder step by step" />
        </div>
      </section>

      <section className="build-story section-dark" aria-labelledby="build-title">
        <span className="ghost-num" aria-hidden="true">05</span>
        <div className="shell section-heading with-owl"><div><p className="eyebrow">05 · Built by showing the work</p><h2 id="build-title">The mentor had to earn its own receipts.</h2><p>Journeyman was directed through bounded Codex passes, including <code>codex exec resume</code> threads. Mentor reasoning runs on GPT-5.6 with schemas, retries, persisted run logs, and a read-only default sandbox—the mentor that demands shown work was itself built by an agent that had to show its work.</p></div><Owl pose="planning" alt="Journeyman owl mapping the build plan" /></div>
        <div className="terminal" aria-label="Build workflow commands"><div className="terminal-bar"><span /><span /><span /><b>journeyman / build receipts</b></div><pre><code><em>$</em> codex exec --output-schema prompts/hint.schema.json{`\n`}<strong>✓</strong> one earned ladder level returned{`\n`}{`\n`}<em>$</em> codex exec resume --last{`\n`}<strong>✓</strong> bounded build thread resumed with its receipts{`\n`}{`\n`}<em>$</em> npm run site:build{`\n`}<strong>✓</strong> static export plus link-graph contract</code></pre></div>
        <div className="inline-links"><a href={github}>Browse the repository ↗</a><a href={`${github}#architecture`}>Read the integration map ↗</a><a href={`${github}/tree/main/build`}>Inspect public pass artifacts ↗</a></div>
      </section>

      <section className="try-it section-cream" aria-labelledby="try-title">
        <div className="shell section-heading with-owl"><div><p className="eyebrow ink-eyebrow">06 · Inspect it yourself</p><h2 id="try-title">No staged dashboard. No cloud dependency.</h2><p>Open the real snapshot, read the learner’s words, or run the local stack on your own Codex login.</p></div><Owl pose="shipping" alt="Journeyman owl shipping finished work" /></div>
        <div className="action-grid">
          <article><span className="card-number">01</span><h3>Watch the short tour</h3><p>A sub-three-minute product walkthrough is being prepared for the submission.</p><span className="disabled-action" aria-disabled="true">Video · coming</span></article>
          <article><span className="card-number">02</span><h3>Read the evidence</h3><p>Every persisted attempt and earned hint, rendered from the committed snapshot.</p><a href={withBase(`/t/${transcriptSlug}/`)}>Open transcript →</a></article>
          <article><span className="card-number">03</span><h3>Run it in ~10 minutes</h3><p>Local PostgreSQL, your Telegram bot, and your own authenticated Codex CLI.</p><a href={`${github}#quickstart-local-postgresql-17`}>Follow the README ↗</a></article>
        </div>
      </section>
    </SiteShell>
  );
}

