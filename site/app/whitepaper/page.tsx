import { Owl, SiteShell } from "../../components/site-shell";

export default function WhitepaperPage() {
  return (
    <SiteShell current="whitepaper">
      <section className="page-hero whitepaper-hero section-dark">
        <div className="shell split-section"><div><p className="eyebrow">White paper · content forthcoming</p><h1>Proof-carrying apprenticeship with an AI mentor.</h1><p className="abstract-label">Abstract placeholder</p><p className="abstract">Journeyman explores a deliberately constrained alternative to answer-producing tutors: an agent that requires inspectable learner work, advances help through a five-level hint ladder, and publishes a reviewable evidence trail. The full paper will describe the learning model, local-first access boundary, evaluation method, observed limitations, and path from hackathon prototype to a measured apprenticeship platform.</p><div className="paper-meta"><span>Status · outline in progress</span><span>Pass · separate content track</span><span>Reading time · to be determined</span></div></div><Owl pose="teaching" alt="Journeyman owl teaching beside the white paper outline" /></div>
      </section>
      <section className="paper-outline section-slate"><div className="shell"><p className="eyebrow">Planned structure</p><ol><li><span>01</span><div><h2>The anti-homework premise</h2><p>Why answer generation is the wrong optimization target for apprenticeship.</p></div></li><li><span>02</span><div><h2>The show-your-work ladder</h2><p>How attempts, bounded hints, and defense-style confirmation fit together.</p></div></li><li><span>03</span><div><h2>Evidence and evaluation</h2><p>What the transcript can prove, what it cannot, and how outcomes will be measured.</p></div></li><li><span>04</span><div><h2>Local-first trust boundary</h2><p>Authentication, user-scoped data, private compute, and the roadmap beyond a prototype.</p></div></li></ol></div></section>
    </SiteShell>
  );
}
