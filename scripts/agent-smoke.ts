import assert from "node:assert/strict";
import { z } from "zod";
import { runAgent } from "../worker/src/codex.ts";
import { prisma } from "../worker/src/prisma.ts";

const transportProbe = [
  'Line one: "Journeyman" must survive quoted stdin.',
  "Line two: it's multi-line, quote-heavy, and has a backslash \\.",
  'Line three: return this exact probe without putting the prompt on a command line.',
].join("\n");
const smokeSchema = z.object({ reply: z.literal("OK"), echoedProbe: z.string() }).strict();

async function main() {
  const result = await runAgent("agent-smoke", "prompts/agent-smoke.md", { memoryQuery: "Journeyman stdin transport smoke check", transportProbe }, smokeSchema);
  assert.equal(result.reply, "OK");
  assert.equal(result.echoedProbe, transportProbe);
  const run = await prisma.agentRun.findFirst({ where: { kind: "agent-smoke" }, orderBy: { startedAt: "desc" } });
  const rawLog = run?.rawLog ?? "";
  assert(rawLog.includes("promptTransport: stdin"), "AgentRun must record stdin prompt transport");
  assert.match(rawLog, /promptBytes: [1-9]\d{2,}/, "AgentRun must record a substantial multi-line prompt payload");
  console.log("agent:smoke passed — quote-heavy multi-line stdin round-trip and AgentRun persistence verified.");
}

main()
  .catch((error) => { console.error("agent:smoke failed", error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });