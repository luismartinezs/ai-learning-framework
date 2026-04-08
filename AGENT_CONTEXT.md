# AGENT_CONTEXT.md
# World-Class AI Pipeline — Full Project Reference

This document is the authoritative reference for any agent (human or AI) picking
up this project. It covers the vision, the reasoning behind every architectural
decision, the current state of the codebase, and the next steps in priority order.

Read this before touching anything.

---

## 1. The Core Idea

We are building a framework that produces **world-class quality output from AI**
in a specific domain — not by making the model "smarter", but by designing the
environment, context, and agent topology that activates the model's best latent
capabilities.

The central insight: an LLM is a generalist that accepts context. The gap between
mediocre and excellent output is not primarily the model — it is:

1. **Latent space activation**: what system prompt, knowledge scaffold, and
   framing steers the model into the expert subspace for a given domain
2. **Verification loop**: a tight feedback cycle between output and ground truth
   that identifies failures and writes back into the knowledge base
3. **Agent topology**: multiple specialized agents that challenge each other,
   rather than a single agent trying to do everything

A secondary insight with major implications: **existing workflows were designed
for human cognition** — serial, memory-limited, bandwidth-constrained. AI
requires a fundamentally different architecture that exploits parallelism,
exhaustive pattern coverage, explicit uncertainty modeling, and zero ego cost
for belief updating.

### What "world-class" means here

We deliberately avoid the label. The operative definition is pragmatic:
**output that produces the desired outcome optimally using an optimal amount
of resources** — better than the output of 99 comparable agents given the
same input, most of the time.

For code debugging/optimization specifically: correctly identifies the root
cause (not the symptom), proposes the minimal correct fix, explains the
reasoning from first principles, and accurately represents its own confidence
and knowledge limits.

---

## 2. Why Code Debugging as the Prototype Domain

We evaluated many domains. Code debugging/optimization won on every axis:

- **Ground truth exists and is unambiguous**: code either runs or it doesn't,
  tests pass or fail, benchmarks produce numbers
- **Feedback in seconds**: the verification loop closes via code execution,
  no humans required, no waiting for markets or traffic or users
- **Genuine complexity**: rules of thumb don't solve it reliably — real bugs
  require reasoning, not retrieval
- **Unlimited problem generation**: infinite supply of calibrated test cases
- **Large gap between mediocre and expert**: a mediocre agent patches symptoms;
  an expert identifies invariant violations. The difference is visible and scoreable.
- **Fast iteration**: full pipeline run + evaluation in under 2 minutes

This is a **prototype domain**, not the end goal. Once the architecture is
validated here, it generalizes. The second domain we plan to add is logical
argumentation, which exercises different parts of the stack (judgment vs execution).

---

## 3. Architecture

### Overview

```
kb/                          ← knowledge base (markdown files)
  01_axioms.md               ← first principles
  02_failure_library.md      ← root cause taxonomy
  03_antipatterns_and_exemplars.md  ← what mediocre looks like + expert reasoning
  04_structural_layer.md     ← decision trees, complexity reference
  07_learned_patterns.md     ← auto-grows from feedback loop (does not exist yet)

src/
  kb.ts                      ← loads KB files into a single string
  activator.ts               ← builds all system prompts from KB
  client.ts                  ← OpenRouter SDK wrapper (single call() function)
  types.ts                   ← all shared TypeScript types
  problems.ts                ← test problem definitions with ground truth
  pipeline.ts                ← Generator → Critic → Arbitrator agents
  verifier.ts                ← code execution + judge scoring
  run.ts                     ← one-command entry point
```

### Layer 1: Knowledge Base

Four markdown files that decompose debugging/optimization expertise into layers:

- **Axiomatic**: first principles. A bug is a divergence between the programmer's
  mental model and system reality. Debugging is hypothesis-driven model refinement.
  Optimization is resource allocation under constraints. These are the load-bearing
  statements everything else derives from.
- **Failure library**: eight root cause classes, each with: what the symptom looks
  like, what the actual cause is, the expert's reasoning path, the correct fix,
  and the common *wrong* fix. The wrong fix is as important as the right one.
- **Anti-patterns and exemplars**: six anti-patterns describing exactly what
  mediocre behavior looks like and why it fails. Three expert reasoning exemplars
  showing the *internal thought process* of an expert working through a problem —
  not just the output, the reasoning.
- **Structural layer**: decision trees for debugging and optimization, invariants
  by system type, complexity reference table, language-specific failure points.

The KB is loaded as a **cognitive scaffold**, not an information dump. The
distinction matters: it encodes how an expert *thinks*, not just what they know.

**The KB will grow.** File `07_learned_patterns.md` does not exist yet. It is
intended to be written by the meta-learning layer as the feedback loop runs and
identifies recurring patterns. Creating this loop is a priority next step.

### Layer 2: Latent Space Activator

`src/activator.ts` builds five distinct system prompts from the KB:

**Generator system** (main activator):
- Reasoning architecture section: encodes the *process* — classify before
  diagnosing, form falsifiable hypotheses, reason from invariants, apply
  information theory to observations
- Negative space section: explicitly defines what the expert does *not* do
  (patch symptoms, optimize without profiling, hallucinate confidence). This is
  critical — the model's default tendencies pull toward confident-sounding answers
  and this section actively counteracts that.
- Output contract: mandatory structured format for both debugging and optimization
  responses. Forces explicit reasoning which improves output quality AND makes
  responses machine-evaluable.
- Epistemic posture: calibrated uncertainty as an explicit operating principle.

**Critic system**: same KB + instructions to adversarially challenge the
generator's output on hypothesis quality, root cause depth, missing cases,
fix correctness, and confidence calibration.

**Arbitrator system**: same KB + instructions to evaluate the critique honestly,
concede where the critic is right, defend where wrong, and produce an improved
final diagnosis.

**Judge system**: separate prompt (no KB) for scoring a diagnosis against ground
truth on correctness and reasoning quality. Returns structured JSON.

The activator is itself an **optimization target** — it should be iterated
based on output quality scores. The current version is v0.1; it has not yet
been empirically tuned.

### Layer 3: Multi-Agent Pipeline

Three agents run sequentially:

1. **Generator**: produces the initial diagnosis/fix from the activated expert context
2. **Critic**: adversarially challenges the generator's output — not to be
   contrarian but to find real weaknesses
3. **Arbitrator**: evaluates the critique, concedes valid points, defends invalid
   ones, produces improved final output

The pipeline produces a **reasoning trace** — the full output of all three agents
saved to `traces/`. This trace is the primary data asset. Over time, traces with
high eval scores become exemplars that feed back into the KB.

An optional **generator-only mode** (`--gen` flag) runs just the first agent.
This is used for ablation testing: comparing generator-only vs full pipeline
tells you what the critic/arbitrator layer is actually adding.

### Layer 4: Verification Harness

Two verification mechanisms:

**Code execution verifier**: runs the fixed code via Python subprocess and
checks actual behavior against ground truth. Binary, deterministic, fast.
This is the highest-quality signal — no LLM subjectivity.

**Judge agent**: LLM-based evaluation of reasoning quality against ground truth.
Scores on correctness (0-10) and reasoning quality (0-10), identifies whether
root cause was found and correct fix proposed, lists expert/mediocre markers
present, gives an overall verdict (EXPERT/COMPETENT/MEDIOCRE) and key insight.

Judge output is structured JSON. Parse errors should be treated as signal —
they often indicate the model produced malformed output, which is itself
a quality indicator.

### Layer 5: Meta-Learning (NOT YET BUILT)

The planned layer that closes the full loop:
- Reads eval results from `traces/`
- Identifies patterns: where does the system consistently fail? What does it
  consistently get right?
- Proposes updates to the KB (writes to `kb/07_learned_patterns.md`)
- Optionally proposes updates to the activator itself

This is the highest-leverage unbuilt component. Without it, the system improves
only through manual iteration. With it, the system can self-improve.

---

## 4. Technology Stack

**Runtime**: Bun — chosen for zero env management friction vs Python virtualenvs.
The developer uses TypeScript as their primary language.

**LLM inference**: OpenRouter via `@openrouter/sdk` — chosen for:
- Cost: the developer has a Claude Max subscription (free) but the API costs
  per token. OpenRouter with cheap models (Gemini Flash 2.0, DeepSeek) costs
  near-zero for prototype iteration.
- Model agnosticism: the architecture is model-independent. Swapping models
  is a single env var change (`MODEL=` in `.env`). This enables easy ablation
  across models.
- Full API control: unlike Claude Code CLI (which has its own fixed system prompt),
  the API gives complete control over system prompts, which is the core of the
  latent space activator.

**Recommended models** (in `.env`):
- `google/gemini-flash-2.0` — fast, cheap, strong on code (default)
- `deepseek/deepseek-chat` — excellent code reasoning, very cheap
- `anthropic/claude-sonnet-4` — highest quality when needed, higher cost

**Code execution**: Python 3 via subprocess — the test problems are Python
bugs/optimizations, so Python is needed for the verification harness regardless
of the orchestration language.

**Claude Code CLI**: used *outside* the pipeline as a development partner —
reviewing traces, editing KB files, improving the activator. It is NOT currently
wired into the pipeline itself. Future consideration: use it as the meta-learning
layer (Layer 5) since it can read files, run code, and write back to the repo.

---

## 5. Test Problems

Three problems are currently defined in `src/problems.ts`, each with ground truth:

**p001** — `find_common_users` (optimization, medium):
- Symptom: 800ms for n=10,000, target <10ms
- Root cause: O(n×m) complexity — linear search in list_b per element of list_a
- Correct fix: convert list_b to set → O(n+m), ~350x speedup verified by execution

**p002** — `get_user_permissions` (bug, medium):
- Symptom: correct first call, wrong on subsequent calls, no errors
- Root cause: mutable default argument `[]` shared across all calls; `.extend()`
  mutates the dict values in-place
- Correct fix: `perms = list(base_permissions.get(...))` — copy before extending

**p003** — `Counter.increment` (bug, hard):
- Symptom: non-deterministic, typically reaches 3000-7000 instead of 10000
- Root cause: read-modify-write of `self.value` is not atomic; threads interleave
- Correct fix: `threading.Lock()` around the read-modify-write

All three have code execution verifiers that confirm the fix produces correct
behavior (not just that the agent described the right fix).

---

## 6. Key Design Decisions and Their Reasoning

**Why the KB is markdown, not a vector DB or retrieval system**:
At this scale (4 files, ~22k chars), full KB in context is better than retrieval.
Retrieval adds latency and can miss cross-file relationships. When the KB grows
large enough that full context is a problem, switch to semantic retrieval then.

**Why the output contract is mandatory and structured**:
Two reasons. First, it forces the model to make its reasoning explicit at each
step — this improves reasoning quality because the model can't skip steps.
Second, structured output is machine-parseable by the verification harness.
Without structure, the judge has to infer what the model was thinking.

**Why the critic is a separate agent (not self-critique)**:
Self-critique has well-documented failure modes — models tend to defend their
own output. A separate agent instantiation with an adversarial framing produces
meaningfully different challenges. The arbitrator then acts as a third perspective
evaluating both.

**Why the judge has no KB**:
The judge's job is to evaluate reasoning quality against ground truth, not to
solve the problem itself. Giving the judge the KB creates a risk of it evaluating
the agent's answer against what the KB says rather than actual correctness.

**Why code execution verification is separate from judge scoring**:
Code execution is ground truth. Judge scoring is interpretation. They measure
different things and can disagree — which is itself informative. An agent can
score 9/10 from the judge while the code verification fails (plausible-sounding
wrong fix) or score 6/10 while code passes (correct but poorly reasoned fix).
Both dimensions matter.

**Why generator-only mode exists**:
Ablation. The multi-agent layer adds cost and latency. It should only be kept
if it demonstrably improves output quality. Generator-only runs vs full pipeline
runs on the same problem, scored by the same judge, produce the comparison data
needed to justify the complexity.

---

## 7. Current State

### What works
- Full pipeline runs end-to-end: Generator → Critic → Arbitrator → Verify
- Code execution verifiers for all three problems pass against known-correct fixes
- Trace + eval JSON saved to `traces/` on every run
- Model is a single env var swap
- TypeScript types cover all data structures

### What has NOT been run yet
The pipeline has been built and the code is correct, but **no actual pipeline
runs have been executed against OpenRouter yet** — the codebase was built in
this conversation and the final TypeScript version was packaged for local
execution. The first real run is the next action.

### Known gaps
- `kb/07_learned_patterns.md` does not exist — meta-learning layer not built
- No ablation runner (automated comparison of gen-only vs full pipeline)
- No multi-run scoring aggregator (running the same problem N times to measure
  variance, since LLM outputs are non-deterministic)
- Activator has not been empirically tuned — current version is v0.1
- Only 3 test problems — not enough for robust evaluation
- No second domain (logical argumentation) added yet

---

## 8. Next Steps (Priority Order)

### Immediate: first real run
```bash
bun src/run.ts p001           # full pipeline
bun src/run.ts p001 --gen     # generator only, same problem
```
Compare the two eval JSONs. This answers the first question: is the
critic/arbitrator layer adding value? Is the activator working at all?

### Step 2: Expand the problem set
Add p004-p010 covering:
- Off-by-one errors
- Memory leak (hard to verify without long-running process — think carefully)
- Wrong abstraction level (refactoring problem, harder to score)
- SQL N+1 query (different domain: database)
- Async/await misuse in JavaScript (second language)

Rule: every problem must have an unambiguous ground truth and a code
execution verifier. If you can't write the verifier, the problem is not
ready.

### Step 3: Variance measurement
Run each problem 5 times with the same config. Score all runs. Report
mean and standard deviation of correctness and reasoning quality scores.
High variance = the activator is not reliably steering into the expert
subspace. Low variance + high scores = the activation is working.

### Step 4: Ablation matrix
Run every problem with every combination:
- With KB vs without KB (ablation flag already exists in `buildActivator`)
- Generator only vs full pipeline
- Model A vs model B

This produces a data-driven answer to: what is each component actually
contributing?

### Step 5: Activator tuning
Based on ablation results and low-scoring traces, identify where the
activator is failing. Typical failure modes:
- Model ignores the output contract (fix: make it more prominent, add examples)
- Model applies rules of thumb despite negative space section (fix: strengthen
  that section, add more specific examples)
- Model hallucinates confidence (fix: strengthen epistemic posture section)

Edit `src/activator.ts`, re-run the full problem set, compare scores.

### Step 6: Meta-learning layer
Build `src/meta.ts`:
- Reads all `*_eval.json` files in `traces/`
- Identifies lowest-scoring problem/agent combinations
- Reads the corresponding trace
- Calls the LLM to analyze: what went wrong, what pattern does this represent,
  what KB addition would address it
- Appends to `kb/07_learned_patterns.md`
- Optionally: flags specific sections of the activator for revision

This is the feedback loop closing. The KB becomes a living document that
improves from evidence rather than only from manual editing.

### Step 7: Second domain
Add logical argumentation as a second domain:
- Problems: flawed arguments to critique, positions to argue, evidence to evaluate
- Verification: LLM judge panel (no code execution equivalent)
- Purpose: validates that the architecture generalizes beyond code

### Future: Claude Code as meta-layer
Consider wiring Claude Code CLI into the meta-learning layer — it can read
traces, edit KB files, and run the pipeline to test improvements. This would
make the system partially self-improving without human intervention between cycles.

---

## 9. How to Work on This Project

### If you are an AI agent being handed this repo:
1. Read this document fully before making any changes
2. Check `traces/` for any existing runs — they tell you what the system has
   already learned and where it currently fails
3. Do not modify `kb/01-04_*.md` without a specific reason grounded in trace
   evidence — these files encode deliberate design decisions
4. `kb/07_learned_patterns.md` is the right place to add new knowledge from
   observed failures — create it if it doesn't exist
5. The activator in `src/activator.ts` is an optimization target — but only
   change it based on measured score deltas, not intuition
6. Every problem in `src/problems.ts` must have a code execution verifier in
   `src/verifier.ts` — don't add problems without verifiers

### If you are a human developer:
- The entry point is `bun src/run.ts`
- Model is `MODEL=` in `.env`
- All outputs go to `traces/`
- The KB is in `kb/*.md` — plain markdown, edit freely
- Claude Code works well for: reviewing traces, proposing KB improvements,
  writing new test problems

---

## 10. The Bigger Picture

This codebase is a **prototype of a larger idea**: that AI systems can be
designed to operate at expert level in specific domains by:

1. Decomposing domain expertise to first principles and encoding it as a
   cognitive scaffold (not a fact database)
2. Designing prompts that activate expert reasoning *process*, not just
   expert knowledge
3. Using multi-agent topology to replicate the adversarial quality-checking
   that human expert communities do (peer review, adversarial collaboration)
4. Closing a tight feedback loop between output quality and knowledge base
   so the system improves from evidence
5. Measuring everything — variance, ablation, per-component contribution

The hypothesis being tested is: **the gap between a competent LLM output
and a genuinely expert-level output can be closed through architectural
design without requiring a better model.**

If the hypothesis holds in code debugging, the same architecture applies
to any domain where ground truth is definable and feedback loops are
constructable.

---

*Last updated: project inception. Update this document whenever a
significant architectural decision is made or a major component is added.*