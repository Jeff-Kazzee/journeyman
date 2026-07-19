import { Owl, SiteShell } from "../components/site-shell";
import { externalPages, featuredAttempt, featuredHint, snapshot, transcriptSlug } from "../lib/site-data";
import { withBase } from "../lib/routes";

const ladder = [
  ["01", "A nudge", "One question, aimed right at the spot where you're stuck."],
  ["02", "A thing to look up", "The name of the exact idea you're missing. The reading is yours."],
  ["03", "Same idea, different picture", "The reasoning, shown somewhere else, so you can carry it back yourself."],
  ["04", "A skeleton", "Structure and checkpoints. The building is still on you."],
  ["05", "You explain it back", "Before anything gets confirmed, you walk Hoolio through how it works and what it'll do."],
] as const;

export default function HomePage() {
  const github = externalPages.find((page) => page.label === "GitHub")?.href ?? "#";
  return (
    <SiteShell current="home">
      <section className="hero section-dark" aria-labelledby="hero-title">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">01 · Meet Hoolio</p>
            <h1 id="hero-title">The AI that <em className="serif-pop">won’t</em> do your homework.</h1>
            <p className="hero-lede">Pick the job you want. Hoolio reads the actual job ads, finds what you’re missing, and hands you real work to close the gap. He’ll help when you’re stuck. He just won’t do it for you. That’s the whole point.</p>
            <a className="button button-primary" href={withBase(`/t/${transcriptSlug}/`)}>Read a real conversation <span aria-hidden="true">→</span></a>
            <Owl pose="protecting" alt="Hoolio the owl, calmly keeping an answer box locked" className="hero-owl" loading="eager" />
          </div>
          <div className="hero-stage">
            <div className="chat-window" aria-label="A cold ask, the refusal, then a real attempt and its earned hint">
              <div className="chat-head"><span className="status-dot" />Hoolio · a real learner session</div>
              <div className="chat-message learner"><span>You · asking cold</span><p>can you just write the scope doc for me?</p></div>
              <div className="chat-message mentor refusal"><span>Hoolio · the refusal</span><p>I won’t do “Choose One Narrow Agent Job” for you. You said: “can you just write the scope doc for me?”. Show me what you’ve tried—code, text, an error, a link, or a commit—and you earn the next hint.</p></div>
              {featuredAttempt ? <div className="chat-message learner"><span>You · showing your work</span><p>{featuredAttempt.content}</p></div> : null}
              {featuredHint ? <div className="chat-message mentor hint"><span>Hoolio · hint {featuredHint.level}/5 · earned</span><p>{featuredHint.content}</p></div> : null}
            </div>
            <p className="chat-footnote">Put together from the demo learner's real session, shortened. The attempt and the hint are saved records, shown straight from the data. The cold ask and the refusal are rebuilt exactly as the session played them, because refusals are never stored. On purpose. The whole conversation is on the transcript page.</p>
          </div>
        </div>
      </section>

      <section className="thesis section-amber" aria-labelledby="thesis-title">
        <div className="shell split-section">
          <div><p className="eyebrow ink-eyebrow">02 · The thesis</p><h2 id="thesis-title">Every AI will do your homework.</h2><p className="thesis-second">Journeyman makes you do it, then proves you did.</p></div>
          <Owl pose="planning" alt="Hoolio sketching out a learner’s next milestone" />
        </div>
      </section>

      <section className="receipts section-dark" id="receipts" aria-labelledby="receipts-title">
        <span className="ghost-num" aria-hidden="true">03</span>
        <div className="shell">
          <div className="section-heading with-owl"><div><p className="eyebrow">03 · The receipts</p><h2 id="receipts-title">Your plan comes from real job ads.</h2><p>Paste in postings for jobs you actually want. Hoolio reads them and lists what you’re missing, and every gap points back at the exact line in the ad that asked for it. {snapshot.gapAnalysis?.summary ? "Here’s the demo learner’s real list:" : "No saved gap list to show yet."}</p></div><Owl pose="checking" alt="Hoolio reading a job posting with a loupe" /></div>
          <div className="gap-grid">
            {snapshot.gapAnalysis?.gaps.map((gap) => <article className="gap-card" key={gap.rank}>
              <div className="rank">{String(gap.rank).padStart(2, "0")}</div>
              <h3>{gap.skill}</h3><p>{gap.whyItMatters}</p>
              <details><summary>See it in the job ad</summary><div className="evidence-list">{gap.evidenceQuotes.map((evidence, index) => <blockquote key={`${evidence.jobPostIndex}-${index}`}>“{evidence.quote}”<cite>Job post {evidence.jobPostIndex + 1}</cite></blockquote>)}</div></details>
            </article>)}
          </div>
          <p className="caption">Nothing invented. Every gap cites the posting it came from.</p>
        </div>
      </section>

      <section className="ladder section-slate" aria-labelledby="ladder-title">
        <span className="ghost-num" aria-hidden="true">04</span>
        <div className="shell split-section ladder-layout">
          <div><p className="eyebrow">04 · The struggle ladder</p><h2 id="ladder-title">Show your work, earn your help.</h2><p className="section-lede">Send Hoolio something real: code, a broken draft, an error message, a link. That earns one step of help. Ask cold and you get a polite no. Five steps, and the last one is you doing the explaining.</p>
            <ol className="rung-list">{ladder.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
          </div>
          <Owl pose="teaching" alt="Hoolio at a blackboard, walking through the ladder one step at a time" />
        </div>
      </section>

      <section className="build-story section-dark" aria-labelledby="build-title">
        <span className="ghost-num" aria-hidden="true">05</span>
        <div className="shell section-heading with-owl"><div><p className="eyebrow">05 · Built the same way</p><h2 id="build-title">The owl had to show his work too.</h2><p>Journeyman’s code was written by OpenAI Codex, one tightly scoped pass at a time, with the build passes committed to the public repo, including <code>codex exec resume</code> threads. The mentor’s reasoning runs on GPT-5.6 with strict output rules, retries, and saved run logs. The mentor that demands shown work was built by an agent that had to show its work.</p></div><Owl pose="planning" alt="Hoolio mapping out the build plan" /></div>
        <div className="shell"><div className="terminal" aria-label="Build workflow commands"><div className="terminal-bar"><span /><span /><span /><b>journeyman / build receipts</b></div><pre className="code-block"><code>
          <span className="tok-prompt">$ </span><span className="tok-cmd">codex</span><span className="tok-arg"> exec</span><span className="tok-flag"> --output-schema</span><span className="tok-str"> prompts/hint.schema.json</span>{"\n"}
          <span className="tok-ok">✓</span><span className="tok-out"> one earned ladder level returned</span>{"\n"}{"\n"}
          <span className="tok-prompt">$ </span><span className="tok-cmd">codex</span><span className="tok-arg"> exec resume</span><span className="tok-flag"> --last</span>{"\n"}
          <span className="tok-ok">✓</span><span className="tok-out"> build thread resumed with its receipts</span>{"\n"}{"\n"}
          <span className="tok-prompt">$ </span><span className="tok-cmd">npm</span><span className="tok-arg"> run site:build</span>{"\n"}
          <span className="tok-ok">✓</span><span className="tok-out"> full site built, every internal link checked</span>
        </code></pre></div>
        <div className="inline-links"><a href={github}>Browse the repository ↗</a><a href={`${github}#architecture`}>Read the integration map ↗</a><a href={`${github}/tree/main/build`}>Browse the build receipts ↗</a></div></div>
      </section>

      <section className="try-it section-cream" aria-labelledby="try-title">
        <div className="shell section-heading with-owl"><div><p className="eyebrow ink-eyebrow">06 · Kick the tires</p><h2 id="try-title">Nothing staged. Go look.</h2><p>The demo is a saved copy of a real learner’s data. Read their actual conversation, or run the whole thing on your own machine with your own Codex login.</p></div><Owl pose="shipping" alt="Hoolio shipping finished work" /></div>
        <div className="action-grid">
          <article><span className="card-number">01</span><h3>Watch the short tour</h3><p>A sub-three-minute walkthrough is being prepared for the submission.</p><span className="disabled-action" aria-disabled="true">Video · coming</span></article>
          <article><span className="card-number">02</span><h3>Read the real conversation</h3><p>Every saved attempt and earned hint, exactly as the learner and Hoolio exchanged them.</p><a href={withBase(`/t/${transcriptSlug}/`)}>Open transcript →</a></article>
          <article><span className="card-number">03</span><h3>Run it in ~10 minutes</h3><p>Your own computer, your own Telegram bot, your own Codex login. No Journeyman servers, no telemetry.</p><a href={`${github}#quickstart-local-postgresql-17`}>Follow the README ↗</a></article>
        </div>
      </section>
    </SiteShell>
  );
}
