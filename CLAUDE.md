# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Multi-agent LLM pipeline that produces expert-level code debugging/optimization output. The core hypothesis: the gap between competent and expert LLM output is closed through architectural design (knowledge scaffolding, agent topology, verification loops), not better models.

Prototype domain is Python code bugs/optimization. Architecture is domain-agnostic.

## Commands

```bash
bun src/code-debugging/run.ts              # run p001 through full pipeline + verify
bun src/code-debugging/run.ts p002         # specific problem
bun src/code-debugging/run.ts p003 --gen   # generator only (ablation: skip critic/arbitrator)
bun src/code-debugging/run.ts --all        # all problems sequentially

bun src/code-debugging/ablation.ts                              # ablation: 4 configs x 8 problems x 5 repeats
bun src/code-debugging/ablation.ts --repeats 3                  # fewer repeats
bun src/code-debugging/ablation.ts --model qwen/qwen3-coder-next --repeats 3  # test a different model
bun src/code-debugging/compare.ts                               # cross-model comparison from registry

bun src/code-debugging/pipeline.ts p001 --save   # pipeline only, save trace
bun src/code-debugging/verifier.ts traces/FILE.json            # verify a saved trace
bun src/code-debugging/verifier.ts traces/FILE.json --agent gen  # verify generator output specifically
```

Requires `OPENROUTER_API_KEY` in `.env`. Model is swappable via `MODEL=` env var.

## Architecture

**Data flow:** KB markdown -> Activator (system prompts) -> Generator -> Critic -> Arbitrator -> Verifier (code exec + judge)

Five layers, each an optimization target:

1. **Knowledge Base** (`domains/code-debugging/kb/*.md`) - Cognitive scaffold encoding how an expert *thinks*, not just what they know. Four files: axioms, failure taxonomy, anti-patterns/exemplars, decision trees. `07_learned_patterns.md` is planned but does not exist yet (meta-learning layer unbuilt).

2. **Activator** (`src/code-debugging/activator.ts`) - Builds system prompts from KB. Generator gets reasoning architecture + negative space + output contract + epistemic posture. Critic/Arbitrator get the same KB plus role-specific suffixes. Judge gets a separate prompt with NO KB (evaluates against ground truth, not KB content). `buildActivator(includeKB)` accepts a boolean for KB ablation.

3. **Pipeline** (`src/code-debugging/pipeline.ts`) - Sequential: Generator -> Critic -> Arbitrator. Each is a separate LLM call via `src/shared/client.ts`. Mode `"gen"` short-circuits after Generator. Produces a `Trace` object.

4. **Verifier** (`src/code-debugging/verifier.ts`) - Two independent signals: code execution (Python subprocess, binary pass/fail) and judge scoring (LLM via `src/shared/judge.ts`, structured JSON with correctness/reasoning scores + EXPERT/COMPETENT/MEDIOCRE verdict). These can disagree, which is informative.

5. **Meta-learning** - NOT BUILT. Planned: reads eval traces, identifies failure patterns, writes to `domains/code-debugging/kb/07_learned_patterns.md`.

## Key Files

- `src/shared/types.ts` - All shared types (Problem, Trace, EvalResult, JudgeScore)
- `src/shared/client.ts` - OpenRouter wrapper. Single `call(system, user, maxTokens)` function
- `src/shared/judge.ts` - LLM judge evaluation (extracted from verifier)
- `src/shared/registry.ts` - Persistent JSONL registry for ablation results
- `domains/code-debugging/problems/index.ts` - Test problem definitions with ground truth (p001-p008)
- `src/code-debugging/kb.ts` - Loads all `domains/code-debugging/kb/*.md` into a single string

## Design Constraints

- Every problem in `domains/code-debugging/problems/index.ts` must have a code execution verifier. No verifier = problem not ready.
- Do not modify `domains/code-debugging/kb/01-04*.md` without trace evidence justifying the change.
- The activator is an optimization target but changes should be driven by measured score deltas, not intuition.
- Test problems are Python. Verification runs Python via subprocess.
- Traces and evals go to `traces/` (gitignored).
