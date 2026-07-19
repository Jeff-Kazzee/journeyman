import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { DemoSnapshot } from "../lib/demo-snapshot.ts";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/journeyman";
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

function exportedGapAnalysis(data: unknown): DemoSnapshot["gapAnalysis"] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const candidate = (data as { gaps?: unknown }).gaps;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const value = candidate as { summary?: unknown; gaps?: unknown };
  if (typeof value.summary !== "string" || !Array.isArray(value.gaps)) return null;
  const gaps = value.gaps.flatMap((gap) => {
    if (!gap || typeof gap !== "object" || Array.isArray(gap)) return [];
    const item = gap as { skill?: unknown; whyItMatters?: unknown; rank?: unknown; evidenceQuotes?: unknown };
    if (typeof item.skill !== "string" || typeof item.whyItMatters !== "string" || typeof item.rank !== "number" || !Array.isArray(item.evidenceQuotes)) return [];
    const evidenceQuotes = item.evidenceQuotes.flatMap((evidence) => {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return [];
      const quote = evidence as { quote?: unknown; jobPostIndex?: unknown };
      return typeof quote.quote === "string" && typeof quote.jobPostIndex === "number" ? [{ quote: quote.quote, jobPostIndex: quote.jobPostIndex }] : [];
    });
    return [{ skill: item.skill, whyItMatters: item.whyItMatters, rank: item.rank, evidenceQuotes }];
  });
  return gaps.length ? { summary: value.summary, gaps } : null;
}

async function main() {
  const activePlan = await prisma.plan.findFirst({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, select: { id: true, userId: true } });
  const user = await prisma.user.findUnique({
    where: activePlan ? { id: activePlan.userId } : { slug: "demo" },
    include: {
      profile: true,
      conversationState: { select: { data: true } },
      plans: {
        ...(activePlan ? { where: { id: activePlan.id } } : {}),
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { milestones: { orderBy: { idx: "asc" }, include: { tasks: { orderBy: { idx: "asc" } } } } },
      },
      artifacts: { include: { reviews: { orderBy: { createdAt: "desc" } } } },
      defenses: { orderBy: { createdAt: "desc" } },
      attempts: { orderBy: { createdAt: "asc" }, include: { task: { select: { title: true } } } },
      hints: { orderBy: { createdAt: "asc" }, include: { task: { select: { title: true } } } },
      transcriptEntries: { orderBy: { createdAt: "asc" } },
    },
  });

  const plan = user?.plans[0] ?? null;
  const snapshot: DemoSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    user: user ? {
      // Preserve the exporter's public demo alias; never publish a transport-derived user slug.
      slug: "demo",
      createdAt: user.createdAt.toISOString(),
      profile: user.profile ? { goal: user.profile.goal, targetRole: user.profile.targetRole } : null,
    } : null,
    plan: plan ? {
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      status: plan.status,
      milestones: plan.milestones.map((milestone) => ({
        id: milestone.id,
        idx: milestone.idx,
        title: milestone.title,
        description: milestone.description,
        deliverableSpec: milestone.deliverableSpec,
        rubric: milestone.rubric,
        status: milestone.status,
        tasks: milestone.tasks.map((task) => ({
          id: task.id,
          idx: task.idx,
          title: task.title,
          brief: task.brief,
          deliverableSpec: task.deliverableSpec,
          whyItMatters: task.whyItMatters,
          status: task.status,
          assignedAt: task.assignedAt?.toISOString() ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
        })),
      })),
    } : null,
    gapAnalysis: exportedGapAnalysis(user?.conversationState?.data),
    reviews: user?.artifacts.flatMap((artifact) => artifact.reviews.map((review) => ({
      id: review.id,
      artifactId: review.artifactId,
      artifact: { repoUrl: artifact.repoUrl, ref: artifact.ref, taskId: artifact.taskId },
      engine: review.engine,
      summary: review.summary,
      rubricScores: review.rubricScores,
      forensics: review.forensics,
      createdAt: review.createdAt.toISOString(),
    }))) ?? [],
    defenses: user?.defenses.map((defense) => ({
      id: defense.id,
      milestoneId: defense.milestoneId,
      status: defense.status,
      qaTranscript: defense.qaTranscript,
      scores: defense.scores,
      createdAt: defense.createdAt.toISOString(),
    })) ?? [],
    attempts: user?.attempts.map((attempt) => ({
      id: attempt.id,
      taskId: attempt.taskId,
      taskTitle: attempt.task.title,
      kind: attempt.kind,
      content: attempt.content,
      createdAt: attempt.createdAt.toISOString(),
    })) ?? [],
    hints: user?.hints.map((hint) => ({
      id: hint.id,
      taskId: hint.taskId,
      taskTitle: hint.task.title,
      attemptId: hint.attemptId,
      level: hint.level,
      content: hint.content,
      createdAt: hint.createdAt.toISOString(),
    })) ?? [],
    transcriptEntries: user?.transcriptEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      body: entry.body,
      evidence: entry.evidence,
      createdAt: entry.createdAt.toISOString(),
    })) ?? [],
  };

  const destination = path.join(process.cwd(), "data", "demo-snapshot.json");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  const milestoneCount = snapshot.plan?.milestones.length ?? 0;
  const taskCount = snapshot.plan?.milestones.reduce((total, milestone) => total + milestone.tasks.length, 0) ?? 0;
  console.log(`Wrote ${destination}: ${milestoneCount} milestones, ${taskCount} tasks, ${snapshot.attempts.length} attempts, ${snapshot.hints.length} hints, ${snapshot.transcriptEntries.length} transcript entries.`);
}

main()
  .catch((error) => { console.error("Could not export demo snapshot.", error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
