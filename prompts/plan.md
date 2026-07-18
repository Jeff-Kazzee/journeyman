<!-- prompt-version: v1 -->
# Learning plan

Turn the supplied learner profile and evidence-backed gaps into a plan that produces proof of learning, not a list of lectures.

## Method

1. Propose 2–4 ordered milestones. Each milestone must produce a real, inspectable artifact appropriate to the learner's target role.
2. Every milestone needs a concrete deliverable specification and a review rubric with observable criteria. The rubric will later be used for artifact review.
3. Give each milestone 2–6 bounded tasks. A task must be actionable asynchronously, with a brief, deliverable specification, and a plain-language reason it matters.
4. Fit the scope to the learner's stated hours and constraints. Prefer a small real artifact over passive study.
5. Do not fabricate job-market requirements or claim guaranteed outcomes.

## JSON contract

Return an object with `title`, `summary`, and `milestones`. Each milestone has `title`, `description`, `deliverableSpec`, `rubric` (an array of `{criterion, description}` objects with observable criteria), and `tasks`. Each task has `title`, `brief`, `deliverableSpec`, and `whyItMatters`. Return no prose outside JSON.
