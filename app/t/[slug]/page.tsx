import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { SiteHeader } from "@/components/site-header";
import { TranscriptTimeline } from "@/components/transcript-timeline";
import { loadDemoSnapshot, snapshotTranscriptRows, type DemoSnapshot } from "@/lib/demo-snapshot";
import { getTranscriptBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PublicTranscriptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let learner: Awaited<ReturnType<typeof getTranscriptBySlug>>;
  try {
    learner = await getTranscriptBySlug(slug);
  } catch {
    if (slug === "demo") return <SnapshotTranscript snapshot={await loadDemoSnapshot()} />;
    return <TranscriptUnavailable />;
  }
  if (!learner) notFound();

  const goal = learner.profile?.goal ?? "A focused career transition";
  const role = learner.profile?.targetRole;
  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">Public proof of learning</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink sm:text-6xl">{role ? `${role} apprenticeship` : "A Journeyman transcript"}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/65">{goal}</p>
        <div className="mt-9 flex flex-wrap gap-3 text-sm text-ink/60">
          <span className="rounded-full border border-forest/15 bg-white/50 px-4 py-2">@{learner.slug}</span>
          <span className="rounded-full border border-forest/15 bg-white/50 px-4 py-2">{learner.transcriptEntries.length} evidence {learner.transcriptEntries.length === 1 ? "entry" : "entries"}</span>
        </div>
        <div className="mt-14">
          {learner.transcriptEntries.length > 0 ? <TranscriptTimeline entries={learner.transcriptEntries} /> : <EmptyState eyebrow="First proof pending" title="This apprenticeship has not published evidence yet.">A Journeyman transcript never fills itself with claims. Entries appear here when there is real work, review, or a defense to point to.</EmptyState>}
        </div>
      </section>
    </main>
  );
}

async function SnapshotTranscript({ snapshot }: { snapshot: DemoSnapshot | null }) {
  const entries = snapshot ? snapshotTranscriptRows(snapshot) : [];
  const profile = snapshot?.user?.profile;
  if (!snapshot) return <SnapshotUnavailable />;

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">Public proof of learning · static snapshot</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink sm:text-6xl">{profile?.targetRole ? `${profile.targetRole} apprenticeship` : "Journeyman demo transcript"}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/65">{profile?.goal ?? "This database-free copy is the public demo record."}</p>
        <div className="mt-14">{entries.length > 0 ? <TranscriptTimeline entries={entries} /> : <EmptyState eyebrow="No proof in snapshot" title="The demo snapshot is valid but has no transcript entries yet.">Run <code>npm run snapshot</code> after the local demo user has earned real evidence.</EmptyState>}</div>
      </section>
    </main>
  );
}

function SnapshotUnavailable() {
  return <main className="min-h-screen bg-cream"><SiteHeader /><section className="mx-auto max-w-4xl px-5 py-24 sm:px-8"><EmptyState eyebrow="Snapshot unavailable" title="The local transcript ledger is offline and no static demo snapshot was found.">Publish <code>data/demo-snapshot.json</code> before sharing the demo route.</EmptyState></section></main>;
}

function TranscriptUnavailable() {
  return <main className="min-h-screen bg-cream"><SiteHeader /><section className="mx-auto max-w-4xl px-5 py-24 sm:px-8"><EmptyState eyebrow="Transcript offline" title="The local Postgres ledger is not connected yet.">Public transcript data is read directly from local PostgreSQL. The `demo` slug has a static fallback for judge browsing.</EmptyState></section></main>;
}