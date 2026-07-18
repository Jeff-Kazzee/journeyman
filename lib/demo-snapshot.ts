import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma, TranscriptKind } from "@prisma/client";

export type DemoSnapshotTranscriptEntry = {
  id: string;
  kind: TranscriptKind;
  title: string;
  body: string;
  evidence: Prisma.JsonValue;
  createdAt: string;
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
    status: string;
    milestones: Array<{
      id: string;
      idx: number;
      title: string;
      description: string;
      deliverableSpec: string;
      rubric: Prisma.JsonValue;
      status: string;
      tasks: Array<{
        id: string;
        idx: number;
        title: string;
        brief: string;
        deliverableSpec: string;
        status: string;
        assignedAt: string | null;
        completedAt: string | null;
      }>;
    }>;
  } | null;
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
    status: string;
    qaTranscript: Prisma.JsonValue;
    scores: Prisma.JsonValue;
    createdAt: string;
  }>;
  transcriptEntries: DemoSnapshotTranscriptEntry[];
};

const snapshotPath = path.join(process.cwd(), "data", "demo-snapshot.json");

function isSnapshot(value: unknown): value is DemoSnapshot {
  return typeof value === "object" && value !== null && (value as { version?: unknown }).version === 1;
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(snapshotPath, "utf8"));
    return isSnapshot(parsed) ? parsed : null;
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