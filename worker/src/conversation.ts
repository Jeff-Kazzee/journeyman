import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AttemptKind, ConversationStage, MilestoneStatus, PlanStatus, Prisma, TaskStatus, type ConversationState, type LearnerProfile, type Task } from "@prisma/client";
import { z, type ZodTypeAny } from "zod";
import { type AgentContext, type AgentResult, runAgent } from "./codex.ts";
import { mentorMemory } from "./memory.ts";
import { prisma } from "./prisma.ts";

const MAX_POSTS = 5;
const MIN_POSTS = 3;
const TELEGRAM_LIMIT = 4000;
const PLAN_RUNNING = "PLAN_RUNNING" as ConversationStage;

export const gapAnalysisSchema = z.object({
  summary: z.string().min(1),
  gaps: z.array(z.object({
    skill: z.string().min(1), whyItMatters: z.string().min(1), rank: z.number().int().min(1),
    evidenceQuotes: z.array(z.object({ quote: z.string().min(1), jobPostIndex: z.number().int().min(0) }).strict()).min(1),
  }).strict()).min(5),
}).strict();
export const planSchema = z.object({
  title: z.string().min(1), summary: z.string().min(1),
  milestones: z.array(z.object({
    title: z.string().min(1), description: z.string().min(1), deliverableSpec: z.string().min(1),
    rubric: z.array(z.object({ criterion: z.string().min(1), description: z.string().min(1) }).strict()).min(1),
    tasks: z.array(z.object({ title: z.string().min(1), brief: z.string().min(1), deliverableSpec: z.string().min(1), whyItMatters: z.string().min(1) }).strict()).min(2).max(6),
  }).strict()).min(2).max(4),
}).strict();
export const hintSchema = z.object({ hint: z.string().min(1).max(1600) }).strict();

export type GapAnalysis = z.output<typeof gapAnalysisSchema>;
export type ProposedPlan = z.output<typeof planSchema>;
export type AgentRunner = <TSchema extends ZodTypeAny>(kind: string, promptFile: string, context: AgentContext, schema: TSchema) => Promise<AgentResult<TSchema>>;
export type ConversationResponse = { messages: string[] };
type AsyncResponder = (userId: string, response: ConversationResponse) => Promise<void>;
type ProfileMemory = Pick<typeof mentorMemory, "remember">;
type FailedKind = "gap-analysis" | "plan" | "hint";
type NonAttemptKind = "cold-ask" | "admission";
type PendingPost = { rawText: string; url?: string; title: string };
type FailedHint = { taskId: string; attemptId: string; level: number };
type Data = {
  goal?: string; targetRole?: string; background?: string; constraints?: string; selfAssessedSkills?: string[];
  gaps?: GapAnalysis; proposedPlan?: ProposedPlan; planId?: string; pendingPosts?: PendingPost[];
  donePrompted?: boolean; startOffer?: boolean; pendingChange?: string; consecutiveNonAttempts?: number; lastFailedRun?: FailedKind; failedHint?: FailedHint;
};
type TaskCard = Pick<Task, "title" | "brief" | "deliverableSpec" | "whyItMatters">;

function dataOf(value: Prisma.JsonValue): Data { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Data : {}; }
function json(data: Data): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue; }
function withoutFailure(data: Data): Data { const next = { ...data }; delete next.lastFailedRun; delete next.failedHint; return next; }
function withoutNonAttempts(data: Data): Data { const next = { ...data }; delete next.consecutiveNonAttempts; return next; }
function response(...texts: string[]): ConversationResponse { return { messages: texts.flatMap((text) => chunkTelegramMessage(text)) }; }
export function chunkTelegramMessage(text: string, limit = TELEGRAM_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = []; let start = 0;
  while (start < text.length) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) { const split = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(" ", end)); if (split > start + limit / 2) end = split; }
    chunks.push(text.slice(start, end).trim()); start = end;
    while (text[start] === " " || text[start] === "\n") start += 1;
  }
  return chunks.filter(Boolean);
}
export function renderTaskCard(task: TaskCard): string {
  return [`Today’s task: ${task.title}`, "", task.brief, "", "Deliverable", task.deliverableSpec, "", "Why this matters", task.whyItMatters ?? "This is the next concrete rep toward your milestone."].join("\n");
}
function parseHours(constraints: string): number | null { const found = constraints.match(/\b(\d{1,2})\s*(?:hours?|hrs?)\s*(?:\/|per)?\s*(?:week|wk)?\b/i); const n = found ? Number(found[1]) : NaN; return Number.isInteger(n) && n > 0 && n <= 168 ? n : null; }
function skills(input: string): string[] { return [...new Set(input.split(/[\n,;]+/).map((value) => value.replace(/^[-*•]\s*/, "").trim()).filter(Boolean))].slice(0, 30); }
function jsonSkills(value: Prisma.JsonValue | null): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function profileData(profile: LearnerProfile): Data { return { goal: profile.goal, targetRole: profile.targetRole, background: profile.background, constraints: profile.constraints ?? undefined, selfAssessedSkills: jsonSkills(profile.selfAssessedSkills) }; }
function profileForAgent(profile: LearnerProfile, data: Data) { return { goal: profile.goal, targetRole: profile.targetRole, background: profile.background, constraints: profile.constraints, hoursPerWeek: profile.hoursPerWeek, selfAssessedSkills: data.selfAssessedSkills ?? jsonSkills(profile.selfAssessedSkills) }; }
function profileFacts(data: Data): string[] { return [`Journeyman learner goal: ${data.goal ?? "Unknown"}`, `Target role: ${data.targetRole ?? "Unknown"}`, `Background: ${data.background ?? "Unknown"}`, `Constraints: ${data.constraints ?? "Unknown"}`, `Self-assessed skills: ${(data.selfAssessedSkills ?? []).join(", ") || "Unknown"}`]; }
function profileSummary(data: Data): string { return ["Here’s what I heard:", "", `Goal: ${data.goal ?? "—"}`, `Target role: ${data.targetRole ?? "—"}`, `Background: ${data.background ?? "—"}`, `Constraints: ${data.constraints ?? "—"}`, `Self-assessed skills: ${(data.selfAssessedSkills ?? []).join(", ") || "—"}`, "", "Reply confirm to save this, or /cancel to start over."].join("\n"); }
function gapsText(gaps: GapAnalysis): string { return ["Your gap analysis", "", gaps.summary, "", ...gaps.gaps.sort((a, b) => a.rank - b.rank).map((gap) => `${gap.rank}. ${gap.skill}\n${gap.whyItMatters}\nEvidence: ${gap.evidenceQuotes.map((quote) => `“${quote.quote}” (post ${quote.jobPostIndex + 1})`).join("; ")}`)].join("\n\n"); }
function planText(plan: ProposedPlan): string { return ["Your proposed plan", "", plan.title, plan.summary, "", ...plan.milestones.map((milestone, index) => [`${index + 1}. ${milestone.title}`, milestone.description, `Deliverable: ${milestone.deliverableSpec}`, "Review rubric:", ...milestone.rubric.map((item) => `  ${item.criterion}: ${item.description}`), "Tasks:", ...milestone.tasks.map((task, taskIndex) => `  ${taskIndex + 1}. ${task.title} — ${task.brief}`)].join("\n")), "", "Reply confirm to activate it, or send one change you want. I can revise it once before we lock it in."].join("\n\n"); }

export async function recoverInterruptedConversations(userIds?: string[]): Promise<number> {
  const interrupted = await prisma.conversationState.findMany({
    where: { stage: { in: [ConversationStage.GAPANALYSIS_RUNNING, PLAN_RUNNING] }, ...(userIds ? { userId: { in: userIds } } : {}) },
    select: { id: true, stage: true, data: true },
  });
  if (!interrupted.length) return 0;
  await prisma.$transaction(interrupted.map((state) => {
    const gapInterrupted = state.stage === ConversationStage.GAPANALYSIS_RUNNING;
    return prisma.conversationState.update({
      where: { id: state.id },
      data: {
        stage: gapInterrupted ? ConversationStage.JOBPOSTS_COLLECTING : ConversationStage.PLAN_PROPOSED,
        data: json({ ...dataOf(state.data), lastFailedRun: gapInterrupted ? "gap-analysis" : "plan" }),
      },
    });
  }));
  return interrupted.length;
}
function privateAddress(address: string): boolean {
  if (isIP(address) === 4) { const [a, b] = address.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
  const value = address.toLowerCase(); return value === "::" || value === "::1" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd");
}
async function publicUrl(input: string): Promise<URL | null> {
  try { const url = new URL(input); const host = url.hostname.toLowerCase(); if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null; const addresses = await lookup(host, { all: true, verbatim: true }); return addresses.length && addresses.every((entry) => !privateAddress(entry.address)) ? url : null; } catch { return null; }
}
function htmlText(html: string): string { return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/\s+/g, " ").trim(); }
async function capturePost(input: string): Promise<{ rawText: string; url?: string } | null> {
  const url = await publicUrl(input);
  if (!url) return /^https?:\/\//i.test(input) ? null : { rawText: input };
  try { const result = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "manual", headers: { "user-agent": "Journeyman job-post intake/1.0" } }); if (!result.ok) return null; const rawText = htmlText(await result.text()); return rawText.length >= 200 ? { rawText, url: url.toString() } : null; } catch { return null; }
}
function roleTitle(raw: string): string { const labeled = raw.match(/(?:job\s*title|role|position)\s*[:\-]\s*([^\n]{3,100})/i)?.[1]; const line = raw.split(/\r?\n/).find((value) => value.trim().length >= 3) ?? raw; return (labeled ?? line).replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim().slice(0, 90) || "untitled role"; }
function splitPosts(input: string): string[] {
  const explicit = input.split(/\r?\n\s*(?:---+|\*\*\*+)\s*\r?\n/).map((part) => part.trim()).filter((part) => part.length >= 80);
  if (explicit.length >= 2) return explicit;
  const blocks = input.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter((part) => part.length >= 100);
  if (input.length >= 1600 && blocks.length >= 2) return blocks;
  const headings = [...input.matchAll(/(?:^|\n)\s*(?:\d+[.)]\s*)?(?:job\s*title|role|position)\s*[:\-]/gim)];
  return headings.length >= 2 ? headings.map((heading, index) => input.slice(heading.index, headings[index + 1]?.index).trim()).filter((part) => part.length >= 80) : [input];
}
function collectIntent(input: string): "finish" | "undo" | "correction" | null {
  const value = input.trim().toLowerCase();
  if (/^(?:\/done|done|finished|i'?m done|that(?:'s| is| was) all(?: of (?:them|those))?(?:\s*\d+)?|all of (?:them|those))\b/.test(value)) return "finish";
  if (/^(?:\/undo|undo|remove (?:the )?last|take (?:the )?last)/.test(value)) return "undo";
  if (/^(?:no+|nope|nah|wait|hold on|stop|not that)\b/.test(value)) return "correction";
  return null;
}
function retryableJobPost(rawText: string): boolean {
  const value = rawText.trim();
  if (value.length < 200) return false;
  return !/^(?:no+|nope|nah|wait|hold on|stop|not that|that(?:'s| is| was) all|i'?m done|done|finished)\b/i.test(value);
}
function hasConcreteAttempt(input: string): boolean { return /https?:\/\/|\b(?:error|exception|stack|failed|failing|commit|test|tried|attempted|implemented|console|typescript|html|css|function|component)\b/i.test(input); }
function fakeAttempt(input: string): boolean {
  const value = input.trim().toLowerCase();
  if (/^(?:idk|i don'?t know|no idea|help|just tell me|you tell me|do it for me)[.!?\s]*$/.test(value)) return true;
  const concrete = hasConcreteAttempt(input);
  return (!concrete && /^(?:how do i|what do i|can you|could you|would you|please|tell me|explain)/i.test(value)) || (input.trim().length < 30 && !concrete);
}
function nonAttemptKind(input: string): NonAttemptKind | null {
  const value = input.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, " ");
  const admission = !hasConcreteAttempt(input) && /^(?:i\s+did(?:\s+not|n't)\s+(?:do|start)(?:\s+it)?|i\s+have(?:\s+not|n't)\s+started|i(?:'m|\s+am)\s+stuck|(?:i\s+)?can(?:not|'t)\s+do\s+this|(?:i\s+)?(?:do\s+not|don't)\s+know\s+where\s+to\s+start)\b/.test(value);
  if (admission) return "admission";
  return fakeAttempt(input) ? "cold-ask" : null;
}
function shortQuote(input: string): string { return input.replace(/[\r\n]+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60); }
function refusalText(task: TaskCard, input: string, count: number): string {
  const fragment = shortQuote(input);
  const templates = [
    `I won’t do “${task.title}” for you. You said: “${fragment}”. Show me what you’ve tried—code, text, an error, a link, or a commit—and you earn the next hint.`,
    `The boundary on “${task.title}” is firm: I don’t provide the finished answer. Show me what you’ve tried, even if it is rough or broken, and you earn the next hint.`,
    `For “${task.title},” asking for the solution does not unlock it. Show me what you’ve tried; one concrete attempt earns the next hint.`,
    `I can coach you through “${task.title},” but I can’t take the rep for you. Your message was: “${fragment}”. Show me what you’ve tried and you earn the next hint.`,
    `No finished solution from me for “${task.title}.” Show me what you’ve tried—any inspectable attempt is enough to earn the next hint.`,
  ];
  const escalation = count === 3
    ? "Third ask with nothing shown. The rule hasn’t changed: show an attempt, earn a hint. Use /task to reopen the deliverable spec."
    : count > 3 ? "Another ask with nothing shown. The rule hasn’t changed: show an attempt, earn a hint. Use /task to reopen the deliverable spec." : "";
  return [escalation, templates[(count - 1) % templates.length]].filter(Boolean).join("\n\n");
}
function admissionNudge(task: TaskCard, count: number): string {
  const templates = [
    `Thanks for saying it plainly. For “${task.title},” shrink the task to one first move: ${task.brief} Put down the roughest beginning you can. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task to reopen the full task, or /pause if you need to step away.`,
    `Stuck is a real state, not a failure. On “${task.title},” make the next move only this: ${task.brief} A rough fragment is enough to start. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task to see the task again, or /pause if you need room.`,
    `No shame in not starting. For “${task.title},” begin with the smallest version of this move: ${task.brief} It does not need to work yet. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task for the full task, or /pause if today is not workable.`,
  ];
  return templates[(count - 1) % templates.length];
}
function kindOfAttempt(input: string): AttemptKind { if (/^https?:\/\/\S+$/i.test(input.trim())) return AttemptKind.LINK; return /\bcommit\b|\b[a-f0-9]{7,40}\b/i.test(input) ? AttemptKind.COMMIT : AttemptKind.TEXT; }
function quoteAttempt(input: string): string { return input.replace(/\s+/g, " ").trim().slice(0, 360); }

export class ConversationService {
  private readonly agentRunner: AgentRunner;
  private readonly memory: ProfileMemory;
  private readonly asyncResponder?: AsyncResponder;
  constructor(agentRunner: AgentRunner = runAgent, memory: ProfileMemory = mentorMemory, asyncResponder?: AsyncResponder) { this.agentRunner = agentRunner; this.memory = memory; this.asyncResponder = asyncResponder; }

  async startOnboarding(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId); const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    if (profile) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...dataOf(state.data), ...profileData(profile), startOffer: true }) } }); return response("I found your saved profile. Reply resume to continue from your current flow (with a fresh set of job posts), or restart to redo the interview entirely."); }
    await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_GOAL, data: json({}), planRevisionCount: 0, pausedAt: null } });
    return response("Welcome to Journeyman. What career destination are we working toward? A plain-language goal is perfect.");
  }

  async handleMessage(userId: string, raw: string): Promise<ConversationResponse> {
    const input = raw.trim(); if (!input) return response("Send a short reply when you’re ready. /help shows the available commands."); if (input.startsWith("/")) return this.handleCommand(userId, input);
    const state = await this.ensureState(userId); const data = dataOf(state.data); if (data.startOffer) return this.resumeOffer(userId, state, data, input);
    switch (state.stage) {
      case ConversationStage.ONBOARDING_GOAL: return this.advance(userId, ConversationStage.ONBOARDING_ROLE, { ...data, goal: input }, "What target role or kind of work are you aiming for?");
      case ConversationStage.ONBOARDING_ROLE: return this.advance(userId, ConversationStage.ONBOARDING_BACKGROUND, { ...data, targetRole: input }, "What is your background so far? Include relevant work, study, or projects in a few sentences.");
      case ConversationStage.ONBOARDING_BACKGROUND: return this.advance(userId, ConversationStage.ONBOARDING_CONSTRAINTS, { ...data, background: input }, "What constraints should shape the plan? Include hours per week and any schedule or access limits.");
      case ConversationStage.ONBOARDING_CONSTRAINTS: return this.advance(userId, ConversationStage.ONBOARDING_SKILLS, { ...data, constraints: input }, "What skills do you already feel comfortable with? A comma-separated list is great; ‘not sure yet’ is also useful.");
      case ConversationStage.ONBOARDING_SKILLS: { const next = { ...data, selfAssessedSkills: skills(input) }; await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_CONFIRM, data: json(next) } }); return response(profileSummary(next)); }
      case ConversationStage.ONBOARDING_CONFIRM: return input.toLowerCase() === "confirm" ? this.confirmProfile(userId, data) : response("Reply confirm to save the profile, or /cancel to start over.");
      case ConversationStage.JOBPOSTS_COLLECTING: return this.collectPost(userId, data, input);
      case ConversationStage.GAPANALYSIS_RUNNING: return response("I’m still reading your posts. I’ll come back here when the result is ready; your state is safe.");
      case PLAN_RUNNING: return response("I’m still turning your gaps into a plan. I’ll come back here when it is ready; your state is safe.");
      case ConversationStage.PLAN_PROPOSED: return this.planReply(userId, data, input, state.planRevisionCount);
      case ConversationStage.PLAN_ACTIVE: return this.activeTaskMessage(userId, data, input);
      default: return response("Use /start, /task, /plan, /progress, or /help.");
    }
  }

  async handleCommand(userId: string, raw: string): Promise<ConversationResponse> {
    await this.resetNonAttempts(userId);
    const [command] = raw.toLowerCase().split(/\s+/, 1);
    if (command === "/start") return this.startOnboarding(userId);
    if (command === "/cancel") { await this.ensureState(userId); await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.IDLE, data: json({}), planRevisionCount: 0, pausedAt: null } }); return response("Onboarding cancelled. Your saved profile and plans are untouched. Send /start whenever you want to begin again."); }
    if (command === "/help") return response("Commands: /start, /cancel, /done, /undo, /retry, /task, /plan, /progress, /pause, /resume, /transcript, /help. During job-post intake: one post per message or several together, up to 5 total.");
    if (command === "/done") return this.finishPosts(userId);
    if (command === "/undo") return this.undoPost(userId);
    if (command === "/retry") return this.retry(userId);
    if (command === "/task") return this.currentTask(userId);
    if (command === "/plan") return this.currentPlan(userId);
    if (command === "/progress") return this.progress(userId);
    if (command === "/pause") return this.pause(userId);
    if (command === "/resume") return this.resume(userId);
    if (command === "/transcript") return this.transcript(userId);
    return response("I don’t recognize that command. /help shows what’s available.");
  }

  private async ensureState(userId: string): Promise<ConversationState> { return prisma.conversationState.upsert({ where: { userId }, create: { userId, data: json({}) }, update: {} }); }
  private async resetNonAttempts(userId: string): Promise<void> { const state = await this.ensureState(userId); const data = dataOf(state.data); if (data.consecutiveNonAttempts !== undefined) await prisma.conversationState.update({ where: { userId }, data: { data: json(withoutNonAttempts(data)) } }); }
  private async deliver(userId: string, result: ConversationResponse): Promise<void> { try { await this.asyncResponder?.(userId, result); } catch (error) { console.error("[conversation] async delivery failed", error); } }
  private async advance(userId: string, stage: ConversationStage, data: Data, text: string): Promise<ConversationResponse> { await prisma.conversationState.update({ where: { userId }, data: { stage, data: json(data) } }); return response(text); }
  private async resumeOffer(userId: string, state: ConversationState, data: Data, input: string): Promise<ConversationResponse> {
    const value = input.toLowerCase();
    if (/^(?:restart|start over|redo)\b/.test(value)) { await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_GOAL, data: json({}), planRevisionCount: 0, pausedAt: null } }); return response("Fresh start. What career destination are we working toward?"); }
    if (!/^(?:resume|continue|collect|fresh)\b/.test(value)) return response("Reply resume to use your saved profile with a fresh job-post set, or restart to redo the interview.");
    if (state.stage === ConversationStage.PLAN_ACTIVE) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, startOffer: false }) } }); return response("Your plan is already active. Use /task to continue, /progress to check in, or /pause if life needs room."); }
    if (state.stage === ConversationStage.PLAN_PROPOSED && data.proposedPlan) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, startOffer: false }) } }); return response("Your plan proposal is still waiting. Reply confirm to activate it, or send one change for its single revision."); }
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } }); await prisma.jobPost.deleteMany({ where: { userId } });
    await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.JOBPOSTS_COLLECTING, data: json(profile ? profileData(profile) : withoutFailure(data)), planRevisionCount: 0 } });
    return response("Great—we’ll use your saved profile and start the job posts fresh. Paste job posts: one per message or several in one message, up to 5 total. Send /done when finished; /undo removes the last.");
  }

  private async confirmProfile(userId: string, data: Data): Promise<ConversationResponse> {
    if (!data.goal || !data.targetRole || !data.background) { await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_GOAL, data: json({}) } }); return response("I lost part of the intake, so let’s restart cleanly. What career destination are we working toward?"); }
    const next = withoutFailure({ ...data, pendingPosts: undefined, donePrompted: false, startOffer: false });
    await prisma.$transaction([
      prisma.jobPost.deleteMany({ where: { userId } }),
      prisma.learnerProfile.upsert({ where: { userId }, create: { userId, goal: data.goal, targetRole: data.targetRole, background: data.background, constraints: data.constraints, hoursPerWeek: data.constraints ? parseHours(data.constraints) : null, selfAssessedSkills: data.selfAssessedSkills ?? [] }, update: { goal: data.goal, targetRole: data.targetRole, background: data.background, constraints: data.constraints, hoursPerWeek: data.constraints ? parseHours(data.constraints) : null, selfAssessedSkills: data.selfAssessedSkills ?? [] } }),
    ]);
    await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.JOBPOSTS_COLLECTING, data: json(next) } }); await this.memory.remember(profileFacts(next));
    return response("Profile saved. Paste job posts — one per message OR several in one message. Up to 5 total. Send /done when finished; /undo removes the last.");
  }

  private async collectPost(userId: string, data: Data, input: string): Promise<ConversationResponse> {
    if (data.pendingPosts?.length) return this.pendingReply(userId, data, input);
    const intent = collectIntent(input); if (intent === "finish") return this.finishPosts(userId); if (intent === "undo") return this.undoPost(userId); if (intent === "correction") return response("No problem—I didn’t store that as a post. Paste the next role, send /undo to remove the last saved one, or /done when you’re ready.");
    const count = await prisma.jobPost.count({ where: { userId } }); if (count >= MAX_POSTS) return response(`You have ${MAX_POSTS} job posts. Send /done and I’ll analyze them.`);
    const captured = (await Promise.all(splitPosts(input).map(capturePost))).filter((item): item is { rawText: string; url?: string } => item !== null);
    if (!captured.length) return response("I don’t think that was a job post. Paste the role text (or a public HTTPS URL), send /undo to remove the last saved post, or /done when you’re ready.");
    const posts = captured.map((post) => ({ ...post, title: roleTitle(post.rawText) }));
    if (posts.length > 1) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, pendingPosts: posts }) } }); return response(`I see what looks like ${posts.length} posts — store all ${posts.length}? Reply yes, split-edit, or no.`); }
    return this.storePosts(userId, data, posts);
  }

  private async pendingReply(userId: string, data: Data, input: string): Promise<ConversationResponse> {
    const value = input.trim().toLowerCase();
    if (/^(?:yes|y|store|confirm)\b/.test(value)) return this.storePosts(userId, data, data.pendingPosts ?? []);
    if (/^(?:split[ -]?edit|edit|separate)\b/.test(value)) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, pendingPosts: undefined }) } }); return response("I left that batch untouched. Paste each corrected role as its own message, or send a new multi-post batch when it is ready."); }
    if (/^(?:no+|nope|nah|cancel)\b/.test(value)) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, pendingPosts: undefined }) } }); return response("Okay, I did not store those posts. Paste a role when you’re ready."); }
    return response("I’m holding that batch without storing it. Reply yes to store all, split-edit to correct it, or no to discard it.");
  }

  private async storePosts(userId: string, data: Data, posts: PendingPost[]): Promise<ConversationResponse> {
    const count = await prisma.jobPost.count({ where: { userId } }); const accepted = posts.slice(0, Math.max(0, MAX_POSTS - count));
    if (!accepted.length) return response(`You already have ${MAX_POSTS} job posts. Send /done and I’ll analyze them.`);
    await prisma.$transaction(accepted.map((post) => prisma.jobPost.create({ data: { userId, url: post.url, rawText: post.rawText, parsedSkills: [] } })));
    const total = count + accepted.length; await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, pendingPosts: undefined, donePrompted: false }) } });
    return response(`Saved ${total}/${MAX_POSTS}: ${accepted.map((post) => post.title).join("; ")}. ${total >= MIN_POSTS ? "Send /done when this sample is representative." : "Paste another role."}`);
  }

  private async undoPost(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId); if (state.stage !== ConversationStage.JOBPOSTS_COLLECTING) return response("/undo is available while collecting job posts.");
    const latest = await prisma.jobPost.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }); if (!latest) return response("There isn’t a saved job post to remove yet.");
    await prisma.jobPost.delete({ where: { id: latest.id } }); const total = await prisma.jobPost.count({ where: { userId } }); return response(`Removed “${roleTitle(latest.rawText)}.” You now have ${total}/${MAX_POSTS} saved posts.`);
  }

  private async finishPosts(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId); if (state.stage !== ConversationStage.JOBPOSTS_COLLECTING) return response("/done is for the job-post step. /help shows the available commands.");
    const data = dataOf(state.data); if (data.pendingPosts?.length) return response("I’m still holding a multi-post batch. Reply yes to store it, split-edit to correct it, or no to discard it before /done.");
    const posts = await prisma.jobPost.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { rawText: true } }); if (!posts.length) return response("Paste at least one real job post before I can look for evidence-backed gaps.");
    if (posts.length < MIN_POSTS && !data.donePrompted) { await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, donePrompted: true }) } }); return response(`You have ${posts.length} post${posts.length === 1 ? "" : "s"}; ${MIN_POSTS} is better for a useful intersection. Send /done again to continue with this sample, or paste another post.`); }
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } }); if (!profile) return response("Your profile is missing. Send /start and we’ll rebuild it before analyzing posts.");
    const next = withoutFailure({ ...data, donePrompted: false }); await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.GAPANALYSIS_RUNNING, data: json(next) } }); return this.launchGap(userId, profile, posts, next);
  }
  private async launchGap(userId: string, profile: LearnerProfile, posts: Array<{ rawText: string }>, data: Data): Promise<ConversationResponse> {
    if (!this.asyncResponder) return this.runGap(userId, profile, posts, data, false);
    void this.runGap(userId, profile, posts, data, true).then((result) => this.deliver(userId, result)).catch((error) => console.error("[conversation] contained gap failure", error));
    return response("Reading your posts — this takes 1–3 minutes. I’ll come to you.");
  }
  private async runGap(userId: string, profile: LearnerProfile, posts: Array<{ rawText: string }>, data: Data, notifyBeforePlan: boolean): Promise<ConversationResponse> {
    let gaps: GapAnalysis;
    try { gaps = await this.agentRunner("gap-analysis", "prompts/gap-analysis.md", { profile: profileForAgent(profile, data), jobPosts: posts.map((post, index) => ({ index, text: post.rawText })), memoryQuery: `${profile.targetRole} skills and learner goal ${profile.goal}` }, gapAnalysisSchema); }
    catch (error) { console.error(`[conversation] gap analysis failed for ${userId}`, error); const failed = { ...data, lastFailedRun: "gap-analysis" as const }; await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.JOBPOSTS_COLLECTING, data: json(failed) } }); return response("I hit a snag on my side — your profile and posts are safe. Send /retry to run the gap analysis again."); }
    const next = withoutFailure({ ...data, gaps }); await prisma.conversationState.update({ where: { userId }, data: { stage: PLAN_RUNNING, data: json(next) } }); if (notifyBeforePlan) await this.deliver(userId, response("I found the evidence-backed gaps. Turning them into a plan now — this takes another 1–3 minutes."));
    return this.runPlan(userId, profile, next);
  }
  private async launchPlan(userId: string, profile: LearnerProfile, data: Data, change?: string, revision = 0): Promise<ConversationResponse> {
    const running = withoutFailure({ ...data, pendingChange: change });
    await prisma.conversationState.update({ where: { userId }, data: { stage: PLAN_RUNNING, data: json(running), planRevisionCount: revision } });
    if (!this.asyncResponder) return this.runPlan(userId, profile, running, change, revision);
    void this.runPlan(userId, profile, running, change, revision).then((result) => this.deliver(userId, result)).catch((error) => console.error("[conversation] contained plan failure", error));
    return response(change ? "I’m revising the proposal — this takes 1–3 minutes. I’ll come to you." : "Turning your gaps into a plan — this takes 1–3 minutes. I’ll come to you.");
  }
  private async runPlan(userId: string, profile: LearnerProfile, data: Data, change?: string, revision = 0): Promise<ConversationResponse> {
    if (!data.gaps) return response("I need the gap analysis before proposing a plan. Send /retry to run it again.");
    try {
      const plan = await this.agentRunner("plan", "prompts/plan.md", { profile: profileForAgent(profile, data), gaps: data.gaps, ...(change ? { requestedChange: change } : {}), memoryQuery: `${profile.targetRole} plan aligned to ${profile.goal}` }, planSchema);
      const next = withoutFailure({ ...data, pendingChange: undefined, proposedPlan: plan }); await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.PLAN_PROPOSED, data: json(next), planRevisionCount: revision } }); return response(gapsText(data.gaps), planText(plan));
    } catch (error) { console.error(`[conversation] plan failed for ${userId}`, error); const failed = { ...data, lastFailedRun: "plan" as const }; await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.PLAN_PROPOSED, data: json(failed), planRevisionCount: revision } }); return response(gapsText(data.gaps), "I hit a snag on my side — your gaps are safe. Send /retry to run the plan again."); }
  }
  private async planReply(userId: string, data: Data, input: string, revision: number): Promise<ConversationResponse> {
    if (input.toLowerCase() === "confirm") return this.persistPlan(userId, data);
    if (revision >= 1) return response("We’ve used the one revision loop. Reply confirm to activate this plan, or /cancel to start the intake again.");
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } }); return profile ? this.launchPlan(userId, profile, data, input, revision + 1) : response("Your saved profile is missing. Send /start and we’ll rebuild it.");
  }
  private async persistPlan(userId: string, data: Data): Promise<ConversationResponse> {
    if (!data.proposedPlan) return response("The proposed plan is missing. Send /retry to run the plan again.");
    const proposed = data.proposedPlan;
    let first: Task;
    try { first = await prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({ where: { userId, status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE, PlanStatus.PAUSED] } }, data: { status: PlanStatus.COMPLETED } });
      const plan = await tx.plan.create({ data: { userId, title: proposed.title, summary: proposed.summary, status: PlanStatus.ACTIVE } }); let active: Task | null = null;
      for (const [mi, milestone] of proposed.milestones.entries()) {
        const saved = await tx.milestone.create({ data: { planId: plan.id, idx: mi, title: milestone.title, description: milestone.description, deliverableSpec: milestone.deliverableSpec, rubric: milestone.rubric, status: mi === 0 ? MilestoneStatus.ACTIVE : MilestoneStatus.LOCKED } });
        for (const [ti, task] of milestone.tasks.entries()) { const isFirst = mi === 0 && ti === 0; const savedTask = await tx.task.create({ data: { milestoneId: saved.id, idx: ti, title: task.title, brief: task.brief, deliverableSpec: task.deliverableSpec, whyItMatters: task.whyItMatters, status: isFirst ? TaskStatus.ACTIVE : TaskStatus.SCHEDULED, assignedAt: isFirst ? new Date() : null } }); if (isFirst) active = savedTask; }
      }
      if (!active) throw new Error("A proposed plan did not contain a first task.");
      await tx.conversationState.update({ where: { userId }, data: { stage: ConversationStage.PLAN_ACTIVE, data: json({ ...withoutFailure(data), planId: plan.id }), pausedAt: null } }); return active;
    }); } catch (error) { console.error(`[conversation] plan persistence failed for ${userId}`, error); return response("I couldn't save the plan — reply confirm to try again."); }
    return response("Plan confirmed. Your first task is active now—no waiting for tomorrow morning.", renderTaskCard(first));
  }
  private async retry(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId); const data = dataOf(state.data);
    if (data.lastFailedRun === "gap-analysis") {
      const [profile, storedPosts] = await Promise.all([
        prisma.learnerProfile.findUnique({ where: { userId } }),
        prisma.jobPost.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, rawText: true } }),
      ]);
      if (!profile) return response("I need your saved profile before I can retry the gap analysis. Send /start and choose resume.");
      const posts = storedPosts.filter((post) => retryableJobPost(post.rawText));
      const discarded = storedPosts.filter((post) => !retryableJobPost(post.rawText));
      if (discarded.length) await prisma.jobPost.deleteMany({ where: { id: { in: discarded.map((post) => post.id) } } });
      if (posts.length < MIN_POSTS) {
        const next = withoutFailure({ ...data, donePrompted: false });
        await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.JOBPOSTS_COLLECTING, data: json(next) } });
        const cleared = discarded.length ? ` I cleared ${discarded.length} stored entr${discarded.length === 1 ? "y" : "ies"} that ${discarded.length === 1 ? "was" : "were"} not job posts.` : "";
        return response(`I need a fresh set of at least ${MIN_POSTS} complete job posts before retrying.${cleared} Paste job posts one at a time or as a batch, then send /done.`);
      }
      await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.GAPANALYSIS_RUNNING } });
      return this.launchGap(userId, profile, posts, data);
    }
    if (data.lastFailedRun === "plan") { const profile = await prisma.learnerProfile.findUnique({ where: { userId } }); return profile && data.gaps ? this.launchPlan(userId, profile, data, data.pendingChange, state.planRevisionCount) : response("I need the saved profile and gap analysis before I can retry the plan."); }
    if (data.lastFailedRun === "hint" && data.failedHint) return this.retryHint(userId, data, data.failedHint);
    return response("Nothing is waiting to retry. Continue with the next prompt, or use /help.");
  }
  private async activeTaskMessage(userId: string, data: Data, input: string): Promise<ConversationResponse> {
    const task = await activeTaskForUser(userId); if (!task) return response("No active task right now. Finish onboarding with /start, or check /plan.");
    const nonAttempt = nonAttemptKind(input);
    if (nonAttempt) { const count = (data.consecutiveNonAttempts ?? 0) + 1; await prisma.conversationState.update({ where: { userId }, data: { data: json({ ...data, consecutiveNonAttempts: count }) } }); return response(nonAttempt === "admission" ? admissionNudge(task, count) : refusalText(task, input, count)); }
    const next = withoutNonAttempts(data); if (data.consecutiveNonAttempts !== undefined) await prisma.conversationState.update({ where: { userId }, data: { data: json(next) } });
    const count = await prisma.hintEvent.count({ where: { userId, taskId: task.id } }); if (count >= 5) return response("You’re at level 5/5 on this task. Bring your current explanation to the defense-style wrap-up rather than asking for more solution text.");
    const level = count + 1; const attempt = await prisma.attempt.create({ data: { userId, taskId: task.id, kind: kindOfAttempt(input), content: input } }); return this.launchHint(userId, next, task, attempt.id, input, level);
  }
  private async launchHint(userId: string, data: Data, task: Task, attemptId: string, content: string, level: number): Promise<ConversationResponse> {
    if (!this.asyncResponder) return this.runHint(userId, data, task, attemptId, content, level);
    void this.runHint(userId, data, task, attemptId, content, level).then((result) => this.deliver(userId, result)).catch((error) => console.error("[conversation] contained hint failure", error));
    return response(`I see your attempt. You’re at level ${level}/5—I’m reading it and will come back with the next earned hint.`);
  }
  private async runHint(userId: string, data: Data, task: Task, attemptId: string, content: string, level: number): Promise<ConversationResponse> {
    try {
      const result = await this.agentRunner("hint", "prompts/hint.md", { task: { title: task.title, brief: task.brief, deliverableSpec: task.deliverableSpec }, attempt: content, ladderLevel: level, memoryQuery: `${task.title} learner attempt and next hint` }, hintSchema);
      await prisma.hintEvent.create({ data: { userId, taskId: task.id, attemptId, level, content: result.hint } }); await prisma.conversationState.update({ where: { userId }, data: { data: json(withoutFailure(data)) } }); return response(`Level ${level}/5`, `You showed: “${quoteAttempt(content)}”`, result.hint);
    } catch (error) { console.error(`[conversation] hint failed for ${userId}`, error); const failed = { ...data, lastFailedRun: "hint" as const, failedHint: { taskId: task.id, attemptId, level } }; await prisma.conversationState.update({ where: { userId }, data: { data: json(failed) } }); return response("I hit a snag on my side — your attempt is saved. Send /retry to run that hint again."); }
  }
  private async retryHint(userId: string, data: Data, failed: FailedHint): Promise<ConversationResponse> {
    const [task, attempt] = await Promise.all([prisma.task.findUnique({ where: { id: failed.taskId } }), prisma.attempt.findUnique({ where: { id: failed.attemptId } })]); return task && attempt && attempt.userId === userId ? this.launchHint(userId, data, task, attempt.id, attempt.content, failed.level) : response("I couldn’t find the saved attempt to retry. Send a fresh attempt when you’re ready.");
  }
  private async currentTask(userId: string): Promise<ConversationResponse> { const task = await activeTaskForUser(userId); return task ? response(renderTaskCard(task)) : response("No active task right now. Finish onboarding with /start, or check /plan."); }
  private async currentPlan(userId: string): Promise<ConversationResponse> {
    const plan = await prisma.plan.findFirst({ where: { userId, status: { in: [PlanStatus.ACTIVE, PlanStatus.PAUSED] } }, include: { milestones: { include: { tasks: { orderBy: { idx: "asc" } } }, orderBy: { idx: "asc" } } }, orderBy: { updatedAt: "desc" } });
    return plan ? response([plan.title, plan.summary, "", ...plan.milestones.map((milestone, index) => `${index + 1}. ${milestone.title} — ${milestone.tasks.map((task) => `${task.status === TaskStatus.ACTIVE ? "→ " : ""}${task.title}`).join(" · ")}`)].join("\n")) : response("No active plan yet. Send /start to begin the intake.");
  }
  private async progress(userId: string): Promise<ConversationResponse> {
    const tasks = await prisma.task.findMany({ where: { milestone: { plan: { userId, status: { in: [PlanStatus.ACTIVE, PlanStatus.PAUSED] } } } } }); if (!tasks.length) return response("No plan progress to show yet. Send /start to begin.");
    const complete = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length; const active = tasks.find((task) => task.status === TaskStatus.ACTIVE); const scheduled = tasks.filter((task) => task.status === TaskStatus.SCHEDULED).length;
    return response(`Progress: ${complete}/${tasks.length} tasks complete. ${active ? `Current task: ${active.title}.` : "No task is active."} ${scheduled} task${scheduled === 1 ? "" : "s"} scheduled after that.`);
  }
  private async pause(userId: string): Promise<ConversationResponse> { const state = await this.ensureState(userId); if (state.stage !== ConversationStage.PLAN_ACTIVE) return response("There is no active plan to pause yet."); await prisma.$transaction([prisma.conversationState.update({ where: { userId }, data: { pausedAt: new Date() } }), prisma.plan.updateMany({ where: { userId, status: PlanStatus.ACTIVE }, data: { status: PlanStatus.PAUSED } })]); return response("Paused. No morning task or evening nudge will be sent until you use /resume. Your active task will be waiting without penalty."); }
  private async resume(userId: string): Promise<ConversationResponse> { const state = await this.ensureState(userId); if (state.stage !== ConversationStage.PLAN_ACTIVE || !state.pausedAt) return response("You are not paused. Use /task when you’re ready for the next rep."); await prisma.$transaction([prisma.conversationState.update({ where: { userId }, data: { pausedAt: null } }), prisma.plan.updateMany({ where: { userId, status: PlanStatus.PAUSED }, data: { status: PlanStatus.ACTIVE } })]); return response("Welcome back. Your plan is active again. Use /task whenever you’re ready; the next scheduled delivery will follow the normal morning rhythm."); }
  private async transcript(userId: string): Promise<ConversationResponse> { const user = await prisma.user.findUnique({ where: { id: userId }, select: { slug: true } }); return user ? response(`${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/t/${user.slug}`) : response("I couldn’t find your public transcript yet."); }
}

export async function activeTaskForUser(userId: string) { return prisma.task.findFirst({ where: { status: TaskStatus.ACTIVE, milestone: { plan: { userId } } }, orderBy: { assignedAt: "asc" } }); }
export async function activateNextScheduledTask(userId: string): Promise<Task | null> { return prisma.$transaction(async (tx) => { const active = await tx.task.findFirst({ where: { status: TaskStatus.ACTIVE, milestone: { plan: { userId } } } }); if (active) return null; const next = await tx.task.findFirst({ where: { status: TaskStatus.SCHEDULED, milestone: { plan: { userId, status: PlanStatus.ACTIVE } } }, orderBy: [{ milestone: { idx: "asc" } }, { idx: "asc" }] }); return next ? tx.task.update({ where: { id: next.id }, data: { status: TaskStatus.ACTIVE, assignedAt: new Date() } }) : null; }); }
export async function scheduledUsers() { return prisma.user.findMany({ where: { conversationState: { is: { stage: ConversationStage.PLAN_ACTIVE, pausedAt: null } } }, select: { id: true, telegramId: true } }); }
export async function stalledUsersSince(start: Date) { const users = await scheduledUsers(); const stalled: Array<{ id: string; telegramId: string; task: Task }> = []; for (const user of users) { if (!user.telegramId) continue; const task = await activeTaskForUser(user.id); if (!task) continue; const activity = await prisma.attempt.count({ where: { userId: user.id, taskId: task.id, createdAt: { gte: start } } }); if (!activity) stalled.push({ id: user.id, telegramId: user.telegramId, task }); } return stalled; }
