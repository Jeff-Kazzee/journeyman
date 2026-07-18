import { EmptyState } from "@/components/empty-state";
import { SiteHeader } from "@/components/site-header";
import { TranscriptTimeline } from "@/components/transcript-timeline";
import { loadDemoSnapshot, snapshotTranscriptRows } from "@/lib/demo-snapshot";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const snapshot = await loadDemoSnapshot();
  const entries = snapshot ? snapshotTranscriptRows(snapshot) : [];
  const profile = snapshot?.user?.profile;

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <div className="rounded-2xl border border-[#b9caaa] bg-[#e8f2e1] px-5 py-4 text-sm leading-6 text-forest"><strong>Read-only demo.</strong> This judge path reads the committed static snapshot only—no database, worker, or agent call is involved.</div>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-moss">Journeyman demo tenant</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink">{profile?.targetRole ? `${profile.targetRole} apprenticeship` : "Proof, not a polished claim."}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/65">{profile?.goal ?? "A transcript is the trail behind the work: artifacts, reviews, and the moments a learner explained it back."}</p>
        <div className="mt-14">
          {!snapshot ? <EmptyState eyebrow="Snapshot unavailable" title="The demo snapshot is not bundled right now.">Run <code>npm run snapshot</code> against Jeff&apos;s local PostgreSQL data before publishing the judge build.</EmptyState> : entries.length > 0 ? <TranscriptTimeline entries={entries} /> : <EmptyState eyebrow="Demo awaiting its snapshot" title="The committed demo record has no published proof yet.">When Jeff&apos;s real `demo` user has evidence, <code>npm run snapshot</code> will package its plan, reviews, defenses, and transcript for database-free browsing.</EmptyState>}
        </div>
      </section>
    </main>
  );
}