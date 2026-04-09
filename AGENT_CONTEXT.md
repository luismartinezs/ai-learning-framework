# AGENT_CONTEXT.md
# World-Class AI Pipeline -- Full Project Reference

This document is the authoritative reference for any agent (human or AI) picking
up this project. It covers the vision, the reasoning behind every architectural
decision, the current state of the codebase, and the next steps in priority order.

Read this before touching anything.

---

## 1. The Core Idea

We are building a framework that produces **world-class quality output from AI**
in a specific domain. Not by making the model "smarter", but by designing the
environment, context, and agent topology that activates the model's best latent
capabilities.

The central insight: an LLM is a generalist that accepts context. The gap between
mediocre and excellent output is not primarily the model. It is:

1. **Latent space activation**: what system prompt, knowledge scaffold, and
   framing steers the model into the expert subspace for a given domain
2. **Verification loop**: a tight feedback cycle between output and ground truth
   that identifies failures and writes back into the knowledge base
3. **Agent topology**: multiple specialized agents that challenge each other,
   rather than a single agent trying to do everything

### What "world-class" means here

**Output that produces the desired outcome optimally using an optimal amount
of resources.** Better than the output of 99 comparable agents given the
same input, most of the time.

For code debugging/optimization specifically: correctly identifies the root
cause (not the symptom), proposes the minimal correct fix, explains the
reasoning from first principles, and accurately represents its own confidence
and knowledge limits.

---

## 2. Why Code Debugging as the Prototype Domain

Code debugging/optimization won on every axis:

- **Ground truth exists and is unambiguous**: code either runs or it doesn't
- **Feedback in seconds**: verification loop closes via code execution
- **Genuine complexity**: rules of thumb don't solve it reliably
- **Unlimited problem generation**: infinite supply of calibrated test cases
- **Large gap between mediocre and expert**: visible and scoreable
- **Fast iteration**: full pipeline run + evaluation in under 2 minutes

This is a **prototype domain**, not the end goal. The architecture generalizes.

---

## 3. Architecture

### Folder Structure

```
worldclass-ai-pipeline/
├── AGENT_CONTEXT.md          # This file
├── CLAUDE.md                 # Claude Code guidance
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── domains/
│   └── code-debugging/
│       ├── kb/               # Knowledge base (markdown)
│       │   ├── 01_axioms.md
│       │   ├── 02_failure_library.md
│       │   ├── 03_antipatterns_and_exemplars.md
│       │   ├── 04_structural_layer.md
│       │   └── 07_learned_patterns.md  (planned, does not exist yet)
│       ├── problems/
│       │   └── index.ts      # Test problem definitions with ground truth
│       └── results/          # Domain-specific results
├── src/
│   ├── shared/
│   │   ├── client.ts         # OpenRouter SDK wrapper
│   │   ├── types.ts          # All shared TypeScript types
│   │   ├── judge.ts          # LLM judge evaluation
│   │   └── registry.ts       # Persistent JSONL registry
│   └── code-debugging/
│       ├── kb.ts             # Loads KB markdown files
│       ├── activator.ts      # Builds system prompts from KB
│       ├── pipeline.ts       # Generator -> Critic -> Arbitrator
│       ├── verifier.ts       # Code execution + judge scoring
│       ├── run.ts            # One-command entry point
│       ├── ablation.ts       # Ablation matrix runner
│       ├── compare.ts        # Cross-model comparison
│       ├── confidence_gate.ts # Confidence-gated ablation
│       └── kb_diagnosis.ts   # KB format vs content analysis
├── traces/                   # Pipeline traces + registry (gitignored)
└── results/                  # Analysis output
```

### Layer 1: Knowledge Base

Four markdown files in `domains/code-debugging/kb/` that decompose debugging/optimization expertise:

- **Axiomatic** (01): first principles
- **Failure library** (02): eight root cause classes with reasoning paths
- **Anti-patterns and exemplars** (03): mediocre behavior + expert reasoning
- **Structural layer** (04): decision trees, invariants, complexity reference

The KB is loaded as a **cognitive scaffold**, not an information dump. It encodes how an expert *thinks*, not just what they know.

**The KB will grow.** File `07_learned_patterns.md` does not exist yet. It is
intended to be written by the meta-learning layer.

### Layer 2: Latent Space Activator

`src/code-debugging/activator.ts` builds five distinct system prompts from the KB:

- **Generator system**: reasoning architecture + negative space + output contract + epistemic posture
- **Critic system**: same KB + adversarial challenge instructions
- **Arbitrator system**: same KB + honest evaluation instructions
- **Judge system**: separate prompt (no KB) for scoring against ground truth
- **Minimal activator**: prose-form expert knowledge without structured output contract

### Layer 3: Multi-Agent Pipeline

`src/code-debugging/pipeline.ts` runs three agents sequentially:

1. **Generator**: produces initial diagnosis from activated expert context
2. **Critic**: adversarially challenges the generator's output
3. **Arbitrator**: evaluates critique, produces improved final output

Modes: `"all"` (full pipeline), `"gen"` (generator only), `"gated"` (confidence-based)

### Layer 4: Verification Harness

`src/code-debugging/verifier.ts` + `src/shared/judge.ts`:

- **Code execution verifier**: runs fixed code via Python subprocess (binary, deterministic)
- **Judge agent**: LLM-based evaluation of reasoning quality (structured JSON scoring)

### Layer 5: Meta-Learning (NOT YET BUILT)

Planned: reads eval traces, identifies patterns, writes to `domains/code-debugging/kb/07_learned_patterns.md`.

---

## 4. Technology Stack

**Runtime**: Bun with TypeScript
**LLM inference**: OpenRouter via `@openrouter/sdk`
**Code execution**: Python 3 via subprocess

Recommended models (in `.env`):
- `google/gemini-flash-2.0` (default, fast, cheap)
- `deepseek/deepseek-chat` (excellent code reasoning, very cheap)
- `anthropic/claude-sonnet-4` (highest quality, higher cost)

---

## 5. Test Problems

Eight problems defined in `domains/code-debugging/problems/index.ts`:

- **p001**: Quadratic search optimization (medium)
- **p002**: Mutable default argument bug (medium)
- **p003**: Race condition (hard)
- **p004**: Closure late binding (medium)
- **p005**: Generator exhaustion (medium)
- **p006**: Mutation + double normalization (hard)
- **p007**: Type mismatch in data pipeline (hard)
- **p008**: Re-entrant event dispatch ordering (hard)

All have code execution verifiers confirming correct behavior.

---

## 6. Key Design Decisions

- **KB is markdown, not vector DB**: at this scale, full context beats retrieval
- **Structured output contract**: forces explicit reasoning + machine-parseability
- **Critic is a separate agent**: avoids self-critique failure modes
- **Judge has no KB**: evaluates against ground truth, not KB content
- **Code execution separate from judge**: ground truth vs interpretation
- **Generator-only mode exists**: ablation data for component contribution

---

## 7. How to Work on This Project

### If you are an AI agent:
1. Read this document fully before making changes
2. Check `traces/` for existing runs
3. Do not modify `domains/code-debugging/kb/01-04_*.md` without trace evidence
4. `domains/code-debugging/kb/07_learned_patterns.md` is the right place for new knowledge
5. Changes to `src/code-debugging/activator.ts` need measured score deltas
6. Every problem needs a code execution verifier

### If you are a human developer:
- Entry point: `bun src/code-debugging/run.ts`
- Model: `MODEL=` in `.env`
- All outputs: `traces/`
- KB: `domains/code-debugging/kb/*.md`

---

---

## Domain 2: Landing Pages

### Status

Examples collected (6 real-world landing pages with documented A/B test results from
Conversion Rate Experts). Briefs extracted into structured markdown. Knowledge base
built (01_principles.md covering Schwartz awareness spectrum, JTBD framing, specificity,
mechanism, CTA commitment ladder). Pipeline built with four generation configs. Judge
built with five scoring dimensions. Experiment runner built.

### Research Question

Can context engineering reliably produce world-class landing copy from a raw product
brief? If yes, which intervention produces the most consistent improvement over the
bare model?

### Experiment Design

Four generation configs, each representing a different context engineering intervention:

1. **bare** -- minimal system prompt ("You are a copywriter"), brief only
2. **question_first** -- forces empathy reasoning before writing (visitor fears,
   beliefs, objections)
3. **kb_scaffold** -- injects 01_principles.md as system-level knowledge scaffold
4. **few_shot** -- provides 2 randomly selected real-world examples (excluding the
   target product) as in-context demonstrations

Judge evaluates on five dimensions (0-10 each):
- visitor_emotional_accuracy, specificity, mechanism_clarity, cta_awareness_match,
  interchangeability (inverted)

Verdict thresholds: WORLD_CLASS >= 8.0, COMPETENT >= 6.0, GENERIC < 6.0

Reference calibration: the judge receives the real-world example copy for the same
product as calibration context (not as a similarity target).

### Key Files

- `domains/landing-pages/examples/`   world-class reference pages (6 products)
- `domains/landing-pages/problems/`   raw product briefs (6 products)
- `domains/landing-pages/kb/`         copy principles (for kb_scaffold config)
- `domains/landing-pages/results/`    experiment outputs + summary
- `src/landing-pages/pipeline.ts`     generation pipeline (4 configs)
- `src/landing-pages/judge.ts`        5-dimension scoring
- `src/landing-pages/run.ts`          experiment runner

### Hypothesis

Based on code-debugging findings: few_shot config will outperform kb_scaffold. The
model already knows copywriting principles (kb_scaffold tells it what it knows);
few_shot shows it what good looks like (harder to derive from training). question_first
will outperform bare by forcing visitor-centric reasoning before generation. The model's
native capability is likely sufficient for common product types. Interventions will add
value on niche or complex products where the model has weaker priors.

---

*Last updated: added Domain 2 (Landing Pages) experiment runner and documentation.*
