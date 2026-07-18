import assert from "node:assert/strict";
import { ConversationService, chunkTelegramMessage, type AgentRunner } from "../worker/src/conversation.ts";
import { prisma } from "../worker/src/prisma.ts";

const simulationSlug = "simulation-onboarding";

const cannedGaps = {
  summary: "The sample roles consistently ask for accessible product work, practical TypeScript, testing, collaboration, and evidence of shipping.",
  gaps: [
    { skill: "TypeScript", whyItMatters: "It appears in every sample role.", rank: 1, evidenceQuotes: [{ quote: "Strong TypeScript skills", jobPostIndex: 0 }] },
    { skill: "Accessible UI", whyItMatters: "The work must be usable by more people.", rank: 2, evidenceQuotes: [{ quote: "Build accessible interfaces", jobPostIndex: 1 }] },
    { skill: "Automated testing", whyItMatters: "The roles ask for reliable changes.", rank: 3, evidenceQuotes: [{ quote: "Write maintainable tests", jobPostIndex: 2 }] },
    { skill: "Product collaboration", whyItMatters: "The work is cross-functional.", rank: 4, evidenceQuotes: [{ quote: "Partner with design and product", jobPostIndex: 0 }] },
    { skill: "Shipping a portfolio artifact", whyItMatters: "The roles need proof, not only study.", rank: 5, evidenceQuotes: [{ quote: "Show work shipped to users", jobPostIndex: 1 }] },
  ],
};

const cannedPlan = {
  title: "Accessible front-end apprenticeship",
  summary: "Build and explain a small accessible product slice while practicing the evidence the target roles require.",
  milestones: [
    {
      title: "Ship an accessible task flow",
      description: "Create a focused user-facing task flow with keyboard and screen-reader support.",
      deliverableSpec: "A public repository with a deployed accessible task flow and a concise README.",
      rubric: { "Keyboard path": "Every control is usable without a mouse.", "Semantic structure": "Landmarks and labels describe the flow." },
      tasks: [
        { title: "Map the task flow", brief: "Sketch the smallest user path and its states.", deliverableSpec: "A short Markdown flow map committed to the repository.", whyItMatters: "Clear states make the later interface easier to build and defend." },
        { title: "Build the first accessible screen", brief: "Implement one semantic, keyboard-usable screen from the map.", deliverableSpec: "A committed screen with labels, focus order, and a manual keyboard note.", whyItMatters: "It turns accessibility from a claim into inspectable work." },
      ],
    },
    {
      title: "Verify and explain the work",
      description: "Add checks and a readable explanation of decisions.",
      deliverableSpec: "Tests plus a short decision log linked from the README.",
      rubric: { "Regression coverage": "The key path has a repeatable check.", "Decision evidence": "The README explains tradeoffs in the learner’s own words." },
      tasks: [
        { title: "Add a focused check", brief: "Choose one failure worth preventing and write a check for it.", deliverableSpec: "A passing test or documented manual verification step.", whyItMatters: "Reliable work is easier to extend and review." },
        { title: "Write the decision log", brief: "Explain one accessibility decision and one tradeoff.", deliverableSpec: "A concise README section with evidence links.", whyItMatters: "A reviewer can inspect your reasoning, not just the finished screen." },
      ],
    },
  ],
};

const stubRunner: AgentRunner = async (kind, _promptFile, _context, schema) => {
  if (kind === "gap-analysis") return schema.parse(cannedGaps);
  if (kind === "plan") return schema.parse(cannedPlan);
  throw new Error(`Unexpected simulated agent kind: ${kind}`);
};

const silentMemory = { remember: async (_facts: string[]) => undefined };

function includes(messages: string[], text: string) {
  return messages.join("\n").includes(text);
}

async function main() {
  assert(chunkTelegramMessage("x".repeat(8_001)).every((chunk) => chunk.length <= 4_000), "outbound messages must be Telegram-safe chunks");
  await prisma.user.deleteMany({ where: { slug: simulationSlug } });
  const user = await prisma.user.create({ data: { slug: simulationSlug, telegramId: "simulation-telegram" } });
  const service = new ConversationService(stubRunner, silentMemory);

  try {
    assert(includes((await service.startOnboarding(user.id)).messages, "career destination"));
    await service.handleMessage(user.id, "Become a front-end developer who can build accessible products.");
    await service.handleMessage(user.id, "Junior front-end developer");
    await service.handleMessage(user.id, "I have customer-support experience and have completed a few HTML tutorials.");
    await service.handleMessage(user.id, "6 hours per week, evenings only, no weekend deadlines.");
    const confirmation = await service.handleMessage(user.id, "HTML, CSS, communication");
    assert(includes(confirmation.messages, "Reply confirm"));

    const profileSaved = await service.handleMessage(user.id, "confirm");
    assert(includes(profileSaved.messages, "Profile saved"));
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id } });
    assert(profile, "onboarding must persist a LearnerProfile");
    assert.deepEqual(profile.selfAssessedSkills, ["HTML", "CSS", "communication"]);

    await service.handleMessage(user.id, "Role one: Strong TypeScript skills. Partner with design and product. Build reliable customer experiences.");
    await service.handleMessage(user.id, "Role two: Build accessible interfaces. Show work shipped to users. Collaborate in an async team.");
    await service.handleMessage(user.id, "Role three: Write maintainable tests. Use TypeScript to improve an existing product. Explain tradeoffs.");
    const proposal = await service.handleMessage(user.id, "/done");
    assert(includes(proposal.messages, "Your gap analysis"), "gap analysis must render in chat");
    assert(includes(proposal.messages, "Your proposed plan"), "plan proposal must render in chat");

    const activated = await service.handleMessage(user.id, "confirm");
    assert(includes(activated.messages, "first task is active now"), "first task must be delivered immediately");
    assert(includes(activated.messages, "Today’s task"), "immediate delivery must include the task card");

    const plan = await prisma.plan.findFirst({
      where: { userId: user.id },
      include: { milestones: { include: { tasks: true } } },
    });
    assert(plan, "confirmation must persist a plan");
    const tasks = plan.milestones.flatMap((milestone) => milestone.tasks);
    assert.equal(tasks.filter((task) => task.status === "ACTIVE").length, 1, "exactly one first task must be active");
    assert.equal(tasks.filter((task) => task.status === "SCHEDULED").length, tasks.length - 1, "remaining tasks must be scheduled");

    const progress = await service.handleCommand(user.id, "/progress");
    assert(includes(progress.messages, "Progress: 0/4 tasks complete"), "progress must report persisted task state");
    console.log("simulate:onboarding passed — profile, gaps, plan, immediate first task, and progress verified.");
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
}

main()
  .catch((error) => { console.error("simulate:onboarding failed", error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });