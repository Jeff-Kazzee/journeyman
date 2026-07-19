import snapshotJson from "../../data/demo-snapshot.json";
import type { DemoSnapshot, DemoSnapshotHint } from "../../lib/demo-snapshot";
import { canonicalTranscriptSlug } from "./routes";

export { internalPages, type PageKey } from "./routes";

export const snapshot = snapshotJson as DemoSnapshot;
export const transcriptSlug = snapshot.user?.slug ?? canonicalTranscriptSlug;

export const externalPages = [
  { label: "GitHub", href: "https://github.com/Jeff-Kazzee/journeyman" },
  { label: "Try the bot", href: "https://t.me/JourneyJohnbot" },
] as const;

export const deferredExternalPages = ["Video", "Devpost"] as const;

export function rubricItems(value: unknown): Array<{ criterion: string; description: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const rubric = item as { criterion?: unknown; description?: unknown };
    return typeof rubric.criterion === "string" && typeof rubric.description === "string" ? [{ criterion: rubric.criterion, description: rubric.description }] : [];
  });
}

export type ReaderMessage = {
  id: string;
  role: "learner" | "mentor" | "evidence";
  marker?: "hint";
  label: string;
  body: string;
  createdAt: string;
  level?: number;
};

export const readerMessages: ReaderMessage[] = [
  ...snapshot.attempts.map((attempt) => ({ id: `attempt-${attempt.id}`, role: "learner" as const, label: `Attempt · ${attempt.taskTitle}`, body: attempt.content, createdAt: attempt.createdAt })),
  ...snapshot.hints.map((hint) => ({ id: `hint-${hint.id}`, role: "mentor" as const, marker: "hint" as const, label: `Level ${hint.level}/5 hint · ${hint.taskTitle}`, body: hint.content, createdAt: hint.createdAt, level: hint.level })),
  ...snapshot.transcriptEntries.map((entry) => ({ id: `entry-${entry.id}`, role: "evidence" as const, label: `${entry.kind} · ${entry.title}`, body: entry.body, createdAt: entry.createdAt })),
].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

export function matchingHint(attemptId: string): DemoSnapshotHint | undefined {
  return snapshot.hints.find((hint) => hint.attemptId === attemptId);
}

export const featuredAttempt = snapshot.attempts.at(-1);
export const featuredHint = featuredAttempt ? matchingHint(featuredAttempt.id) : snapshot.hints.at(-1);
