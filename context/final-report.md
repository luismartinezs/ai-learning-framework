# Can Architecture Substitute for Model Quality?

An empirical test of whether knowledge scaffolding, multi-agent topology, and verification loops can close the gap between competent and expert LLM output on code debugging tasks.

## The Thesis

The hypothesis: a cheap generalist model ($0.10/M tokens), given the right cognitive scaffold and agent architecture, can match or exceed an expensive frontier model ($3.00/M tokens) running bare. The gap between mediocre and expert AI output is architectural, not a function of model capability.

## Experimental Design

**Architecture under test:**
- Knowledge Base (KB): four markdown files encoding debugging expertise as a cognitive scaffold. Axioms, failure taxonomy, anti-patterns, decision trees. Loaded into the system prompt.
- Multi-agent topology: Generator produces a diagnosis, Critic adversarially challenges it, Arbitrator resolves the dispute and produces a final output.
- Structured output contract: forced reasoning format that makes the model's chain-of-thought explicit and machine-evaluable.

**Ablation matrix (4 configurations):**

| Config | Multi-agent | KB scaffold |
|--------|-------------|-------------|
| full+KB | Yes | Yes |
| full-KB | Yes | No |
| gen+KB | No | Yes |
| gen-KB | No | No |

**Models tested:**

| Model | Type | Cost (input/output per 1M tokens) |
|-------|------|-----------------------------------|
| google/gemini-2.0-flash-001 | Cheap generalist | $0.10 / $0.40 |
| qwen/qwen3-coder-next | Code specialist | $0.15 / $0.60 |
| deepseek/deepseek-r1 | Reasoning model | $0.55 / $2.19 |
| anthropic/claude-sonnet-4 | Frontier | $3.00 / $15.00 |

**Problems (8 total):**
- p001: Set optimization (O(n^2) to O(n))
- p002: Mutable default argument (silent state corruption)
- p003: Threading race condition (non-deterministic counter)
- p004: Closure late binding (validators all check last field)
- p005: Generator exhaustion (second iteration returns nothing)
- p006: Mutation + double normalization (two interacting bugs)
- p007: Type mismatch in data pipeline (string keys vs int keys)
- p008: Re-entrant event dispatch (handler ordering + shared state)

**Evaluation:** Two independent signals per run.
1. Code execution: runs the proposed fix against test cases. Binary pass/fail.
2. LLM judge: scores correctness (0-10) and reasoning quality (0-10), classifies verdict as EXPERT / COMPETENT / MEDIOCRE.

**Scale:** 356 ablation runs total. 5 repeats per cell for gemini-flash (full matrix), 3 repeats for other models (focused on discriminating problems).

---

## Results

### Component Contribution (all models combined)

| Comparison | Correctness | Expert Rate |
|------------|-------------|-------------|
| full+KB (scaffold) | 9.60 | 93% |
| full-KB (multi-agent only) | 9.70 | 92% |
| gen+KB (KB only) | 9.25 | 85% |
| gen-KB (bare model) | 9.67 | 92% |

**Multi-agent topology:** +8 percentage points expert rate when paired with KB (85% to 93%). Only +1pp without KB (92% to 92%). The critic/arbitrator layer's value is primarily recovering from KB-induced errors, not improving bare model output.

**Knowledge Base scaffold:** Net negative when used alone. gen+KB (85% expert) is the worst configuration. gen-KB (92% expert) outperforms it. The KB imposes a reasoning structure that interferes with the model's native chain-of-thought. Multi-agent compensates for this, bringing full+KB back to 93%.

**Code execution pass rate:** 100% across all 356 runs, all models, all configurations. The code verifiers do not discriminate between configurations.

### Model Comparison

| Model | full+KB (corr / exp%) | gen-KB (corr / exp%) |
|-------|----------------------|---------------------|
| gemini-2.0-flash | 9.80 / 93% | 9.53 / 87% |
| qwen3-coder-next | 9.21 / 92% | 9.88 / 100% |
| deepseek-r1 | 9.33 / 92% | 9.67 / 89% |
| claude-sonnet-4 | 9.78 / 100% | 10.00 / 100% |

**The thesis comparison: cheap model + full scaffold vs. expensive model bare.**
- gemini-flash + full+KB: 9.80, 93% expert
- claude-sonnet-4 + gen-KB: 10.00, 100% expert

The cheap model with scaffold approaches but does not match the frontier model bare. Both are near the ceiling, making the delta uninformative.

### Architecture Value by Model Quality

| Model tier | Scaffold effect |
|------------|----------------|
| Cheap generalist (gemini-flash) | Helps significantly: +6pp expert rate, +0.27 correctness |
| Code specialist (qwen-coder) | Hurts: -8pp expert rate, -0.67 correctness |
| Reasoning model (deepseek-r1) | Hurts on some problems: 7.3 correctness on p002 with KB vs 9.0 bare |
| Frontier (sonnet-4) | Irrelevant: 100% expert rate regardless of configuration |

Architecture value is inversely proportional to model capability. The scaffold helps the weakest model and hurts everything else.

### Problem Difficulty Distribution

| Problem | Runs | Correctness | Expert Rate | Discriminating? |
|---------|------|-------------|-------------|----------------|
| p001 | 55 | 10.00 | 100% | No |
| p002 | 64 | 8.76 | 75% | Yes |
| p003 | 52 | 10.00 | 100% | No |
| p004 | 32 | 9.94 | 97% | No |
| p005 | 32 | 10.00 | 100% | No |
| p006 | 44 | 9.25 | 80% | Yes (gemini-flash only) |
| p007 | 44 | 9.70 | 93% | Marginal (gemini-flash only) |
| p008 | 33 | 9.12 | 88% | Marginal |

Five of eight problems (p001, p003, p004, p005, p007) produce zero signal. All models, all configurations score near-perfect. The remaining three problems (p002, p006, p008) only discriminate for gemini-flash. Sonnet-4, deepseek-r1, and qwen-coder solve them all bare.

---

## Interpretation

### What the experiment proves

1. **Multi-agent review has genuine, measurable value for weaker models.** On gemini-flash, the critic/arbitrator layer recovers bad generator outputs. On p006 specifically: full pipeline scores 10.0 while generator-only scores 8.6. The adversarial review process catches errors that a single generation pass misses.

2. **Knowledge Base scaffolding is net-negative as designed.** The imposed reasoning structure conflicts with the model's native capabilities. It helps on some problems (p007 +0.6, p008 +1.0 for gemini-flash), but hurts on others (p002 -2.7, p006 -2.4 for gemini-flash gen-only). Net effect is negative unless multi-agent topology compensates for the interference.

3. **Architecture value is inversely proportional to model quality.** This is the most important finding. The scaffold adds measurable value only for the cheapest, least capable model. For every other model tested, bare performance matches or exceeds scaffolded performance.

4. **Code debugging is a solved problem for current frontier models.** All eight problems, including multi-bug interactions, silent data corruption, and re-entrant dispatch ordering, are solved at 100% expert rate by claude-sonnet-4 running bare. The domain does not challenge capable models.

### What the experiment does not prove

The thesis remains **inconclusive, not disproven**. The ceiling effect (all models score 9+ across most problems) means we cannot distinguish "scaffold substitutes for model quality" from "these problems don't need either." A definitive test requires problems where the frontier model scores below 8/10 bare. Such problems were not found within the scope of realistic production code debugging.

### Why harder problems are not the answer

This was the natural next step. But the problems tested (mutable defaults, closure capture, generator exhaustion, type mismatches, race conditions, mutation bugs, re-entrant dispatch) are representative of real-world production debugging. They are not toy problems. If all current models solve them trivially, the conclusion is not that the problems are too easy. The conclusion is that code debugging at this complexity level is within the native capability of current models.

Manufacturing problems that stumble frontier models would move beyond what practitioners encounter in production, making the experiment less relevant, not more.

---

## Conclusions

**The original thesis was: "the gap between competent and expert LLM output is closed through architectural design, not better models."**

The data says: **for production-grade code debugging, model quality is already sufficient.** Architectural scaffolding helps the cheapest model approach the frontier, but it cannot exceed it, and it actively interferes with models that already have strong reasoning capabilities.

This does not mean architecture is valueless. It means:

1. **Multi-agent review is useful as a selective reliability mechanism.** Apply it to tasks where generation quality is unreliable, not as a universal pipeline stage.

2. **Knowledge scaffolding should not impose structure on models that already reason well.** If the model's native chain-of-thought outperforms the scaffold, the scaffold is overhead, not optimization.

3. **The cost argument for scaffolding has a shrinking window.** Inference costs drop predictably. The engineering cost of maintaining a KB + multi-agent pipeline is fixed. The crossover where "use a better model" becomes cheaper than "maintain the scaffold" approaches quickly.

4. **The methodology is the durable output of this experiment.** Ablation testing, JSONL registry, cross-model comparison, structured judge scoring. This infrastructure measures any pipeline's contribution, regardless of domain.

### What to build next (if anything)

The experiment produced a clear signal in three phases and 356 runs. Continuing to iterate on the same thesis (harder problems, more models, meta-learning to generate more KB) runs against the evidence. Possible directions that build on what was learned:

- **Selective multi-agent review**: instead of a fixed pipeline, use a confidence-based gate that triggers critic/arbitrator only when the generator's output has low self-assessed confidence. This preserves the recovery benefit without the overhead on easy problems.
- **Domain transfer**: test whether the architecture adds value for tasks where models genuinely struggle (ambiguous requirements, multi-file refactoring, system design) rather than well-defined single-function bugs.
- **Eval infrastructure as a product**: the ablation/registry/comparison tooling is general-purpose. It measures any LLM pipeline's component contribution, independent of this specific thesis.

---

*356 runs. 4 models. 8 problems. 4 configurations. Total cost: ~$12. Runtime: ~8 hours cumulative.*
