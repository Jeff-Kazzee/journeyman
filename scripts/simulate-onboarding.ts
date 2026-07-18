import assert from "node:assert/strict";
import { ConversationService, chunkTelegramMessage, recoverInterruptedConversations, type AgentRunner } from "../worker/src/conversation.ts";
import { prisma } from "../worker/src/prisma.ts";

const slug = "simulation-onboarding";
let failNextGap = true;
let failNextPlan = false;
const requestedPlanChanges: Array<string | undefined> = [];
const gaps = {
  summary: "The sample roles consistently ask for accessible product work, practical TypeScript, testing, collaboration, and evidence of shipping.",
  gaps: [
    { skill: "TypeScript", whyItMatters: "It appears in every sample role.", rank: 1, evidenceQuotes: [{ quote: "Strong TypeScript skills", jobPostIndex: 0 }] },
    { skill: "Accessible UI", whyItMatters: "The work must be usable by more people.", rank: 2, evidenceQuotes: [{ quote: "Build accessible interfaces", jobPostIndex: 1 }] },
    { skill: "Automated testing", whyItMatters: "The roles ask for reliable changes.", rank: 3, evidenceQuotes: [{ quote: "Write maintainable tests", jobPostIndex: 2 }] },
    { skill: "Product collaboration", whyItMatters: "The work is cross-functional.", rank: 4, evidenceQuotes: [{ quote: "Partner with design and product", jobPostIndex: 0 }] },
    { skill: "Shipping a portfolio artifact", whyItMatters: "The roles need proof, not only study.", rank: 5, evidenceQuotes: [{ quote: "Show work shipped to users", jobPostIndex: 1 }] },
  ],
};
const plan = {
  title: "Accessible front-end apprenticeship",
  summary: "Build and explain a small accessible product slice while practicing the evidence the target roles require.",
  milestones: [
    {
      title: "Ship an accessible task flow", description: "Create a focused user-facing task flow with keyboard and screen-reader support.", deliverableSpec: "A public repository with a deployed accessible task flow and a concise README.",
      rubric: [
        { criterion: "Keyboard path", description: "Every control is usable without a mouse." },
        { criterion: "Semantic structure", description: "Landmarks and labels describe the flow." },
      ],
      tasks: [
        { title: "Map the task flow", brief: "Sketch the smallest user path and its states.", deliverableSpec: "A short Markdown flow map committed to the repository.", whyItMatters: "Clear states make the later interface easier to build and defend." },
        { title: "Build the first accessible screen", brief: "Implement one semantic, keyboard-usable screen from the map.", deliverableSpec: "A committed screen with labels, focus order, and a manual keyboard note.", whyItMatters: "It turns accessibility from a claim into inspectable work." },
      ],
    },
    {
      title: "Verify and explain the work", description: "Add checks and a readable explanation of decisions.", deliverableSpec: "Tests plus a short decision log linked from the README.",
      rubric: [
        { criterion: "Regression coverage", description: "The key path has a repeatable check." },
        { criterion: "Decision evidence", description: "The README explains tradeoffs in the learner’s own words." },
      ],
      tasks: [
        { title: "Add a focused check", brief: "Choose one failure worth preventing and write a check for it.", deliverableSpec: "A passing test or documented manual verification step.", whyItMatters: "Reliable work is easier to extend and review." },
        { title: "Write the decision log", brief: "Explain one accessibility decision and one tradeoff.", deliverableSpec: "A concise README section with evidence links.", whyItMatters: "A reviewer can inspect your reasoning, not just the finished screen." },
      ],
    },
  ],
};
const stubRunner: AgentRunner = async (kind, _prompt, context, schema) => {
  if (kind === "gap-analysis") { if (failNextGap) { failNextGap = false; throw new Error("simulated Codex failure"); } return schema.parse(gaps); }
  if (kind === "plan") { requestedPlanChanges.push(typeof context.requestedChange === "string" ? context.requestedChange : undefined); if (failNextPlan) { failNextPlan = false; throw new Error("simulated plan failure"); } return schema.parse(plan); }
  if (kind === "hint") return schema.parse({ hint: "What evidence in the task flow tells you the keyboard path is actually reachable?" });
  throw new Error(`Unexpected simulated agent kind: ${kind}`);
};
const silentMemory = { remember: async (_facts: string[]) => undefined };
const has = (messages: string[], text: string) => messages.join("\n").includes(text);
const validPosts = [
  "Job title: TypeScript developer\nStrong TypeScript skills. Partner with design and product. Build reliable customer experiences with clear state handling, accessible semantic HTML, focused testing, and evidence of incremental work that a reviewer can inspect in a public repository.",
  "Job title: Accessibility engineer\nBuild accessible interfaces. Show work shipped to users. Collaborate in an async team. Include semantic HTML, keyboard support, testing, and evidence of deliberate accessibility decisions.",
  "Job title: Front-end tester\nWrite maintainable tests. Use TypeScript to improve an existing product. Explain tradeoffs, collaborate with product partners, and document reliable verification evidence for every release.",
];

async function verifyBootRecovery(service: ConversationService) {
  const recoverySlug = `${slug}-recovery`;
  await prisma.user.deleteMany({ where: { slug: { startsWith: recoverySlug } } });
  const profile = { goal: "Become an accessible front-end developer.", targetRole: "Front-end developer", background: "Support and HTML experience.", constraints: "6 hours per week", selfAssessedSkills: ["HTML"] };
  const gapUser = await prisma.user.create({ data: { slug: `${recoverySlug}-gap`, profile: { create: profile }, jobPosts: { create: validPosts.map((rawText) => ({ rawText, parsedSkills: [] })) }, conversationState: { create: { stage: "GAPANALYSIS_RUNNING", data: profile } } } });
  const planUser = await prisma.user.create({ data: { slug: `${recoverySlug}-plan`, profile: { create: profile }, conversationState: { create: { stage: "PLAN_RUNNING", planRevisionCount: 1, data: { ...profile, gaps, pendingChange: "Make the revision more testing-focused." } } } } });
  try {
    assert.equal(await recoverInterruptedConversations([gapUser.id, planUser.id]), 2, "boot sweep must recover both running phases");
    const [recoveredGap, recoveredPlan] = await Promise.all([prisma.conversationState.findUniqueOrThrow({ where: { userId: gapUser.id } }), prisma.conversationState.findUniqueOrThrow({ where: { userId: planUser.id } })]);
    assert.equal(recoveredGap.stage, "JOBPOSTS_COLLECTING");
    assert.equal((recoveredGap.data as { lastFailedRun?: string }).lastFailedRun, "gap-analysis");
    assert.equal(recoveredPlan.stage, "PLAN_PROPOSED");
    assert.equal((recoveredPlan.data as { lastFailedRun?: string }).lastFailedRun, "plan");
    assert(has((await service.handleCommand(gapUser.id, "/retry")).messages, "Your proposed plan"), "boot-recovered gap analysis must retry through plan generation");
    assert(has((await service.handleCommand(planUser.id, "/retry")).messages, "Your proposed plan"), "boot-recovered plan generation must retry");
    assert.equal(requestedPlanChanges.at(-1), "Make the revision more testing-focused.", "boot-recovered plan retry must retain its pending change");
  } finally {
    await prisma.user.deleteMany({ where: { slug: { startsWith: recoverySlug } } });
  }
}

async function main() {
  assert(chunkTelegramMessage("x".repeat(8001)).every((chunk) => chunk.length <= 4000), "outbound messages must be Telegram-safe chunks");
  await prisma.user.deleteMany({ where: { slug } });
  const user = await prisma.user.create({ data: { slug, telegramId: "simulation-telegram" } });
  const service = new ConversationService(stubRunner, silentMemory);
  try {
    assert(has((await service.startOnboarding(user.id)).messages, "career destination"));
    await service.handleMessage(user.id, "Become a front-end developer who can build accessible products.");
    await service.handleMessage(user.id, "Junior front-end developer");
    await service.handleMessage(user.id, "I have customer-support experience and have completed a few HTML tutorials.");
    await service.handleMessage(user.id, "6 hours per week, evenings only, no weekend deadlines.");
    assert(has((await service.handleMessage(user.id, "HTML, CSS, communication")).messages, "Reply confirm"));
    assert(has((await service.handleMessage(user.id, "confirm")).messages, "Profile saved"));
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id } });
    assert(profile, "onboarding must persist a LearnerProfile");
    assert.deepEqual(profile.selfAssessedSkills, ["HTML", "CSS", "communication"]);

    const batch = [
      "Job title: TypeScript developer\nStrong TypeScript skills. Partner with design and product. Build reliable customer experiences.",
      "Job title: Accessibility engineer\nBuild accessible interfaces. Show work shipped to users. Collaborate in an async team.",
      "Job title: Front-end tester\nWrite maintainable tests. Use TypeScript to improve an existing product. Explain tradeoffs.",
    ].join("\n---\n");
    const pending = await service.handleMessage(user.id, batch);
    assert(has(pending.messages, "looks like 3 posts"), "multi-post message must request confirmation");
    assert.equal(await prisma.jobPost.count({ where: { userId: user.id } }), 0, "unconfirmed batch must not persist");
    const stored = await service.handleMessage(user.id, "yes");
    assert(has(stored.messages, "Saved 3/5"), "confirmed batch must persist all posts");
    assert.equal(await prisma.jobPost.count({ where: { userId: user.id } }), 3, "confirmed batch must persist N rows");

    const failed = await service.handleMessage(user.id, "that was all of them");
    assert(has(failed.messages, "Send /retry"), "agent failure must be friendly and retryable");
    assert.equal(await prisma.jobPost.count({ where: { userId: user.id } }), 3, "agent failure must preserve posts");

    const savedPosts = await prisma.jobPost.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    await prisma.jobPost.deleteMany({ where: { id: { in: savedPosts.map((post) => post.id) } } });
    await prisma.jobPost.createMany({ data: [
      { userId: user.id, rawText: validPosts[0], parsedSkills: [] },
      { userId: user.id, rawText: "that was all 5", parsedSkills: [] },
      { userId: user.id, rawText: "noooo", parsedSkills: [] },
    ] });
    const hygiene = await service.handleCommand(user.id, "/retry");
    assert(has(hygiene.messages, "fresh set of at least 3"), "retry must return to collection when fewer than three valid posts remain");
    assert.equal(await prisma.jobPost.count({ where: { userId: user.id } }), 1, "retry must clear correction rows before analysis");

    await prisma.jobPost.createMany({ data: [
      { userId: user.id, rawText: validPosts[1], parsedSkills: [] },
      { userId: user.id, rawText: validPosts[2], parsedSkills: [] },
    ] });
    const proposal = await service.handleCommand(user.id, "/done");
    assert(has(proposal.messages, "Your gap analysis"), "fresh valid posts must run the gap analysis");
    assert(has(proposal.messages, "Your proposed plan"), "fresh valid posts must continue through plan generation");
    assert(has(proposal.messages, "Keyboard path: Every control is usable without a mouse."), "plan proposal must render rubric criterion and description lines");

    const revisionChange = "Make the revision more testing-focused.";
    failNextPlan = true;
    const failedRevision = await service.handleMessage(user.id, revisionChange);
    assert(has(failedRevision.messages, gaps.summary), "plan failure must still deliver the saved gaps");
    assert(has(failedRevision.messages, "Send /retry"), "failed revision must remain retryable");
    const failedRevisionState = await prisma.conversationState.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal((failedRevisionState.data as { pendingChange?: string }).pendingChange, revisionChange, "failed revision must retain the pending change");
    assert.equal(failedRevisionState.planRevisionCount, 1, "failed revision must retain its revision count");
    assert(has((await service.handleCommand(user.id, "/retry")).messages, "Your proposed plan"), "failed revision must retry plan generation");
    assert.equal(requestedPlanChanges.at(-1), revisionChange, "revision retry must pass the retained change to the agent");
    const retriedRevisionState = await prisma.conversationState.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal((retriedRevisionState.data as { pendingChange?: string }).pendingChange, undefined, "successful revision must clear the pending change");
    assert.equal(retriedRevisionState.planRevisionCount, 1, "successful revision retry must preserve its revision count");

    await verifyBootRecovery(service);

    const active = await service.handleMessage(user.id, "confirm");
    assert(has(active.messages, "first task is active now"));
    const persisted = await prisma.plan.findFirst({ where: { userId: user.id }, include: { milestones: { orderBy: { idx: "asc" }, include: { tasks: true } } } });
    assert(persisted, "confirmation must persist a plan");
    assert.deepEqual(persisted.milestones[0]?.rubric, plan.milestones[0].rubric, "milestone rubric must persist as an unchanged array");
    const tasks = persisted.milestones.flatMap((milestone) => milestone.tasks);
    assert.equal(tasks.filter((task) => task.status === "ACTIVE").length, 1);
    assert.equal(tasks.filter((task) => task.status === "SCHEDULED").length, tasks.length - 1);

    const cold = await service.handleMessage(user.id, "how do I build it?");
    assert(has(cold.messages, "Show me what you’ve tried"), "cold help must be refused structurally");
    const longCold = await service.handleMessage(user.id, "Can you please explain exactly how I should complete every part of this task for me?");
    assert(has(longCold.messages, "Show me what you’ve tried"), "long cold help must also be refused");
    const fake = await service.handleMessage(user.id, "idk");
    assert(has(fake.messages, "Show me what you’ve tried"), "fake attempt must be refused structurally");
    assert.equal(await prisma.attempt.count({ where: { userId: user.id } }), 0, "cold and fake asks must not create attempts");
    const realAttempt = "I tried mapping the states, but my button has no visible focus when I tab through the first screen.";
    const hint = await service.handleMessage(user.id, realAttempt);
    assert(has(hint.messages, "Level 1/5"), "genuine attempt must earn level one");
    assert(has(hint.messages, "button has no visible focus"), "hint response must quote the attempt");
    assert.equal(await prisma.attempt.count({ where: { userId: user.id } }), 1, "genuine attempt must persist");
    assert.equal(await prisma.hintEvent.count({ where: { userId: user.id, level: 1 } }), 1, "level-one hint must persist");

    const progress = await service.handleCommand(user.id, "/progress");
    assert(has(progress.messages, "Progress: 0/4 tasks complete"));
    console.log("simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.");
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
}

main().catch((error) => { console.error("simulate:onboarding failed", error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
