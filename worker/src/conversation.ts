import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  ConversationStage,
  MilestoneStatus,
  PlanStatus,
  Prisma,
  TaskStatus,
  type ConversationState,
  type LearnerProfile,
  type Task,
} from "@prisma/client";
import { z, type ZodTypeAny } from "zod";
import { type AgentContext, type AgentResult, runAgent } from "./codex.ts";
import { mentorMemory } from "./memory.ts";
import { prisma } from "./prisma.ts";
const TELEGRAM_SAFE_LENGTH = 4000;
const MIN_JOB_POSTS = 3;
const MAX_JOB_POSTS = 5;

export const gapAnalysisSchema = z.object({
  summary: z.string().min(1),
  gaps: z.array(z.object({
    skill: z.string().min(1),
    whyItMatters: z.string().min(1),
    rank: z.number().int().min(1),
    evidenceQuotes: z.array(z.object({
      quote: z.string().min(1),
      jobPostIndex: z.number().int().min(0),
    }).strict()).min(1),
  }).strict()).min(5),
}).strict();

export const planSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  milestones: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    deliverableSpec: z.string().min(1),
    rubric: z.record(z.string().min(1), z.string().min(1)).refine(
      (rubric) => Object.keys(rubric).length > 0,
      "A milestone needs at least one review criterion.",
    ),
    tasks: z.array(z.object({
      title: z.string().min(1),
      brief: z.string().min(1),
      deliverableSpec: z.string().min(1),
      whyItMatters: z.string().min(1),
    }).strict()).min(2).max(6),
  }).strict()).min(2).max(4),
}).strict();

export type GapAnalysis = z.output<typeof gapAnalysisSchema>;
export type ProposedPlan = z.output<typeof planSchema>;
export type AgentRunner = <TSchema extends ZodTypeAny>(
  kind: string,
  promptFile: string,
  context: AgentContext,
  schema: TSchema,
) => Promise<AgentResult<TSchema>>;

export type ConversationResponse = {
  messages: string[];
};

type ProfileMemory = Pick<typeof mentorMemory, "remember">;

type ConversationData = {
  goal?: string;
  targetRole?: string;
  background?: string;
  constraints?: string;
  selfAssessedSkills?: string[];
  gaps?: GapAnalysis;
  proposedPlan?: ProposedPlan;
  planId?: string;
};

type TaskCard = Pick<Task, "title" | "brief" | "deliverableSpec" | "whyItMatters">;

function asData(value: Prisma.JsonValue): ConversationData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as ConversationData;
}

function toJson(data: ConversationData): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

function textResponse(...texts: string[]): ConversationResponse {
  return { messages: texts.flatMap((text) => chunkTelegramMessage(text)) };
}

export function chunkTelegramMessage(text: string, maxLength = TELEGRAM_SAFE_LENGTH): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + maxLength, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end);
      const space = text.lastIndexOf(" ", end);
      const preferred = Math.max(newline, space);
      if (preferred > cursor + Math.floor(maxLength / 2)) end = preferred;
    }
    chunks.push(text.slice(cursor, end).trim());
    cursor = end;
    while (text[cursor] === " " || text[cursor] === "\n") cursor += 1;
  }
  return chunks.filter(Boolean);
}

export function renderTaskCard(task: TaskCard): string {
  return [
    `Today’s task: ${task.title}`,
    "",
    task.brief,
    "",
    "Deliverable",
    task.deliverableSpec,
    "",
    "Why this matters",
    task.whyItMatters ?? "This is the next concrete rep toward your milestone.",
  ].join("\n");
}

function parseHoursPerWeek(constraints: string): number | null {
  const match = constraints.match(/\b(\d{1,2})\s*(?:hours?|hrs?)\s*(?:\/|per)?\s*(?:week|wk)?\b/i);
  if (!match) return null;
  const hours = Number(match[1]);
  return Number.isInteger(hours) && hours > 0 && hours <= 168 ? hours : null;
}

function parseSkills(input: string): string[] {
  return [...new Set(input
    .split(/[\n,;]+/)
    .map((skill) => skill.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean))].slice(0, 30);
}

function profileFacts(data: ConversationData): string[] {
  return [
    `Journeyman learner goal: ${data.goal ?? "Unknown"}`,
    `Target role: ${data.targetRole ?? "Unknown"}`,
    `Background: ${data.background ?? "Unknown"}`,
    `Constraints: ${data.constraints ?? "Unknown"}`,
    `Self-assessed skills: ${(data.selfAssessedSkills ?? []).join(", ") || "Unknown"}`,
  ];
}

function profileSummary(data: ConversationData): string {
  return [
    "Here’s what I heard:",
    "",
    `Goal: ${data.goal ?? "—"}`,
    `Target role: ${data.targetRole ?? "—"}`,
    `Background: ${data.background ?? "—"}`,
    `Constraints: ${data.constraints ?? "—"}`,
    `Self-assessed skills: ${(data.selfAssessedSkills ?? []).join(", ") || "—"}`,
    "",
    "Reply confirm to save this, or /cancel to start over.",
  ].join("\n");
}

function renderGaps(gaps: GapAnalysis): string {
  const rows = gaps.gaps
    .sort((left, right) => left.rank - right.rank)
    .map((gap) => {
      const evidence = gap.evidenceQuotes
        .map((quote) => `“${quote.quote}” (post ${quote.jobPostIndex + 1})`)
        .join("; ");
      return `${gap.rank}. ${gap.skill}\n${gap.whyItMatters}\nEvidence: ${evidence}`;
    });
  return ["Your gap analysis", "", gaps.summary, "", ...rows].join("\n\n");
}

function renderPlan(plan: ProposedPlan): string {
  const milestones = plan.milestones.map((milestone, index) => [
    `${index + 1}. ${milestone.title}`,
    milestone.description,
    `Deliverable: ${milestone.deliverableSpec}`,
    `Review rubric: ${Object.entries(milestone.rubric).map(([criterion, expectation]) => `${criterion} — ${expectation}`).join("; ")}`,
    "Tasks:",
    ...milestone.tasks.map((task, taskIndex) => `  ${taskIndex + 1}. ${task.title} — ${task.brief}`),
  ].join("\n")).join("\n\n");

  return ["Your proposed plan", "", plan.title, plan.summary, "", milestones, "", "Reply confirm to activate it, or send one change you want. I can revise it once before we lock it in."].join("\n");
}

function agentProfile(profile: LearnerProfile, data: ConversationData) {
  return {
    goal: profile.goal,
    targetRole: profile.targetRole,
    background: profile.background,
    constraints: profile.constraints,
    hoursPerWeek: profile.hoursPerWeek,
    selfAssessedSkills: data.selfAssessedSkills ?? [],
  };
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [first, second] = address.split(".").map(Number);
    return first === 10
      || first === 127
      || first === 0
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1"
    || normalized === "::"
    || normalized.startsWith("fe80:")
    || normalized.startsWith("fc")
    || normalized.startsWith("fd");
}

async function publicHttpsUrl(input: string): Promise<URL | null> {
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return null;
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address)) ? url : null;
  } catch {
    return null;
  }
}
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

async function captureJobPost(input: string): Promise<{ rawText: string; url?: string } | null> {
  const url = await publicHttpsUrl(input);
  if (!url) return /^https?:\/\//i.test(input) ? null : { rawText: input };
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3_000),
      redirect: "manual",
      headers: { "user-agent": "Journeyman job-post intake/1.0" },
    });
    if (!response.ok) return null;
    const text = htmlToText(await response.text());
    return text.length >= 200 ? { rawText: text, url: url.toString() } : null;
  } catch {
    return null;
  }
}

export class ConversationService {
  private readonly agentRunner: AgentRunner;
  private readonly memory: ProfileMemory;

  constructor(agentRunner: AgentRunner = runAgent, memory: ProfileMemory = mentorMemory) {
    this.agentRunner = agentRunner;
    this.memory = memory;
  }

  async startOnboarding(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId);
    if (state.stage === ConversationStage.PLAN_ACTIVE) {
      return textResponse("You already have an active plan. Use /task for today’s work, /plan to revisit the roadmap, or /progress to see the count.");
    }
    await prisma.conversationState.update({
      where: { userId },
      data: { stage: ConversationStage.ONBOARDING_GOAL, data: toJson({}), planRevisionCount: 0, pausedAt: null },
    });
    return textResponse("Welcome to Journeyman. What career destination are we working toward? A plain-language goal is perfect.");
  }

  async handleMessage(userId: string, rawInput: string): Promise<ConversationResponse> {
    const input = rawInput.trim();
    if (!input) return textResponse("Send a short reply when you’re ready. /help shows the available commands.");
    if (input.startsWith("/")) return this.handleCommand(userId, input);

    const state = await this.ensureState(userId);
    const data = asData(state.data);

    switch (state.stage) {
      case ConversationStage.ONBOARDING_GOAL:
        return this.advance(userId, ConversationStage.ONBOARDING_ROLE, { ...data, goal: input }, "What target role or kind of work are you aiming for?");
      case ConversationStage.ONBOARDING_ROLE:
        return this.advance(userId, ConversationStage.ONBOARDING_BACKGROUND, { ...data, targetRole: input }, "What is your background so far? Include relevant work, study, or projects in a few sentences.");
      case ConversationStage.ONBOARDING_BACKGROUND:
        return this.advance(userId, ConversationStage.ONBOARDING_CONSTRAINTS, { ...data, background: input }, "What constraints should shape the plan? Include hours per week and any schedule or access limits.");
      case ConversationStage.ONBOARDING_CONSTRAINTS:
        return this.advance(userId, ConversationStage.ONBOARDING_SKILLS, { ...data, constraints: input }, "What skills do you already feel comfortable with? A comma-separated list is great; ‘not sure yet’ is also useful.");
      case ConversationStage.ONBOARDING_SKILLS: {
        const next = { ...data, selfAssessedSkills: parseSkills(input) };
        await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_CONFIRM, data: toJson(next) } });
        return textResponse(profileSummary(next));
      }
      case ConversationStage.ONBOARDING_CONFIRM:
        return input.toLowerCase() === "confirm"
          ? this.confirmProfile(userId, data)
          : textResponse("Reply confirm to save the profile, or /cancel to start over.");
      case ConversationStage.JOBPOSTS_COLLECTING:
        return this.collectJobPost(userId, data, input);
      case ConversationStage.PLAN_PROPOSED:
        return this.handlePlanReply(userId, data, input, state.planRevisionCount);
      case ConversationStage.GAPANALYSIS_RUNNING:
        return textResponse("I’m still turning those posts into an evidence-backed gap analysis. Give me a moment, then use /done if you need to retry.");
      case ConversationStage.PLAN_ACTIVE:
      case ConversationStage.IDLE:
      default:
        return textResponse("The full struggle session arrives next pass. For now, use /task, /plan, /progress, or /help.");
    }
  }

  async handleCommand(userId: string, rawCommand: string): Promise<ConversationResponse> {
    const [command] = rawCommand.toLowerCase().split(/\s+/, 1);
    if (command === "/start") return this.startOnboarding(userId);
    if (command === "/cancel") {
      await this.ensureState(userId);
      await prisma.conversationState.update({
        where: { userId },
        data: { stage: ConversationStage.IDLE, data: toJson({}), planRevisionCount: 0, pausedAt: null },
      });
      return textResponse("Onboarding cancelled. Your saved profile and plans are untouched. Send /start whenever you want to begin again.");
    }
    if (command === "/help") {
      return textResponse("Commands: /start, /cancel, /done, /task, /plan, /progress, /pause, /resume, /transcript, /help. Paste 3–5 job posts during intake, then send /done.");
    }
    if (command === "/done") return this.finishJobPosts(userId);
    if (command === "/task") return this.currentTask(userId);
    if (command === "/plan") return this.currentPlan(userId);
    if (command === "/progress") return this.progress(userId);
    if (command === "/pause") return this.pause(userId);
    if (command === "/resume") return this.resume(userId);
    if (command === "/transcript") return this.transcriptUrl(userId);
    return textResponse("I don’t recognize that command. /help shows what’s available.");
  }

  private async ensureState(userId: string): Promise<ConversationState> {
    return prisma.conversationState.upsert({
      where: { userId },
      create: { userId, data: toJson({}) },
      update: {},
    });
  }

  private async advance(userId: string, stage: ConversationStage, data: ConversationData, question: string): Promise<ConversationResponse> {
    await prisma.conversationState.update({ where: { userId }, data: { stage, data: toJson(data) } });
    return textResponse(question);
  }

  private async confirmProfile(userId: string, data: ConversationData): Promise<ConversationResponse> {
    if (!data.goal || !data.targetRole || !data.background) {
      await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.ONBOARDING_GOAL, data: toJson({}) } });
      return textResponse("I lost part of the intake, so let’s restart cleanly. What career destination are we working toward?");
    }

    const skills = data.selfAssessedSkills ?? [];
    await prisma.jobPost.deleteMany({ where: { userId } });
    await prisma.learnerProfile.upsert({
      where: { userId },
      create: {
        userId,
        goal: data.goal,
        targetRole: data.targetRole,
        background: data.background,
        constraints: data.constraints,
        hoursPerWeek: data.constraints ? parseHoursPerWeek(data.constraints) : null,
        selfAssessedSkills: skills,
      },
      update: {
        goal: data.goal,
        targetRole: data.targetRole,
        background: data.background,
        constraints: data.constraints,
        hoursPerWeek: data.constraints ? parseHoursPerWeek(data.constraints) : null,
        selfAssessedSkills: skills,
      },
    });
    await prisma.conversationState.update({
      where: { userId },
      data: { stage: ConversationStage.JOBPOSTS_COLLECTING, data: toJson(data) },
    });
    await this.memory.remember(profileFacts(data));
    return textResponse("Profile saved. Paste 3–5 real job posts (full text is best; a URL is fetched best-effort). Send /done when you have them all.");
  }

  private async collectJobPost(userId: string, data: ConversationData, input: string): Promise<ConversationResponse> {
    const count = await prisma.jobPost.count({ where: { userId } });
    if (count >= MAX_JOB_POSTS) return textResponse(`You have ${MAX_JOB_POSTS} job posts. Send /done and I’ll analyze them.`);

    const post = await captureJobPost(input);
    if (!post) return textResponse("I couldn’t retrieve useful text from that URL. Paste the job description text instead so I can cite it accurately.");
    await prisma.jobPost.create({ data: { userId, url: post.url, rawText: post.rawText, parsedSkills: [] } });
    const nextCount = count + 1;
    const next = nextCount >= MIN_JOB_POSTS
      ? `That’s ${nextCount} job posts. Add up to ${MAX_JOB_POSTS}, or send /done when this sample is representative.`
      : `Got it. That’s ${nextCount} of ${MIN_JOB_POSTS} minimum. Paste another job post.`;
    return textResponse(next);
  }

  private async finishJobPosts(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId);
    if (state.stage !== ConversationStage.JOBPOSTS_COLLECTING) return textResponse("/done is for the job-post step. /help shows the available commands.");
    const jobPosts = await prisma.jobPost.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (jobPosts.length < MIN_JOB_POSTS) return textResponse(`I need ${MIN_JOB_POSTS - jobPosts.length} more job post${MIN_JOB_POSTS - jobPosts.length === 1 ? "" : "s"} before I can make an evidence-backed analysis.`);

    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    if (!profile) return textResponse("Your profile is missing. Send /start and we’ll rebuild it before analyzing posts.");
    const data = asData(state.data);
    await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.GAPANALYSIS_RUNNING } });

    let gaps: GapAnalysis;
    try {
      gaps = await this.agentRunner("gap-analysis", "prompts/gap-analysis.md", {
        profile: agentProfile(profile, data),
        jobPosts: jobPosts.map((post, index) => ({ index, text: post.rawText })),
        memoryQuery: `${profile.targetRole} skills and learner goal ${profile.goal}`,
      }, gapAnalysisSchema);
    } catch {
      await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.JOBPOSTS_COLLECTING } });
      return textResponse("I couldn’t complete the gap analysis just now. Your profile and posts are saved; send /done to retry when the mentor runner is ready.");
    }

    return this.proposePlan(userId, profile, { ...data, gaps });
  }

  private async proposePlan(userId: string, profile: LearnerProfile, data: ConversationData, requestedChange?: string, revisionCount = 0): Promise<ConversationResponse> {
    if (!data.gaps) return textResponse("I need the gap analysis before proposing a plan. Send /done to retry it.");
    try {
      const plan = await this.agentRunner("plan", "prompts/plan.md", {
        profile: agentProfile(profile, data),
        gaps: data.gaps,
        ...(requestedChange ? { requestedChange } : {}),
        memoryQuery: `${profile.targetRole} plan aligned to ${profile.goal}`,
      }, planSchema);
      const next = { ...data, proposedPlan: plan };
      await prisma.conversationState.update({
        where: { userId },
        data: { stage: ConversationStage.PLAN_PROPOSED, data: toJson(next), planRevisionCount: revisionCount },
      });
      return textResponse(renderGaps(data.gaps), renderPlan(plan));
    } catch {
      await prisma.conversationState.update({ where: { userId }, data: { stage: ConversationStage.PLAN_PROPOSED, data: toJson(data), planRevisionCount: revisionCount } });
      return textResponse("I couldn’t turn the gaps into a plan just now. Nothing was lost. Reply with your requested change (or ‘retry’) and I’ll try again.");
    }
  }

  private async handlePlanReply(userId: string, data: ConversationData, input: string, revisionCount: number): Promise<ConversationResponse> {
    if (input.toLowerCase() === "confirm") return this.persistPlan(userId, data);
    if (revisionCount >= 1) return textResponse("We’ve used the one revision loop. Reply confirm to activate this plan, or /cancel to start the intake again.");
    const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
    if (!profile) return textResponse("Your saved profile is missing. Send /start and we’ll rebuild it.");
    return this.proposePlan(userId, profile, data, input, revisionCount + 1);
  }

  private async persistPlan(userId: string, data: ConversationData): Promise<ConversationResponse> {
    const proposedPlan = data.proposedPlan;
    if (!proposedPlan) return textResponse("The proposed plan is missing. Send /done to run the analysis again.");

    const firstTask = await prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({
        where: { userId, status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE, PlanStatus.PAUSED] } },
        data: { status: PlanStatus.COMPLETED },
      });
      const plan = await tx.plan.create({
        data: { userId, title: proposedPlan.title, summary: proposedPlan.summary, status: PlanStatus.ACTIVE },
      });
      let activeTask: Task | null = null;
      for (const [milestoneIndex, milestone] of proposedPlan.milestones.entries()) {
        const createdMilestone = await tx.milestone.create({
          data: {
            planId: plan.id,
            idx: milestoneIndex,
            title: milestone.title,
            description: milestone.description,
            deliverableSpec: milestone.deliverableSpec,
            rubric: milestone.rubric,
            status: milestoneIndex === 0 ? MilestoneStatus.ACTIVE : MilestoneStatus.LOCKED,
          },
        });
        for (const [taskIndex, task] of milestone.tasks.entries()) {
          const isFirstTask = milestoneIndex === 0 && taskIndex === 0;
          const createdTask = await tx.task.create({
            data: {
              milestoneId: createdMilestone.id,
              idx: taskIndex,
              title: task.title,
              brief: task.brief,
              deliverableSpec: task.deliverableSpec,
              whyItMatters: task.whyItMatters,
              status: isFirstTask ? TaskStatus.ACTIVE : TaskStatus.SCHEDULED,
              assignedAt: isFirstTask ? new Date() : null,
            },
          });
          if (isFirstTask) activeTask = createdTask;
        }
      }
      if (!activeTask) throw new Error("A proposed plan did not contain a first task.");
      await tx.conversationState.update({
        where: { userId },
        data: { stage: ConversationStage.PLAN_ACTIVE, data: toJson({ ...data, planId: plan.id }), pausedAt: null },
      });
      return activeTask;
    });

    return textResponse("Plan confirmed. Your first task is active now—no waiting for tomorrow morning.", renderTaskCard(firstTask));
  }

  private async currentTask(userId: string): Promise<ConversationResponse> {
    const task = await prisma.task.findFirst({
      where: { status: TaskStatus.ACTIVE, milestone: { plan: { userId } } },
      orderBy: { assignedAt: "asc" },
    });
    return task ? textResponse(renderTaskCard(task)) : textResponse("No active task right now. Finish onboarding with /start, or check /plan.");
  }

  private async currentPlan(userId: string): Promise<ConversationResponse> {
    const plan = await prisma.plan.findFirst({
      where: { userId, status: { in: [PlanStatus.ACTIVE, PlanStatus.PAUSED] } },
      include: { milestones: { include: { tasks: { orderBy: { idx: "asc" } } }, orderBy: { idx: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    if (!plan) return textResponse("No active plan yet. Send /start to begin the intake.");
    const body = [
      plan.title,
      plan.summary,
      "",
      ...plan.milestones.map((milestone, index) => `${index + 1}. ${milestone.title} — ${milestone.tasks.map((task) => `${task.status === TaskStatus.ACTIVE ? "→ " : ""}${task.title}`).join(" · ")}`),
    ].join("\n");
    return textResponse(body);
  }

  private async progress(userId: string): Promise<ConversationResponse> {
    const tasks = await prisma.task.findMany({ where: { milestone: { plan: { userId, status: { in: [PlanStatus.ACTIVE, PlanStatus.PAUSED] } } } } });
    if (tasks.length === 0) return textResponse("No plan progress to show yet. Send /start to begin.");
    const complete = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
    const active = tasks.find((task) => task.status === TaskStatus.ACTIVE);
    const scheduled = tasks.filter((task) => task.status === TaskStatus.SCHEDULED).length;
    return textResponse(`Progress: ${complete}/${tasks.length} tasks complete. ${active ? `Current task: ${active.title}.` : "No task is active."} ${scheduled} task${scheduled === 1 ? "" : "s"} scheduled after that.`);
  }

  private async pause(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId);
    if (state.stage !== ConversationStage.PLAN_ACTIVE) return textResponse("There is no active plan to pause yet.");
    await prisma.$transaction([
      prisma.conversationState.update({ where: { userId }, data: { pausedAt: new Date() } }),
      prisma.plan.updateMany({ where: { userId, status: PlanStatus.ACTIVE }, data: { status: PlanStatus.PAUSED } }),
    ]);
    return textResponse("Paused. No morning task or evening nudge will be sent until you use /resume. Your active task will be waiting without penalty.");
  }

  private async resume(userId: string): Promise<ConversationResponse> {
    const state = await this.ensureState(userId);
    if (state.stage !== ConversationStage.PLAN_ACTIVE || !state.pausedAt) return textResponse("You are not paused. Use /task when you’re ready for the next rep.");
    await prisma.$transaction([
      prisma.conversationState.update({ where: { userId }, data: { pausedAt: null } }),
      prisma.plan.updateMany({ where: { userId, status: PlanStatus.PAUSED }, data: { status: PlanStatus.ACTIVE } }),
    ]);
    return textResponse("Welcome back. Your plan is active again. Use /task whenever you’re ready; the next scheduled delivery will follow the normal morning rhythm.");
  }

  private async transcriptUrl(userId: string): Promise<ConversationResponse> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { slug: true } });
    if (!user) return textResponse("I couldn’t find your public transcript yet.");
    const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return textResponse(`${baseUrl}/t/${user.slug}`);
  }
}

export async function activeTaskForUser(userId: string) {
  return prisma.task.findFirst({
    where: { status: TaskStatus.ACTIVE, milestone: { plan: { userId } } },
    orderBy: { assignedAt: "asc" },
  });
}

export async function activateNextScheduledTask(userId: string): Promise<Task | null> {
  return prisma.$transaction(async (tx) => {
    const active = await tx.task.findFirst({ where: { status: TaskStatus.ACTIVE, milestone: { plan: { userId } } } });
    if (active) return null;
    const next = await tx.task.findFirst({
      where: { status: TaskStatus.SCHEDULED, milestone: { plan: { userId, status: PlanStatus.ACTIVE } } },
      orderBy: [{ milestone: { idx: "asc" } }, { idx: "asc" }],
    });
    if (!next) return null;
    return tx.task.update({ where: { id: next.id }, data: { status: TaskStatus.ACTIVE, assignedAt: new Date() } });
  });
}

export async function scheduledUsers() {
  return prisma.user.findMany({
    where: { conversationState: { is: { stage: ConversationStage.PLAN_ACTIVE, pausedAt: null } } },
    select: { id: true, telegramId: true },
  });
}

export async function stalledUsersSince(startOfDay: Date) {
  const users = await scheduledUsers();
  const stalled: Array<{ id: string; telegramId: string; task: Task }> = [];
  for (const user of users) {
    if (!user.telegramId) continue;
    const task = await activeTaskForUser(user.id);
    if (!task) continue;
    const activity = await prisma.attempt.count({ where: { userId: user.id, taskId: task.id, createdAt: { gte: startOfDay } } });
    if (activity === 0) stalled.push({ id: user.id, telegramId: user.telegramId, task });
  }
  return stalled;
}