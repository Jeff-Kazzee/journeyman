import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, milestone: { plan: { userId: user.id } } }, include: { milestone: true, attempts: { orderBy: { createdAt: "asc" } }, hints: { orderBy: { createdAt: "asc" }, include: { attempt: true } }, artifacts: { orderBy: { createdAt: "desc" } } } });
  if (!task) notFound();
  return <main className="min-h-screen bg-cream px-5 py-7 sm:px-8"><article className="mx-auto max-w-3xl"><Link href="/app" className="text-sm font-semibold text-forest underline">← Dashboard</Link><p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-moss">{task.milestone.title} · task {task.idx}</p><h1 className="mt-3 font-display text-5xl text-ink">{task.title}</h1><p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-ink/70">{task.brief}</p><section className="mt-10 rounded-3xl border border-forest/10 bg-white/65 p-6"><h2 className="font-display text-2xl text-ink">Deliverable spec</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-ink/65">{task.deliverableSpec}</p></section><section className="mt-10"><h2 className="font-display text-3xl text-ink">Show-your-work trail</h2><div className="mt-5 space-y-3">{task.attempts.length === 0 ? <p className="text-ink/60">No attempts recorded yet.</p> : task.attempts.map((attempt) => <article key={attempt.id} className="rounded-2xl bg-white/65 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Attempt · {attempt.kind}</p><p className="mt-2 whitespace-pre-wrap leading-7 text-ink/70">{attempt.content}</p></article>)}</div></section><section className="mt-10"><h2 className="font-display text-3xl text-ink">Hint ladder</h2><div className="mt-5 space-y-3">{task.hints.length === 0 ? <p className="text-ink/60">Hints are earned after an attempt.</p> : task.hints.map((hint) => <article key={hint.id} className="rounded-2xl border border-[#cce6bd] bg-[#e8f2e1] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Level {hint.level} · responding to your attempt</p><p className="mt-2 whitespace-pre-wrap leading-7 text-ink/70">{hint.content}</p></article>)}</div></section></article></main>;
}