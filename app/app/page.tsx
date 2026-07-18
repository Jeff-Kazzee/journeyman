import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  let dashboard: Awaited<ReturnType<typeof getDashboard>>;
  try {
    dashboard = await getDashboard(user.id);
  } catch {
    return <DashboardFrame name={user.slug}><EmptyState eyebrow="Database unavailable" title="Your apprenticeship will appear when the ledger reconnects.">Set DATABASE_URL for the web app and worker. No plan state is held in the browser.</EmptyState></DashboardFrame>;
  }

  if (!dashboard.plan) {
    return <DashboardFrame name={user.slug}><EmptyState eyebrow="Your first move" title="Tell your mentor where you want to go.">Onboarding, gap analysis, and plan creation arrive in the next feature pass. This dashboard is already wired to render their persisted output.</EmptyState></DashboardFrame>;
  }

  const { plan, latestReview } = dashboard;
  const milestones = plan.milestones;
  const tasks = milestones.flatMap((milestone) => milestone.tasks);
  const currentTask = tasks.find((task) => task.status === "ACTIVE") ?? tasks.find((task) => task.status === "SCHEDULED");
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <DashboardFrame name={user.slug}>
      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="rounded-3xl bg-ink p-7 text-cream shadow-soft sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b8d9a7]">Current rep</p>
          <h2 className="mt-3 font-display text-3xl">{currentTask?.title ?? "Your mentor is preparing the next task."}</h2>
          <p className="mt-4 max-w-xl leading-7 text-cream/70">{currentTask?.brief ?? "Once your plan is confirmed, the daily task will show up here and in Telegram."}</p>
          {currentTask && <Link href={`/app/tasks/${currentTask.id}`} className="mt-7 inline-block rounded-full bg-[#cce6bd] px-5 py-2.5 text-sm font-bold text-forest">Open task</Link>}
        </article>
        <article className="rounded-3xl border border-forest/10 bg-white/70 p-7 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Plan progress</p>
          <p className="mt-4 font-display text-5xl text-ink">{completed}<span className="text-2xl text-ink/40">/{tasks.length}</span></p>
          <p className="mt-2 text-sm text-ink/60">tasks completed across {milestones.length} milestones</p>
          <p className="mt-5 border-t border-forest/10 pt-4 text-sm leading-6 text-ink/60"><strong className="text-ink">Streak:</strong> tracking begins with the first completed daily task.</p>
          <Link href="/app/plan" className="mt-5 inline-block text-sm font-bold text-forest underline">See the full plan</Link>
        </article>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-3xl border border-forest/10 bg-white/55 p-7">
          <div className="flex items-baseline justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Milestones</p><h2 className="mt-2 font-display text-3xl text-ink">{plan.title}</h2></div>
            <Link href="/app/transcript" className="text-sm font-bold text-forest underline">My transcript</Link>
          </div>
          <div className="mt-6 grid gap-3">
            {milestones.map((milestone) => <div key={milestone.id} className="flex items-center justify-between rounded-2xl border border-forest/10 bg-cream/60 px-5 py-4"><div><p className="font-semibold text-ink">{milestone.idx}. {milestone.title}</p><p className="mt-1 text-sm text-ink/55">{milestone.tasks.filter((task) => task.status === "COMPLETED").length}/{milestone.tasks.length} tasks complete</p></div><span className="rounded-full bg-[#e8f2e1] px-3 py-1 text-xs font-bold text-forest">{milestone.status.replaceAll("_", " ")}</span></div>)}
          </div>
        </article>
        <article className="rounded-3xl border border-forest/10 bg-white/55 p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Latest review</p>
          {latestReview ? <><h2 className="mt-3 font-display text-2xl text-ink">Eyes have checked your artifact.</h2><p className="mt-3 line-clamp-4 leading-7 text-ink/65">{latestReview.summary}</p><Link href={`/app/reviews/${latestReview.id}`} className="mt-5 inline-block text-sm font-bold text-forest underline">Read the report</Link></> : <p className="mt-3 leading-7 text-ink/60">Artifact reviews will appear here after the first deliverable is submitted.</p>}
        </article>
      </section>
    </DashboardFrame>
  );
}

async function getDashboard(userId: string) {
  const [plan, latestReview] = await Promise.all([
    getPlan(userId),
    prisma.review.findFirst({ where: { artifact: { userId } }, orderBy: { createdAt: "desc" } }),
  ]);
  return { plan, latestReview };
}

async function getPlan(userId: string) {
  return prisma.plan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { milestones: { orderBy: { idx: "asc" }, include: { tasks: { orderBy: { idx: "asc" } } } } },
  });
}

function DashboardFrame({ name, children }: { name: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-cream"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"><Link href="/app" className="font-semibold text-ink">Journeyman</Link><span className="text-sm text-ink/55">@{name}</span></header><section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">Apprenticeship dashboard</p><h1 className="mt-3 font-display text-4xl text-ink">Small honest work compounds.</h1><div className="mt-9">{children}</div></section></main>;
}