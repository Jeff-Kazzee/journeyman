import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { DemoSnapshot } from "../lib/demo-snapshot.ts";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/journeyman";
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  const user = await prisma.user.findUnique({
    where: { slug: "demo" },
    include: {
      profile: true,
      plans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { milestones: { orderBy: { idx: "asc" }, include: { tasks: { orderBy: { idx: "asc" } } } } },
      },
      artifacts: { include: { reviews: { orderBy: { createdAt: "desc" } } } },
      defenses: { orderBy: { createdAt: "desc" } },
      transcriptEntries: { orderBy: { createdAt: "desc" } },
    },
  });

  const plan = user?.plans[0] ?? null;
  const snapshot: DemoSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    user: user ? {
      slug: user.slug,
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
          status: task.status,
          assignedAt: task.assignedAt?.toISOString() ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
        })),
      })),
    } : null,
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
  console.log(`Wrote ${destination} (${snapshot.transcriptEntries.length} transcript entries).`);
}

main()
  .catch((error) => { console.error("Could not export demo snapshot.", error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());