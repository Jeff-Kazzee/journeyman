import { gapAnalysisSchema, planSchema } from "../worker/src/conversation.ts";
import { runAgent } from "../worker/src/codex.ts";
import { prisma } from "../worker/src/prisma.ts";

const profile = {
  goal: "Become a backend developer who builds production REST APIs, and land a junior backend role within six months.",
  targetRole: "Junior Backend Developer (Node.js / TypeScript)",
  background: "Five years in retail operations, a part-time coding bootcamp, two small Node and Express CRUD apps, basic SQL, and no professional software experience yet.",
  constraints: "About 10 hours per week, mostly evenings and weekends, with an uneven schedule as the primary caregiver for a young child.",
  hoursPerWeek: 10,
  selfAssessedSkills: ["JavaScript", "basic Node.js", "Express", "HTML", "CSS", "basic SQL", "Git"],
};

const gaps = gapAnalysisSchema.parse({
  summary: "The strongest next gaps are TypeScript, production REST API design, PostgreSQL, automated testing, and Docker. Collaboration, architecture, deployment, and observability follow those foundations.",
  gaps: [
    {
      rank: 1,
      skill: "TypeScript for Node.js backend development",
      whyItMatters: "The target roles use TypeScript, while the learner currently lists JavaScript.",
      evidenceQuotes: [{ quote: "You'll work in Node.js and TypeScript", jobPostIndex: 0 }],
    },
    {
      rank: 2,
      skill: "Production REST API design and implementation",
      whyItMatters: "The roles center on maintainable and reliable REST services.",
      evidenceQuotes: [{ quote: "build and maintain REST APIs for our SaaS platform", jobPostIndex: 0 }],
    },
    {
      rank: 3,
      skill: "PostgreSQL schema design, relational modeling, and querying",
      whyItMatters: "Basic SQL must grow into relationships, constraints, migrations, and non-trivial queries.",
      evidenceQuotes: [{ quote: "model relational data in PostgreSQL", jobPostIndex: 1 }],
    },
    {
      rank: 4,
      skill: "Automated unit and integration testing",
      whyItMatters: "Production readiness requires repeatable checks for logic, endpoints, data access, and errors.",
      evidenceQuotes: [{ quote: "You'll write unit and integration tests", jobPostIndex: 1 }],
    },
    {
      rank: 5,
      skill: "Docker containerization",
      whyItMatters: "The learner needs to package and run the API consistently with its runtime configuration.",
      evidenceQuotes: [{ quote: "containerize services with Docker", jobPostIndex: 2 }],
    },
    {
      rank: 6,
      skill: "GitHub pull-request and code-review workflows",
      whyItMatters: "The roles expect focused branches, review participation, and understandable incremental history.",
      evidenceQuotes: [{ quote: "Git and GitHub pull requests", jobPostIndex: 2 }],
    },
    {
      rank: 7,
      skill: "Clean architecture and maintainable backend code",
      whyItMatters: "The learner needs to separate HTTP, business, and data-access concerns and explain the tradeoffs.",
      evidenceQuotes: [{ quote: "We care about clean architecture and evidence of shipped, maintainable work.", jobPostIndex: 1 }],
    },
    {
      rank: 8,
      skill: "Cloud deployment and CI/CD fundamentals",
      whyItMatters: "After the core backend work, the learner should be able to test and deploy a containerized API.",
      evidenceQuotes: [{ quote: "deploy to the cloud", jobPostIndex: 2 }],
    },
    {
      rank: 9,
      skill: "Backend reliability and observability",
      whyItMatters: "Production services need enough logging and metrics to diagnose failures.",
      evidenceQuotes: [{ quote: "observability such as logging and metrics is a plus", jobPostIndex: 1 }],
    },
  ],
});

async function main() {
  const startedAt = performance.now();
  const plan = await runAgent(
    "plan",
    "prompts/plan.md",
    {
      profile,
      gaps,
      memoryQuery: `${profile.targetRole} plan aligned to ${profile.goal}`,
    },
    planSchema,
  );
  const elapsedSeconds = (performance.now() - startedAt) / 1000;

  console.log(`verify-plan-run title: ${plan.title}`);
  console.log(`verify-plan-run milestone count: ${plan.milestones.length}`);
  console.log(`verify-plan-run timing: ${elapsedSeconds.toFixed(1)}s`);
}

main()
  .catch((error) => {
    console.error("verify-plan-run failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
