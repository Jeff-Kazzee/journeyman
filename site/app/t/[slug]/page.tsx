import { notFound } from "next/navigation";
import { SiteShell } from "../../../components/site-shell";
import { TranscriptReader } from "../../../components/transcript-reader";
import { readerMessages, snapshot, transcriptSlug } from "../../../lib/site-data";

export function generateStaticParams() { return [{ slug: transcriptSlug }]; }

export default async function TranscriptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== transcriptSlug) notFound();
  return (
    <SiteShell current="transcript">
      <section className="page-hero transcript-hero section-dark">
        <div className="shell"><p className="eyebrow">The receipts</p><h1>Every message, exactly as it happened.</h1><p>A real saved conversation between a learner and Hoolio: every attempt they sent and every hint they earned, in order. The markers in the margin point at the moments worth reading first.</p><div className="transcript-meta"><span>Tenant alias · {snapshot.user?.slug}</span><span>{snapshot.attempts.length} attempts</span><span>{snapshot.hints.length} hints</span><span>Generated · {snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Unknown"}</span></div></div>
      </section>
      <section className="transcript-page section-dark"><div className="shell"><TranscriptReader messages={readerMessages} /></div></section>
    </SiteShell>
  );
}
