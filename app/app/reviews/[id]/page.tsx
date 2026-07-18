import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const review = await prisma.review.findFirst({ where: { id, artifact: { userId: user.id } }, include: { artifact: true } });
  if (!review) notFound();
  return <main className="min-h-screen bg-cream px-5 py-7 sm:px-8"><article className="mx-auto max-w-3xl"><Link href="/app" className="text-sm font-semibold text-forest underline">← Dashboard</Link><p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-moss">Artifact review · {review.engine}</p><h1 className="mt-3 font-display text-5xl text-ink">Eyes on the work.</h1><p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-ink/70">{review.summary}</p><a href={review.artifact.repoUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block font-semibold text-forest underline">Open reviewed artifact ↗</a><section className="mt-10 grid gap-5 md:grid-cols-2"><JsonPanel title="Rubric scores" value={review.rubricScores} /><JsonPanel title="Commit-trace forensics" value={review.forensics} /></section></article></main>;
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section className="overflow-hidden rounded-3xl border border-forest/10 bg-white/65 p-5"><h2 className="font-bold text-ink">{title}</h2><pre className="mt-4 overflow-x-auto text-xs leading-6 text-ink/70">{JSON.stringify(value, null, 2)}</pre></section>;
}