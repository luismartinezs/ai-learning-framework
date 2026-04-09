## Step-by-Step Claude Code Instructions

---

### STEP 1: Codebase Refactor

```
Refactor the current repository to adopt a new folder structure.
Do not change any logic — this is a structural refactor only.

TARGET STRUCTURE:
```
worldclass-ai-pipeline/
├── AGENT_CONTEXT.md
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── domains/
│   └── code-debugging/
│       ├── kb/
│       │   ├── 01_axioms.md
│       │   ├── 02_failure_library.md
│       │   ├── 03_antipatterns_and_exemplars.md
│       │   ├── 04_structural_layer.md
│       │   └── 07_learned_patterns.md  (if exists)
│       ├── problems/
│       │   └── (move problems definitions here — create index.ts
│       │        that exports PROBLEMS from src/problems.ts)
│       └── results/
│           └── (move any existing results/ or traces/ content here)
├── src/
│   ├── shared/
│   │   ├── client.ts       (move from src/client.ts, no logic changes)
│   │   ├── types.ts        (move from src/types.ts, no logic changes)
│   │   └── judge.ts        (extract judge-related code from src/verifier.ts)
│   └── code-debugging/
│       ├── activator.ts    (move from src/activator.ts)
│       ├── pipeline.ts     (move from src/pipeline.ts)
│       ├── verifier.ts     (move from src/verifier.ts, minus judge code)
│       └── run.ts          (move from src/run.ts)
├── traces/                 (keep as-is, already exists)
└── results/                (keep as-is, already exists)
```

INSTRUCTIONS:
1. Create all new directories
2. Move each file to its new location
3. Update all import paths to reflect new locations
4. Verify kb loading in activator.ts still points to the correct kb path
   (now at domains/code-debugging/kb/)
5. Verify run.ts entry point still works end-to-end
6. Do not change any function signatures, logic, or exported names
7. After moving, run a quick import check — confirm no broken imports remain
8. Update AGENT_CONTEXT.md to reflect the new folder structure

When done, print the full new folder tree so I can verify.
```

---

### STEP 2: Landing Page Example Retrieval

Paste this into Claude Code after Step 1 is confirmed complete:

```
Use the Firecrawl MCP to retrieve world-class landing page examples.
Goal: collect 6-8 real landing pages selected by evidence of conversion
performance, not aesthetic judgment.

SOURCES TO CRAWL (in priority order):
1. https://conversion-rate-experts.com/case-studies/
2. https://supafast.com/case-studies/

SELECTION CRITERIA — a page qualifies if:
- A documented conversion improvement is reported (any metric, any number)
- Copy/messaging was a variable that changed (not just color/layout tests)
- The final page or a clear description of it is available in the case study
- Product variety: aim for a mix — SaaS, consumer app, B2B service, e-commerce

TARGET: exactly 6 qualifying examples. If a source does not yield enough,
proceed to the next source.

PROCESS:
1. Crawl the case studies index page of each source
2. For each case study listed, crawl the individual case study page
3. Evaluate each against the selection criteria
4. For qualifying case studies, extract the structured data below
5. If the final landing page URL is mentioned and accessible, crawl it too
   to extract the actual current copy

FOR EACH QUALIFYING EXAMPLE, extract:
- source_url: the case study URL you crawled
- landing_url: the actual product landing page URL (if available)
- product_name: name of the product/company
- product_category: one of [saas, consumer_app, b2b_service, ecommerce, other]
- product_description: what the product does, in plain language (2-4 sentences)
- target_audience: who the product is for (be specific)
- awareness_level: cold / warm / hot
  (cold = visitor doesn't know the product exists,
   warm = visitor has heard of the problem,
   hot = visitor is actively looking for a solution)
- documented_result: the reported conversion improvement, verbatim from the
  case study (e.g. "increased signups by 52%")
- copy_sections: object with the following fields, each containing the actual
  copy text from the final/winning page:
    - headline: main hero headline
    - subheadline: supporting line below headline (if present)
    - hero_body: body copy in the hero section (if present)
    - primary_cta: the main call-to-action button text
    - cta_context: any copy immediately surrounding the CTA
    - key_benefits: array of benefit statements or feature copy blocks
    - social_proof: testimonials, logos, stats (if present)
    - secondary_sections: any other notable copy sections

OUTPUT:
- Create folder: domains/landing-pages/examples/
- Save one markdown file per example: domains/landing-pages/examples/
  {product_name_slug}.md
- Format each file as follows:

---
source_url:
landing_url:
product_name:
product_category:
product_description:
target_audience:
awareness_level:
documented_result:
---

## Copy Sections

### Headline
[text]

### Subheadline
[text]

### Hero Body
[text]

### Primary CTA
[text]

### CTA Context
[text]

### Key Benefits
[text]

### Social Proof
[text]

### Secondary Sections
[text]

---

After saving all files, print a summary table:
| # | Product | Category | Result | Awareness | Source |
showing all 6 examples so I can verify before proceeding.

If fewer than 6 qualifying examples are found across all sources,
report how many were found, which criteria eliminated candidates,
and ask before proceeding.
```

---

### STEP 3: Extract Product Briefs

Paste this after Step 2 is confirmed:

```
From the landing page examples collected in domains/landing-pages/examples/,
extract raw product briefs. These are the inputs to the generation pipeline —
what you would hand a copywriter on day one, containing zero copy from the
reference pages.

For each file in domains/landing-pages/examples/:

1. Read the file
2. Create a corresponding brief file in domains/landing-pages/problems/
   named {product_name_slug}_brief.md

Each brief file must contain ONLY:
- Product name
- Product description (what it does, how it works)
- Target audience (who it is for, their context)
- Awareness level (cold/warm/hot) with a one-sentence explanation of
  what the visitor knows when they arrive
- Primary problem solved (the pain point, not the feature)
- Key mechanism (how the product solves it — the "how", not the "what")
- Any hard constraints (pricing model, geographic limitations, etc.
  that would affect copy — extract from case study if mentioned)

The brief must contain NO copy from the reference page — no headlines,
no CTAs, no benefit statements, no slogans. If you find yourself
writing something that sounds like marketing copy, stop and rephrase
it as a neutral product description.

Format each brief as:

---
product_name:
product_category:
awareness_level:
---

## Product Description
[neutral description of what the product is and does]

## Target Audience
[specific description of who uses this and in what context]

## Primary Problem Solved
[the pain, frustration, or desire the product addresses]

## Key Mechanism
[how it solves it — the specific approach that differentiates it]

## Constraints
[anything that limits the copy — pricing, geography, platform, etc.]

---

After creating all brief files, print each brief in full so I can
verify that no copy from the reference pages has leaked into the briefs.
This verification step is important — do not skip it.
```

---

### STEP 4: Build the Landing Page Judge

Paste this after Step 3 is verified:

```
Build a landing page copy judge in src/landing-pages/judge.ts

This judge evaluates generated landing copy against five dimensions.
It does NOT score similarity to the reference copy — it scores quality
independently, using the reference only for calibration.

JUDGE SYSTEM PROMPT to use (encode this exactly in the file):

"""
You are an expert evaluator of landing page copy effectiveness.
You evaluate copy on five dimensions. For each dimension, you give a
score from 0-10 and a one-sentence reasoning.

You have been given a reference example of world-class copy for a
similar product. Use it ONLY to calibrate your sense of what excellent
looks like in this product category. Do not score the generated copy
on similarity to the reference — score it on its own merits.

DIMENSIONS:

1. visitor_emotional_accuracy (0-10)
Does the copy address the actual fear, frustration, or desire the target
visitor arrives with? Or does it address a generic/assumed version of it?
10 = names the specific emotion with precision
0 = generic, could apply to any product in any category

2. specificity (0-10)
Is the copy concrete and particular to this product, or vague and
interchangeable?
10 = copy could not be used for any other product without significant rewriting
0 = copy could be pasted onto a competitor's page unchanged

3. mechanism_clarity (0-10)
Does the visitor understand HOW the product solves the problem, not just
that it does?
10 = the specific mechanism is clear from the copy alone
0 = the copy makes a promise but gives no indication of how it's kept

4. cta_awareness_match (0-10)
Does the call to action ask for a commitment level that matches what the
page has earned from the visitor?
10 = CTA matches the visitor's readiness perfectly given the page content
0 = CTA asks for more commitment than the page has justified

5. interchangeability (0-10, INVERTED — higher is better)
Could this copy be lifted and used for a competitor's product with minimal
changes? This score is inverted: 10 means NOT interchangeable (good),
0 means fully interchangeable (bad).
10 = deeply specific to this product, impossible to reuse
0 = entirely generic, usable for any competitor

Respond ONLY in valid JSON with no markdown fences:
{
  "visitor_emotional_accuracy": { "score": 0-10, "reasoning": "..." },
  "specificity": { "score": 0-10, "reasoning": "..." },
  "mechanism_clarity": { "score": 0-10, "reasoning": "..." },
  "cta_awareness_match": { "score": 0-10, "reasoning": "..." },
  "interchangeability": { "score": 0-10, "reasoning": "..." },
  "overall_score": <average of all five, rounded to 1 decimal>,
  "verdict": "<WORLD_CLASS|COMPETENT|GENERIC>",
  "key_weakness": "<the single most important thing holding this copy back>",
  "key_strength": "<the single best thing this copy does>"
}

Verdict thresholds:
WORLD_CLASS: overall_score >= 8.0
COMPETENT: overall_score >= 6.0
GENERIC: overall_score < 6.0
"""

TYPES to add to src/shared/types.ts:

interface LandingCopySection {
  headline: string
  subheadline?: string
  hero_body?: string
  primary_cta: string
  cta_context?: string
  key_benefits: string[]
  social_proof?: string
  secondary_sections?: string[]
}

interface LandingJudgeScore {
  visitor_emotional_accuracy: { score: number; reasoning: string }
  specificity: { score: number; reasoning: string }
  mechanism_clarity: { score: number; reasoning: string }
  cta_awareness_match: { score: number; reasoning: string }
  interchangeability: { score: number; reasoning: string }
  overall_score: number
  verdict: "WORLD_CLASS" | "COMPETENT" | "GENERIC"
  key_weakness: string
  key_strength: string
}

interface LandingEvalResult {
  product_name: string
  config: string
  model: string
  timestamp: string
  generated_copy: string
  judge_score: LandingJudgeScore | null
  judge_parse_error?: string
}

FUNCTION to implement in src/landing-pages/judge.ts:

judgeLandingCopy(
  brief: string,           // the product brief (input)
  generatedCopy: string,   // the copy to evaluate
  referenceCopy: string,   // world-class reference for calibration only
  model: string            // which model to use for judging
): Promise<LandingJudgeScore | null>

Use the shared call() function from src/shared/client.ts.
Parse JSON response, strip markdown fences if present.
Return null on parse failure, log the raw response.
```

---

### STEP 5: Build the Generation Pipeline

Paste this after Step 4 is complete:

```
Build the landing page copy generation pipeline in
src/landing-pages/pipeline.ts

Four configurations to implement, matching the ablation matrix from
the code-debugging domain:

CONFIG 1: "bare"
System prompt: "You are a copywriter. Write landing page copy."
User message: the product brief verbatim
No additional framing, no examples, no frameworks.

CONFIG 2: "question_first"
System prompt: "You are a copywriter."
User message:
"""
Before writing any copy, answer these three questions about the visitor:
1. What is the single most acute fear or frustration this visitor has
   in the specific moment they would need this product?
2. What does the visitor need to believe is true about this product
   before they would take action?
3. What would make this visitor distrust this product or dismiss it?

Then write the landing page copy.

Product brief:
{brief}
"""

CONFIG 3: "kb_scaffold"
System prompt containing a knowledge base of landing page principles.
Build this KB as a separate file: domains/landing-pages/kb/01_principles.md
Content to include:
- The visitor awareness spectrum (Eugene Schwartz: unaware / problem aware /
  solution aware / product aware / most aware) and how copy changes at each level
- The job-to-be-done framing: copy sells the outcome, not the feature
- The specificity principle: vague claims reduce trust, specific claims build it
- The mechanism principle: HOW you solve it is more believable than THAT you solve it
- The CTA commitment ladder: ask for the smallest commitment the page has earned
- Anti-patterns: "ready to get started?", "learn more", "see what we can do",
  "powerful and flexible", "all-in-one solution"

System prompt: load and inject the KB content
User message: the product brief

CONFIG 4: "few_shot"
System prompt: "You are an expert copywriter."
User message:
"""
Here are {n} examples of world-class landing page copy. Study them,
then write copy for the product described in the brief below at the
same level of quality.

[EXAMPLE 1]
Product: {product_name}
Brief: {brief}
Copy:
{reference_copy}

[EXAMPLE 2]
...

[BRIEF TO WRITE COPY FOR]
{brief}
"""
Use 2 examples from the example set (not the same product as the brief).
Select examples from a different product category than the target brief
to avoid the model copying structure too literally.

FUNCTION SIGNATURE:
generateLandingCopy(
  brief: string,
  config: "bare" | "question_first" | "kb_scaffold" | "few_shot",
  examples: Array<{ product_name: string; brief: string; copy: string }>,
  model: string
): Promise<string>

ADDITIONAL REQUIREMENT:
The generated copy must follow a consistent structure so the judge
can parse it. Append this to every config's user message:

"""
Format your output as:

## Headline
[text]

## Subheadline
[text]

## Hero Body
[text]

## Primary CTA
[text]

## Key Benefits
[3-5 benefit statements]

## Social Proof Hook
[one line — a testimonial format, stat, or trust signal]
"""
```

---

### STEP 6: Build the Run Script and AGENT_CONTEXT Update

Paste this last:

```
Build the landing page experiment runner and update project documentation.

1. Create src/landing-pages/run.ts

This script runs all four configs against all products in
domains/landing-pages/problems/, scores each output, and saves results.

CLI interface:
  bun src/landing-pages/run.ts                    # all products, all configs
  bun src/landing-pages/run.ts --product stripe   # one product, all configs
  bun src/landing-pages/run.ts --config bare      # all products, one config

For each run:
- Load the product brief from domains/landing-pages/problems/
- Load the corresponding reference copy from domains/landing-pages/examples/
- Generate copy using the specified config
- Score using the judge
- Save to domains/landing-pages/results/{product}_{config}_{timestamp}.json

After all runs complete, print a summary table:
| Product | bare | question_first | kb_scaffold | few_shot |
showing overall_score and verdict for each cell.

Save the summary table to domains/landing-pages/results/summary.md

2. Update AGENT_CONTEXT.md with a new section:

## Domain 2: Landing Pages

### Status
[current status — examples collected, briefs extracted, pipeline built]

### Research Question
Can context engineering reliably produce world-class landing copy from
a raw product brief? If yes, which intervention produces the most
consistent improvement over the bare model?

### Experiment Design
[four configs, judge dimensions, reference calibration approach]

### Key Files
- domains/landing-pages/examples/   world-class reference pages
- domains/landing-pages/problems/   raw product briefs (no copy)
- domains/landing-pages/kb/         copy principles (for kb_scaffold config)
- domains/landing-pages/results/    experiment outputs
- src/landing-pages/pipeline.ts     generation pipeline
- src/landing-pages/judge.ts        scoring
- src/landing-pages/run.ts          experiment runner

### Hypothesis
Based on code-debugging findings: few_shot config will outperform
kb_scaffold. question_first will outperform bare. The model's native
capability is likely sufficient for common product types — interventions
will add value on niche or complex products where the model has weaker
priors.

3. Verify the full repo still works end to end:
- bun src/code-debugging/run.ts p001 --gen should still function
- bun src/landing-pages/run.ts should execute without errors

Print the final folder tree when complete.
```