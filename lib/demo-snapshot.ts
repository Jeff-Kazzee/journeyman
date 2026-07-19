import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AttemptKind,
  DefenseStatus,
  MilestoneStatus,
  PlanStatus,
  Prisma,
  TaskStatus,
  TranscriptKind,
} from "@prisma/client";

export type DemoSnapshotTranscriptEntry = {
  id: string;
  kind: TranscriptKind;
  title: string;
  body: string;
  evidence: Prisma.JsonValue;
  createdAt: string;
};

export type DemoSnapshotAttempt = {
  id: string;
  taskId: string;
  taskTitle: string;
  kind: AttemptKind;
  content: string;
  createdAt: string;
};

export type DemoSnapshotHint = {
  id: string;
  taskId: string;
  taskTitle: string;
  attemptId: string;
  level: number;
  content: string;
  createdAt: string;
};

export type DemoSnapshotGapAnalysis = {
  summary: string;
  gaps: Array<{
    skill: string;
    whyItMatters: string;
    rank: number;
    evidenceQuotes: Array<{ quote: string; jobPostIndex: number }>;
  }>;
};

export type DemoSnapshot = {
  version: 1;
  generatedAt: string | null;
  user: {
    slug: string;
    createdAt: string;
    profile: { goal: string; targetRole: string } | null;
  } | null;
  plan: {
    id: string;
    title: string;
    summary: string;
    status: PlanStatus;
    milestones: Array<{
      id: string;
      idx: number;
      title: string;
      description: string;
      deliverableSpec: string;
      rubric: Prisma.JsonValue;
      status: MilestoneStatus;
      tasks: Array<{
        id: string;
        idx: number;
        title: string;
        brief: string;
        deliverableSpec: string;
        whyItMatters: string | null;
        status: TaskStatus;
        assignedAt: string | null;
        completedAt: string | null;
      }>;
    }>;
  } | null;
  gapAnalysis: DemoSnapshotGapAnalysis | null;
  reviews: Array<{
    id: string;
    artifactId: string;
    artifact: { repoUrl: string; ref: string | null; taskId: string | null };
    engine: string;
    summary: string;
    rubricScores: Prisma.JsonValue;
    forensics: Prisma.JsonValue;
    createdAt: string;
  }>;
  defenses: Array<{
    id: string;
    milestoneId: string;
    status: DefenseStatus;
    qaTranscript: Prisma.JsonValue;
    scores: Prisma.JsonValue;
    createdAt: string;
  }>;
  attempts: DemoSnapshotAttempt[];
  hints: DemoSnapshotHint[];
  transcriptEntries: DemoSnapshotTranscriptEntry[];
};

const snapshotPath = path.join(process.cwd(), "data", "demo-snapshot.json");

function hasSupportedSnapshotVersion(value: unknown): value is DemoSnapshot {
  return typeof value === "object" && value !== null && (value as { version?: unknown }).version === 1;
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(snapshotPath, "utf8"));
    return hasSupportedSnapshotVersion(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function snapshotTranscriptRows(snapshot: DemoSnapshot) {
  return snapshot.transcriptEntries.flatMap((entry) => {
    const createdAt = new Date(entry.createdAt);
    if (Number.isNaN(createdAt.getTime())) return [];
    return [{ ...entry, createdAt }];
  });
}
