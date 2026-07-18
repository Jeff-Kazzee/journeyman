import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { TranscriptTimeline } from "@/components/transcript-timeline";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OwnTranscriptPage() {
  const user = await requireCurrentUser();
  const entries = await prisma.transcriptEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <main className="min-h-screen bg-cream px-5 py-7 sm:px-8"><section className="mx-auto max-w-4xl"><Link href="/app" className="text-sm font-semibold text-forest underline">← Dashboard</Link><p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-moss">Your public proof of learning</p><h1 className="mt-3 font-display text-5xl text-ink">Your receipts.</h1><p className="mt-5 max-w-2xl leading-7 text-ink/65">This owner view will add Markdown export in a later feature pass. The public version is already available at <Link className="font-semibold text-forest underline" href={`/t/${user.slug}`}>/t/{user.slug}</Link>.</p><div className="mt-12">{entries.length ? <TranscriptTimeline entries={entries} /> : <EmptyState eyebrow="No entries yet" title="This stays empty until work earns a claim.">Transcript entries are produced from stored milestone, review, defense, and skill evidence—not an agent call at page view.</EmptyState>}</div></section></main>;
}