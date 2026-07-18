import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
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

export type CodexResolution = {
  command: string;
  argsPrefix: string[];
  shell: boolean;
  mode: "node-js" | "binary" | "shim";
  target: string;
};

const CONVERSATIONAL_AGENT_KINDS = new Set([
  "gap-analysis",
  "plan",
  "daily-task",
  "hint",
  "mentor",
  "onboarding",
]);

class AgentOutputError extends Error {}

function pathEntries(): string[] {
  const value = process.env.PATH ?? process.env.Path ?? "";
  return value.split(path.delimiter).map((entry) => entry.trim().replace(/^"|"$/g, "")).filter(Boolean);
}

function findExecutable(names: string[]): string | null {
  for (const entry of pathEntries()) {
    for (const name of names) {
      const candidate = path.join(entry, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function resolutionFor(target: string): CodexResolution {
  if (/\.js$/i.test(target)) {
    return { command: process.execPath, argsPrefix: [target], shell: false, mode: "node-js", target };
  }
  const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(target);
  return { command: target, argsPrefix: [], shell: shim, mode: shim ? "shim" : "binary", target };
}

function configuredExecutable(): string | null {
  const configured = process.env.CODEX_EXECUTABLE?.trim();
  if (!configured) return null;
  if (existsSync(configured)) return path.resolve(configured);
  const names = process.platform === "win32" && !/\.(?:exe|cmd|bat|js)$/i.test(configured)
    ? [configured, `${configured}.exe`, `${configured}.cmd`, `${configured}.bat`]
    : [configured];
  return findExecutable(names);
}

function packageCodexJs(): string | null {
  if (process.platform === "win32") {
    const candidate = process.env.APPDATA
      ? path.join(process.env.APPDATA, "npm", "node_modules", "@openai", "codex", "bin", "codex.js")
      : null;
    return candidate && existsSync(candidate) ? candidate : null;
  }

  const command = findExecutable(["codex"]);
  if (!command) return null;
  try {
    const resolved = realpathSync(command);
    return path.basename(resolved) === "codex.js" && existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/**
 * Prefer the npm package's JS entry point. Running it through this process's
 * Node binary keeps Windows out of cmd.exe entirely. A .cmd shim is a last
 * resort for unusual installs; all prompts still travel over stdin.
 */
export function resolveCodexExecutable(): CodexResolution | null {
  const configured = configuredExecutable();
  if (configured) return resolutionFor(configured);

  const codexJs = packageCodexJs();
  if (codexJs) return resolutionFor(codexJs);

  if (process.platform === "win32") {
    const fromPath = findExecutable(["codex.exe", "codex.cmd", "codex.bat"]);
    if (fromPath) return resolutionFor(fromPath);

    const npmShim = process.env.APPDATA ? path.join(process.env.APPDATA, "npm", "codex.cmd") : null;
    if (npmShim && existsSync(npmShim)) return resolutionFor(npmShim);
    return null;
  }

  const fromPath = findExecutable(["codex"]);
  return fromPath ? resolutionFor(fromPath) : null;
}

export function requireCodexResolution(): CodexResolution {
  const resolution = resolveCodexExecutable();
  if (!resolution) {
    const extra = process.platform === "win32"
      ? " Install the Codex CLI or add its npm bin directory (usually %APPDATA%\\npm) to PATH."
      : " Install the Codex CLI and make sure `codex` is on PATH.";
    throw new Error(`codex: not resolved.${extra}`);
  }
  return resolution;
}

export function logCodexResolution(): CodexResolution {
  const resolution = requireCodexResolution();
  console.log(`codex: resolved ${resolution.mode} (${resolution.target}) via ${resolution.command}`);
  return resolution;
}

function promptVersion(promptFile: string, prompt: string, context: AgentContext) {
  if (context.promptVersion) return context.promptVersion;
  const match = prompt.match(/(?:prompt[-_ ]?version|version)\s*[:=]\s*([\w.-]+)/i);
  return match?.[1] ?? path.basename(promptFile);
}

/**
 * Models occasionally emit literal line endings inside a JSON string. JSON
 * requires those characters to be escaped, but preserving them as escapes
 * makes JSON.parse recover the exact original string value.
 */
function escapeRawStringControls(value: string): string {
  let inString = false;
  let escaped = false;
  let sanitized = "";

  for (const character of value) {
    if (!inString) {
      if (character === '"') inString = true;
      sanitized += character;
      continue;
    }

    if (escaped) {
      escaped = false;
      sanitized += character;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      sanitized += character;
      continue;
    }
    if (character === '"') {
      inString = false;
      sanitized += character;
      continue;
    }

    if (character === "\n") sanitized += "\\n";
    else if (character === "\r") sanitized += "\\r";
    else if (character === "\t") sanitized += "\\t";
    else sanitized += character;
  }

  return sanitized;
}

function parseAgentOutput<TSchema extends ZodTypeAny>(raw: string, schema: TSchema): AgentResult<TSchema> {
  const trimmed = raw.trim();
  const candidates = [trimmed, ...trimmed.split(/\r?\n/).reverse()];
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  candidates.push(...candidates.map(escapeRawStringControls));

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

function parseAgentResult<TSchema extends ZodTypeAny>(finalMessage: string, stdout: string, stderr: string, schema: TSchema): AgentResult<TSchema> {
  const sources = [
    ["finalMessage", finalMessage],
    ["stdout", stdout],
    ["stderr", stderr],
  ].filter(([, source]) => source.trim().length > 0);
  const errors: string[] = [];
  for (const [name, source] of sources) {
    try {
      return parseAgentOutput(source, schema);
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : "unknown parse error"}`);
    }
  }
  throw new AgentOutputError(errors.length > 0
    ? `Codex returned malformed structured output: ${errors.join("; ")}`
    : "Codex returned no structured output from finalMessage, stdout, or stderr.");
}

function executeCodex(args: string[], stdin: string, cwd: string, resolution: CodexResolution) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(resolution.command, [...resolution.argsPrefix, ...args], {
      cwd,
      shell: resolution.shell,
      windowsHide: true,
    });
    if (!child.stdin || !child.stdout || !child.stderr) {
      reject(new Error("codex exec did not expose standard streams."));
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.stdin.once("error", reject);
    child.once("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
    child.stdin.end(stdin, "utf8");
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
  const prompt = mentorPrompt ? `${mentorPrompt}\n\n---\n\n${taskPrompt}` : taskPrompt;
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
    const resolution = requireCodexResolution();
    rawLog.push(
      `codex: ${resolution.command}`,
      `codexTarget: ${resolution.target}`,
      `resolutionMode: ${resolution.mode}`,
      `shell: ${resolution.shell}`,
    );
    // Output schemas must not carry long string const values: Codex truncates them at ~39 characters; assert exact matches in caller code instead.
    await writeFile(schemaFile, JSON.stringify(zodToJsonSchema(schema, { name: "AgentOutput" }), null, 2), "utf8");
    const memoryContext = recalledMemories.length > 0
      ? `\n\n## Mentor memory (optional context)\n${recalledMemories.map((memory) => `- ${memory.content}`).join("\n")}`
      : "";
    const renderedPrompt = `${prompt}\n\n## Runtime context\n${JSON.stringify(context, null, 2)}${memoryContext}\n\nReturn only JSON that matches the supplied output schema.`;
    rawLog.push("promptTransport: stdin", `promptBytes: ${Buffer.byteLength(renderedPrompt, "utf8")}`);
    const args = ["exec", "--sandbox", context.sandbox ?? "read-only", "--output-schema", schemaFile, "--cd", workingDirectory];

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const finalMessageFile = path.join(schemaDirectory, `last-message-${attempt}.json`);
      const result = await executeCodex([...args, "-o", finalMessageFile, "-"], renderedPrompt, workingDirectory, resolution);
      const finalMessage = await readFile(finalMessageFile, "utf8").catch(() => "");
      rawLog.push(`--- attempt ${attempt} exit ${result.exitCode ?? "unknown"} final message ---\n${finalMessage}\n--- attempt ${attempt} stdout ---\n${result.stdout}\n--- attempt ${attempt} stderr ---\n${result.stderr}`);
      try {
        // Stderr is advisory: global MCP auth warnings are known to be emitted there.
        // A valid structured final result wins even if Codex reports a noisy exit code.
        const output = parseAgentResult(finalMessage, result.stdout, result.stderr, schema);
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
        const details = error instanceof Error ? error.message : "unknown parse error";
        if (result.exitCode !== 0) {
          throw new Error(`codex exec exited with code ${result.exitCode}. No valid structured final message was found. ${details}`);
        }
        if (!(error instanceof AgentOutputError) || attempt === 2) throw error;
        rawLog.push(`Attempt ${attempt} output was invalid; retrying once. ${details}`);
      }
    }
    throw new Error("Codex did not return a structured result.");
  } catch (error) {
    rawLog.push(`--- failure ---\n${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", rawLog: rawLog.join("\n"), finishedAt: new Date() },
    }).catch(() => undefined);
    throw error;
  } finally {
    await rm(schemaDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}