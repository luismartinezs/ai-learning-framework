# Development Plan

Read AGENT_CONTEXT.md for full project architecture. Read CLAUDE.md for commands and conventions.

---

## Phase 1: Establish whether the architecture matters

### Goal

Produce ablation data that proves (or disproves) that the KB scaffold and multi-agent topology add measurable value over a bare model. Right now we have 3/3 EXPERT scores at 10/10, which tells us nothing. We need differential signal between configurations.

### Context

The pipeline has three architectural bets:
1. **Knowledge Base scaffold** (kb/*.md loaded into system prompt via `src/activator.ts`)
2. **Multi-agent topology** (Generator -> Critic -> Arbitrator in `src/pipeline.ts`)
3. **Structured output contract** (forced reasoning format in the activator)

Each bet adds cost and complexity. Ablation testing isolates what each contributes.

The activator already supports KB ablation: `buildActivator(includeKB: boolean)` in `src/activator.ts:142`. The pipeline already supports gen-only mode via `--gen` flag. What's missing is an automated runner that exercises all combinations and records results.

### What exists

- `src/run.ts` runs one problem in one mode and saves trace + eval + registry entry
- `traces/registry.jsonl` is the persistent JSONL experiment log (one line per run)
- `src/registry.ts` has `buildEntry()`, `appendToRegistry()`, `readRegistry()`
- Model is set via `MODEL=` env var, default `google/gemini-2.0-flash-001`
- Three test problems: p001 (set optimization), p002 (mutable default bug), p003 (threading race condition)

### What to build

**`src/ablation.ts`** -- a script that runs the full ablation matrix automatically:

```
Configurations to test:
  1. full pipeline + KB     (mode: "all",  includeKB: true)   -- current default
  2. full pipeline - KB     (mode: "all",  includeKB: false)  -- tests KB value
  3. generator only + KB    (mode: "gen",  includeKB: true)   -- tests multi-agent value
  4. generator only - KB    (mode: "gen",  includeKB: false)  -- bare model baseline

Problems: p001, p002, p003
Repeats: 5 per configuration per problem (variance measurement)
Total runs: 4 configs x 3 problems x 5 repeats = 60 runs
```

Implementation requirements:
- Must pass `includeKB` through to `buildActivator()`. Currently `runPipeline()` in `src/pipeline.ts` doesn't accept this parameter. It calls `buildActivator()` with no args (defaults to true). Add an `includeKB` option to `runPipeline()`.
- Each run must append to `traces/registry.jsonl` via the existing registry module.
- Print a summary table at the end: mean + stddev of correctness and reasoning scores, grouped by configuration.
- Runs sequentially (not parallel) to avoid OpenRouter rate limits.

### How to validate the output

After running the ablation:
- If "full + KB" significantly outscores "full - KB": the KB scaffold is earning its cost.
- If "full + KB" significantly outscores "gen + KB": the critic/arbitrator layer adds value.
- If "gen - KB" (bare model) scores nearly as well as "full + KB": the architecture isn't helping and the problems are too easy.
- High variance (stddev > 1.5) on any config means the activation is unreliable.

### Rule

Do NOT tune the activator, modify the KB, expand the problem set, or build new architecture until this data exists. Decisions must be grounded in measured score deltas.

### Done

- [x] Run all 3 problems through full pipeline (baseline: 3/3 EXPERT)
- [x] Build registry for persistent experiment tracking (traces/registry.jsonl)
- [x] Add `includeKB` parameter to `runPipeline()` in src/pipeline.ts
- [x] Thread `includeKB` through activator (critic + arbitrator builders), types, registry
- [x] Build `src/ablation.ts` (ablation runner with all 4 configs x 3 problems x 5 repeats)
- [x] Run the full ablation (60 runs on gemini-2.0-flash)
- [x] Analyze results

### Remaining

None. Phase 1 complete.

---

## Phase 2: Harder problems that expose failure

### Goal

Find the system's failure boundary. If Phase 1 shows all configs score ~10/10, the problems are too easy and we need harder ones before any optimization makes sense.

### Context

The current three problems (p001-p003) are well-known patterns: set conversion for O(n) lookup, mutable default argument, threading race condition. These are the kind of bugs that appear in interview prep material. Current models solve them trivially.

Harder problems should have properties that separate expert from mediocre reasoning:
- The symptom appears far from the root cause (multi-step causation)
- There's an obvious-looking "fix" that doesn't address the real issue (red herring)
- Multiple interacting bugs where fixing one exposes another
- Edge cases that only trigger under specific input conditions
- Performance issues where the naive optimization is wrong

### What exists

- `src/problems.ts` defines problems as `Problem` objects with: label, type (bug/optimization), difficulty, problem text (Python code + description), groundTruth (Record<string, string> with root_cause, correct_fix, explanation)
- `src/verifier.ts` has `CODE_VERIFIERS` (a Record<ProblemKey, () => Promise<CodeVerifyResult>>) where each verifier runs Python code via subprocess and asserts correctness
- `src/types.ts` has `ProblemKey = "p001" | "p002" | "p003"` which must be extended for new problems

### What to build

Add 5 new problems (p004-p008) to `src/problems.ts`. For each:

1. Write the `Problem` object in `src/problems.ts` with buggy Python code, description, and ground truth
2. Add a code execution verifier in `src/verifier.ts` that runs the fixed code and asserts correct behavior
3. Extend the `ProblemKey` union type in `src/types.ts`

Target difficulty distribution: 2 medium-hard, 2 hard, 1 very hard.

Candidate problem categories (pick from these, design specifics based on what will challenge models):
- **Off-by-one in boundary logic**: correct for most inputs, fails on edge cases (empty list, single element, exact boundary)
- **Closure variable capture in loop**: Python late-binding closures creating subtle bugs in callbacks/lambdas
- **Silent data corruption**: function returns wrong results without errors, requires tracing data flow across multiple functions
- **Premature optimization trap**: code has an obvious O(n^2) that isn't actually the bottleneck; the real bottleneck is I/O or memory allocation
- **Exception masking**: bare except or overly broad try/catch hides the real error, system appears to work but silently fails
- **Floating point comparison**: equality check on floats that works 99% of the time but fails on specific inputs
- **Generator/iterator exhaustion**: iterator consumed once, second use silently returns nothing

### How to validate

Each new problem must:
1. Have a verifier that passes when given the correct fix
2. Have a verifier that fails when given the original buggy code
3. Be solvable by a human expert reading the code (not a trick question, a real reasoning challenge)

After adding problems, run them through the Phase 1 ablation matrix. Success = at least some configs score below 8/10 on at least some problems.

### Done

- [x] Design p004-p008 problem set
- [x] Implement problems in src/problems.ts
- [x] Implement verifiers in src/verifier.ts (all 5 pass)
- [x] Extend ProblemKey type in src/types.ts
- [x] Run full ablation (160 runs: 4 configs x 8 problems x 5 repeats)
- [x] Analyze results

### Findings

- Multi-agent topology is the most valuable component: +15% expert rate (78% gen vs 93% full). On p006, delta is +3.8 correctness.
- KB scaffold is a double-edged sword. Hurts generator on p002 (-2.7) and p006 (-2.4) when used without multi-agent. Helps on p007 (+0.6) and p008 (+1.0). Net value near zero without multi-agent to compensate.
- gen+KB is the worst config (78% expert). Worse than bare model gen-KB (87%).
- Discriminating problems: p006 (55% expert), p002 (68%), p007 (85%). Rest are trivially solved.
- 100% code pass rate across all configs. Code verifiers don't discriminate.

### Remaining

None. Phase 2 complete.

---

## Phase 3: Model comparison

### Goal

Determine whether KB scaffold + cheap model matches or beats expensive model without scaffold. This is the core thesis of the project: architectural design matters more than model quality.

### Context

The current pipeline uses `google/gemini-2.0-flash-001` ($0.10/$0.40 per 1M tokens). The model is set via `MODEL=` env var in `.env`, read by `src/client.ts:6`. The hypothesis is that this cheap model + our KB scaffold + multi-agent topology should approach or match the quality of an expensive model (like Claude Sonnet 4 at $3.00/$15.00) running without the scaffold.

### What exists

- `src/client.ts` reads `MODEL` from env var at import time (`export const MODEL = process.env.MODEL ?? "google/gemini-2.0-flash-001"`)
- `src/ablation.ts` (from Phase 1) runs the 4-config ablation matrix for one model
- `context/models.md` has the full pricing reference with model IDs

### What to build

Extend `src/ablation.ts` (or create `src/model-comparison.ts`) to:

1. Accept a list of model IDs to test
2. For each model, override the MODEL env var (or pass it through to `call()` in client.ts)
3. Run the ablation matrix from Phase 1 for each model (4 configs x all problems x 3 repeats minimum)
4. Output a comparison table: model x config -> mean scores

This requires `src/client.ts` to accept a model override per-call, since the current design reads MODEL once at import time. Either:
- Change `call()` signature to accept an optional `model` parameter
- Or set the env var before each batch and re-import (hacky, avoid this)

Models to test (see `context/models.md` for pricing):
- `google/gemini-2.0-flash-001` -- cheap generalist, current default ($0.013/run)
- `qwen/qwen3-coder-next` -- cheap code-specialist ($0.018/run)
- `deepseek/deepseek-r1` -- dedicated reasoning model ($0.09/run)
- `anthropic/claude-sonnet-4` -- quality ceiling ($0.42/run, run 1x per config not 5x)

### How to validate

The key comparisons:
- **Scaffold value**: `cheap model + full pipeline + KB` vs `expensive model + gen only - KB`. If scores are comparable, the scaffold is substituting for model quality.
- **Code specialist vs generalist**: `qwen3-coder-next` vs `gemini-2.0-flash` on same configs. Does domain-specialization in the model add anything on top of our domain-specialized KB?
- **Reasoning model premium**: `deepseek-r1` vs cheap models on hard problems (p003+). Is the extra cost justified for problems requiring chain-of-thought?
- **Ceiling gap**: how far are cheap models + scaffold from the absolute best (claude-sonnet-4 + full pipeline + KB)?

Estimated cost for full cross-model ablation:
- 4 configs x (p001-p008) x 3 repeats = 96 runs per model
- gemini-2.0-flash: ~$1.25, qwen3-coder-next: ~$1.73, deepseek-r1: ~$8.64
- claude-sonnet-4: ~$40 at 3 repeats, or ~$13 at 1 repeat per config
- Total budget: ~$25-50

### Done

- [x] Modify `src/client.ts` to accept per-call model override
- [x] Extend ablation runner with `--model` and `--focused` flags, resume logic
- [x] Build `src/compare.ts` for cross-model analysis
- [x] Run: qwen3-coder-next (96 runs, full matrix), deepseek-r1 (18 focused), claude-sonnet-4 (18 focused)
- [x] Produce comparison table and analysis

### Findings

- **Thesis: inconclusive.** gemini-flash+scaffold (9.8, 93%E) matches sonnet-4 bare (10.0, 100%E), but both are near ceiling. Can't distinguish "scaffold substitutes for quality" from "problems too easy for all models."
- **KB hurts reasoning models.** deepseek-r1 scored 7.3 on p002 with full+KB (worst of any model+config). The imposed reasoning structure conflicts with r1's internal chain-of-thought.
- **Code-specialist doesn't need scaffold.** qwen3-coder-next scores 9.9/100%E bare, better than with scaffold (9.2/92%E).
- **Architecture value inversely proportional to model quality.** Helps gemini-flash significantly (+15% expert). Helps deepseek-r1 marginally. Hurts qwen3-coder-next.
- **Discriminating problems still only challenge gemini-flash.** p006/p007 are trivially solved by all other models bare.

### Remaining

None. Phase 3 complete. Need harder problems (beyond Phase 2 set) to definitively test thesis.

---

## Phase 4: Close the feedback loop

### Goal

Build the meta-learning layer (Layer 5 in AGENT_CONTEXT.md) so the system identifies its own failure patterns and writes new KB content to address them. Without this, improvement requires manual trace review. With it, the system learns from evidence.

### Context

The pipeline produces two artifacts per run:
1. Raw trace JSON in `traces/` (full agent outputs: generator, critic, arbitrator text)
2. Structured eval in `traces/registry.jsonl` (scores, verdict, marker counts, pass/fail)

The KB currently has 4 files (`kb/01_axioms.md` through `kb/04_structural_layer.md`). A fifth file `kb/07_learned_patterns.md` is planned but does not exist yet. It's where meta-learned patterns should be written.

The activator in `src/activator.ts` loads all `kb/*.md` files via `src/kb.ts` (which globs `kb/*.md` and concatenates them). So any new file matching `kb/*.md` is automatically included in the system prompt on next run.

### What exists

- `src/registry.ts` has `readRegistry()` which returns all `RegistryEntry[]` from the JSONL file
- Raw trace files in `traces/` contain full agent outputs that can be analyzed
- `src/client.ts` provides `call(system, user, maxTokens)` for LLM calls
- The judge system prompt in `src/activator.ts` (exported as `JUDGE_SYSTEM`) shows how to structure evaluation prompts

### What to build

**`src/meta.ts`** -- meta-learning script that:

1. **Read**: Load `traces/registry.jsonl` via `readRegistry()`. Filter for runs with `correctness < 8` or `codePassed === false` or `verdict !== "EXPERT"`.

2. **Analyze**: For each low-scoring run, load the corresponding raw trace file (path is in `entry.traceFile`). Send the trace + eval to the LLM with a meta-analysis prompt asking:
   - What reasoning step failed or was skipped?
   - What pattern does this failure represent?
   - What KB addition (axiom, failure mode, anti-pattern, or decision tree node) would have prevented this failure?
   - Is this a one-off or a recurring pattern? (Check if similar failures appear in other registry entries.)

3. **Write**: Append discovered patterns to `kb/07_learned_patterns.md`. Format each pattern as:
   ```
   ## Pattern: [name]
   **Observed in:** [problem IDs and dates]
   **Failure mode:** [what went wrong]
   **Root cause in reasoning:** [which step broke]
   **Corrective knowledge:** [what the agent should have known/done]
   ```

4. **Validate**: After writing new KB content, re-run the failing problems and compare scores. The new KB content should improve scores on those specific problems without degrading scores on previously-passing problems.

### How to validate

- Re-run previously-failing problems after KB update. Scores should improve.
- Re-run previously-passing problems. Scores should not degrade (KB noise test).
- If KB additions don't improve scores, they're noise. Remove them.
- Track KB size over time. If it grows unboundedly, add a pruning step that removes patterns that don't demonstrably improve scores.

### Prerequisite

Phase 2 must produce failure data first. If all problems score 10/10, there's nothing for meta-learning to learn from.

### Remaining

- [ ] Build `src/meta.ts` with read/analyze/write pipeline
- [ ] Design the meta-analysis prompt (what to ask the LLM about failures)
- [ ] Create `kb/07_learned_patterns.md` with initial structure
- [ ] Run meta-learning on Phase 2 failure data
- [ ] Validate: re-run failing problems, confirm score improvement
- [ ] Validate: re-run passing problems, confirm no regression
- [ ] Add KB pruning if learned patterns don't demonstrably help

---

## Phase 5: Second domain (logical argumentation)

### Goal

Validate that the architecture (KB scaffold + multi-agent topology + verification loop) generalizes beyond code debugging. If it only works for code, the framework is a single-domain tool, not a general architecture.

### Context

Code debugging has unusually clean ground truth: code runs or it doesn't, tests pass or fail. Logical argumentation is deliberately chosen as a contrast because:
- Ground truth is judgment-based, not binary (an argument can be partially valid)
- Verification requires evaluating reasoning quality, not execution results
- The KB scaffold must encode different expertise (logic, rhetoric, evidence evaluation vs debugging heuristics)
- The domain tests whether the multi-agent topology (generator/critic/arbitrator) adds value for reasoning tasks, not just execution tasks

### What exists

The current architecture is designed to be domain-agnostic:
- `src/activator.ts` loads KB from `kb/*.md`. A second domain would have its own KB directory.
- `src/pipeline.ts` runs Generator -> Critic -> Arbitrator regardless of domain.
- `src/verifier.ts` has two verification paths: code execution (domain-specific) and judge scoring (domain-agnostic). The judge prompt would need domain-specific adaptation.
- `src/types.ts` has `Problem.type` currently as `"bug" | "optimization"`. Would need extension.

### What to build

1. **Argumentation KB** (`kb-argumentation/` or a subdirectory):
   - Axioms of logical reasoning (validity vs soundness, deductive vs inductive, etc.)
   - Fallacy taxonomy (equivalent to failure library for code)
   - Anti-patterns in argumentation (equivalent to mediocre debugging patterns)
   - Structural: argument mapping, evidence evaluation frameworks

2. **Argumentation problems** in `src/problems.ts` (or a separate problem file):
   - Flawed arguments to identify and critique (analogous to bug finding)
   - Positions to argue with evidence evaluation (analogous to optimization)
   - Ground truth: identified fallacies, strength of evidence, valid/invalid conclusions

3. **Argumentation verifier**:
   - No code execution equivalent. Verification is purely via LLM judge panel.
   - Consider using multiple judge calls and averaging (reduce single-judge noise).
   - Domain-specific judge prompt that evaluates logical rigor, fallacy identification, evidence handling.

4. **Domain selection in pipeline**:
   - The pipeline, activator, and verifier need to know which domain they're operating in.
   - Options: separate entry points per domain, or a `--domain` flag that swaps KB directory and judge prompt.

### How to validate

- Run the same ablation methodology from Phase 1 on argumentation problems.
- Compare: does the KB scaffold add as much value for argumentation as it does for code?
- Compare: does the multi-agent topology add value for judgment tasks?
- If the architecture's contribution is domain-invariant (similar delta across domains), the framework generalizes. If it only helps for code, investigate why.

### Prerequisite

Phases 1-3 should be complete for code domain first, so we have a validated methodology before applying it to a new domain.

### Remaining

- [ ] Design argumentation KB (axioms, fallacy taxonomy, anti-patterns, structure)
- [ ] Design 5-8 argumentation problems with ground truth
- [ ] Build argumentation judge prompt (multi-judge panel for noise reduction)
- [ ] Add domain selection to pipeline (`--domain` flag or separate entry point)
- [ ] Modify `src/kb.ts` to load domain-specific KB directory
- [ ] Run ablation matrix on argumentation domain
- [ ] Compare architecture contribution across code vs argumentation domains

---

## Status Log

- 2026-04-08: Phase 1 in progress. Baseline complete (3/3 EXPERT, gemini-2.0-flash). Next: build ablation runner.
- 2026-04-08: Phase 1 complete. Built ablation runner, ran 60-run matrix. Key findings:
  - p001 and p003: 10/10 EXPERT across all 4 configs. Zero differentiation. Too easy.
  - p002: only problem with signal. Multi-agent recovers bad gen outputs (gen+KB 6.6 vs full+KB 8.8 correctness). KB may hurt on this problem type (full-KB 9.6 > full+KB 8.8).
  - 100% code pass rate across all configs.
  - Conclusion: problems too easy. Architecture value unmeasurable. Move to Phase 2.
- 2026-04-08: Phase 2 problems implemented. 5 new problems:
  - p004: Closure late binding (medium) - validators all check last field
  - p005: Generator exhaustion (medium) - above_average always empty
  - p006: Mutation + double normalization (hard) - two interacting bugs, scores > 100%
  - p007: Type mismatch in data pipeline (hard) - CSV str keys vs int keys, silent failure
  - p008: Re-entrant event dispatch ordering (hard) - handler order + shared mutable state
  All 5 verifiers pass. Smoke test: p008 full+KB scored EXPERT 10/10. Next: run full ablation on all 8 problems.
- 2026-04-08: Phase 2 complete. 160-run ablation on 8 problems. Key findings:
  - Multi-agent topology = most valuable component (+15% expert rate, +3.8 correctness on p006)
  - KB scaffold = double-edged sword. Hurts gen-only on p002/p006, helps on p007/p008. Needs multi-agent to compensate.
  - gen+KB is worst config (78%). Bare model gen-KB (87%) outperforms.
  - Discriminating problems: p006 (55% expert), p002 (68%), p007 (85%). 5 of 8 still trivial.
  - Ready for Phase 3 (model comparison) or Phase 4 (meta-learning on failure data).
- 2026-04-08: Phase 3 complete. 4 models tested (356 total runs). Thesis inconclusive: ceiling effect.
  - gemini-flash+scaffold matches sonnet-4 bare (9.8 vs 10.0), but both near-perfect.
  - KB hurts reasoning models (deepseek-r1 7.3 with KB vs 9.0 bare on p002).
  - Code-specialist (qwen-coder) doesn't benefit from scaffold (9.9 bare > 9.2 scaffolded).
  - Architecture value inversely proportional to model quality.
  - Conclusion: need harder problems that make sonnet-4 bare score <8 to truly test thesis.
