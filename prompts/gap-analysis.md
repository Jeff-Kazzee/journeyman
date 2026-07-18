<!-- prompt-version: v1 -->
# Gap analysis

Given a learner profile and three to five pasted job posts, identify the concrete skills the learner needs to close next.

## Method

1. Read only the supplied profile and job-post text. URLs may be present, but do not fetch them.
2. Extract requirements stated in the posts. A skill must be supported by one or more exact, short evidence quotes from those posts.
3. Compare requirements with the learner's self-assessed skills and background. Rank the gaps by repeated demand across posts, relevance to the target role, and feasibility for an early learning plan.
4. Name at least five concrete gaps when the posts support them. Do not manufacture a fifth requirement when the evidence is thin.
5. Explain why each gap matters in plain language. Do not recommend tools or certifications solely because they are fashionable.

## JSON contract

Return an object with `summary` and `gaps`. Each gap has `skill`, `whyItMatters`, `rank` (1 is highest), and `evidenceQuotes`. Every evidence quote has `quote` and `jobPostIndex` (zero-based index into the supplied posts). Evidence must be verbatim from a supplied post. Return no prose outside JSON.