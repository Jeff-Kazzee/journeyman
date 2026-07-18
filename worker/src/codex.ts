import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { z, type ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { mentorMemory } from "./memory.ts";
import { prisma } from "./prisma.ts";

export type AgentContext = Record<string, unknown> & {
  workingDirectory?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  promptVersion?: string;
  memoryQuery?: string;
  memoryFacts?: string[];
};

export type AgentResult<TSchema extends ZodTypeAny> = z.output<TSchema>;

const CONVERSATIONAL_AGENT_KINDS = new Set([
  "gap-analysis",
  "plan",
  "daily-task",
  "hint",
  "mentor",
  "onboarding",
]);
class AgentOutputError extends Error {}

function promptVersion(promptFile: string, prompt: string, context: AgentContext) {
  if (context.promptVersion) return context.promptVersion;
  const match = prompt.match(/(?:prompt[-_ ]?version|version)\s*[:=]\s*([\w.-]+)/i);
  return match?.[1] ?? path.basename(promptFile);
}

function parseAgentOutput<TSchema extends ZodTypeAny>(raw: string, schema: TSchema): AgentResult<TSchema> {
  const trimmed = raw.trim();
  const candidates = [trimmed, ...trimmed.split(/\r?\n/).reverse()];
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(trimmed.slice(objectStart, objectEnd + 1));

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw new AgentOutputError(`Codex returned malformed structured output: ${lastError instanceof Error ? lastError.message : "unknown parse error"}`);
}

function executeCodex(args: string[], cwd: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("codex", args, { cwd, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`codex exec exited with code ${code ?? "unknown"}.\n${stderr || stdout}`));
    });
  });
}

/**
 * The single runtime seam for every mentor, reviewer, and defense agent run.
 * Bellamente supplies optional recall before a run and accepts caller-supplied,
 * non-secret facts after reviews and defenses. Prisma remains the primary record.
 */
export async function runAgent<TSchema extends ZodTypeAny>(
  kind: string,
  promptFile: string,
  context: AgentContext,
  schema: TSchema,
): Promise<AgentResult<TSchema>> {
  const resolvedPromptFile = path.resolve(process.cwd(), promptFile);
  const workingDirectory = path.resolve(context.workingDirectory ?? process.cwd());
  const taskPrompt = await readFile(resolvedPromptFile, "utf8");
  const mentorPrompt = CONVERSATIONAL_AGENT_KINDS.has(kind)
    ? await readFile(path.resolve(process.cwd(), "prompts/mentor.system.md"), "utf8")
    : "";
  const prompt = mentorPrompt
    ? `${mentorPrompt}\n\n---\n\n${taskPrompt}`
    : taskPrompt;
  const run = await prisma.agentRun.create({
    data: {
      kind,
      inputRef: promptFile,
      promptVersion: promptVersion(promptFile, taskPrompt, context),
      status: "RUNNING",
    },
  });

  const recalledMemories = await mentorMemory.recall(context.memoryQuery ?? `${kind} apprenticeship context`);
  const schemaDirectory = await mkdtemp(path.join(tmpdir(), "journeyman-codex-"));
  const schemaFile = path.join(schemaDirectory, "output-schema.json");
  const rawLog: string[] = [
    "--- invocation ---",
    `kind: ${kind}`,
    `promptFile: ${promptFile}`,
    `workingDirectory: ${workingDirectory}`,
    `sandbox: ${context.sandbox ?? "read-only"}`,
    `context: ${JSON.stringify(context, null, 2)}`,
  ];
  try {
    await writeFile(schemaFile, JSON.stringify(zodToJsonSchema(schema, { name: "AgentOutput" }), null, 2), "utf8");
    const memoryContext = recalledMemories.length > 0
      ? `\n\n## Mentor memory (optional context)\n${recalledMemories.map((memory) => `- ${memory.content}`).join("\n")}`
      : "";
    const renderedPrompt = `${prompt}\n\n## Runtime context\n${JSON.stringify(context, null, 2)}${memoryContext}\n\nReturn only JSON that matches the supplied output schema.`;
    const args = ["exec", "--sandbox", context.sandbox ?? "read-only", "--output-schema", schemaFile, "--cd", workingDirectory, renderedPrompt];

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await executeCodex(args, workingDirectory);
      rawLog.push(`--- attempt ${attempt} stdout ---\n${result.stdout}\n--- attempt ${attempt} stderr ---\n${result.stderr}`);
      try {
        const output = parseAgentOutput(result.stdout, schema);
        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: "SUCCEEDED",
            output: JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue,
            rawLog: rawLog.join("\n"),
            finishedAt: new Date(),
          },
        });
        if (kind === "review" || kind === "defense") await mentorMemory.remember(context.memoryFacts ?? []);
        return output;
      } catch (error) {
        if (!(error instanceof AgentOutputError) || attempt === 2) throw error;
        rawLog.push(`Attempt ${attempt} output was invalid; retrying once. ${error.message}`);
      }
    }
    throw new Error("Codex did not return a structured result.");
  } catch (error) {
    rawLog.push(`--- failure ---\n${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", rawLog: rawLog.join("\n"), finishedAt: new Date() },
    });
    throw error;
  } finally {
    await rm(schemaDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}