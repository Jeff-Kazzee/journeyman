import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireCurrentUser();
  const plan = await prisma.plan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      milestones: {
        orderBy: { idx: "asc" },
        include: { tasks: { orderBy: { idx: "asc" } } },
      },
    },
  });
  return <main className="min-h-screen bg-cream px-5 py-7 sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/app" className="text-sm font-semibold text-forest underline">← Dashboard</Link>{!plan ? <div className="mt-12"><EmptyState eyebrow="No plan yet" title="There is no route to follow yet.">The planning pass will store milestones, deliverable specs, and rubrics here.</EmptyState></div> : <section className="mt-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">Apprenticeship plan</p><h1 className="mt-3 font-display text-5xl text-ink">{plan.title}</h1><p className="mt-5 max-w-2xl leading-7 text-ink/65">{plan.summary}</p><ol className="mt-12 space-y-5">{plan.milestones.map((milestone) => <li key={milestone.id} className="rounded-3xl border border-forest/10 bg-white/65 p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Milestone {milestone.idx} · {milestone.status.replaceAll("_", " ")}</p><h2 className="mt-2 font-display text-3xl text-ink">{milestone.title}</h2><p className="mt-3 leading-7 text-ink/65">{milestone.description}</p><p className="mt-5 rounded-2xl bg-cream p-4 text-sm leading-6 text-ink/70"><strong className="text-ink">Deliverable:</strong> {milestone.deliverableSpec}</p><div className="mt-5 space-y-2">{milestone.tasks.map((task) => <Link key={task.id} href={`/app/tasks/${task.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-[#e8f2e1]"><span className="text-sm text-ink">{task.idx}. {task.title}</span><span className="text-xs font-bold text-moss">{task.status}</span></Link>)}</div></li>)}</ol></section>}</div></main>;
}