# Confidence-Gated Multi-Agent: Results

## Setup

Modified the generator's output contract to include a mandatory self-assessment block:

```
CONFIDENCE_ASSESSMENT:
score: <1-10>
reasoning: <one sentence>
uncertain_about: <what specific aspect is unclear, or "nothing">
```

When the generator's self-assessed confidence is below a threshold, the critic/arbitrator runs as normal. At or above the threshold, the pipeline short-circuits and uses generator output directly.

**Model:** google/gemini-2.0-flash-001
**Problems:** all 8 (p001-p008)
**Repeats:** 5 per cell
**Thresholds tested:** 7, 8, 9
**Total runs:** 120

## Results

### Baseline comparison

| Config | Runs | Trigger% | Correctness | Expert% | vs baseline |
|--------|------|----------|-------------|---------|-------------|
| Baseline (full+KB) | 56 | 100% (always) | 9.8 | 93% | -- |
| Gated t=7 | 40 | 3% | 9.5 | 83% | -0.3 |
| Gated t=8 | 40 | 13% | 9.7 | 88% | -0.1 |
| Gated t=9 | 40 | 8% | 9.4 | 83% | -0.4 |

No threshold meets the success criteria (trigger rate <50% AND expert rate >=90%).

### Confidence score distribution

| Score | Count | % |
|-------|-------|---|
| 10 | 109 | 91% |
| 9 | 2 | 2% |
| 5 (parse failure, defaulted) | 9 | 8% |
| 1-4, 6-8 | 0 | 0% |

The generator reports maximum confidence on 91% of runs. The remaining triggers are parse failures (the model did not emit the CONFIDENCE_ASSESSMENT block), not genuine low-confidence outputs.

### Per-problem breakdown (threshold 8)

| Problem | Trigger% | Correctness | Expert% | Avg confidence |
|---------|----------|-------------|---------|----------------|
| p001 | 0% | 10.0 | 100% | 10.0 |
| p002 | 0% | 9.5 | 60% | 10.0 |
| p003 | 0% | 10.0 | 80% | 10.0 |
| p004 | 20% | 10.0 | 100% | 9.0 |
| p005 | 0% | 10.0 | 100% | 10.0 |
| p006 | 20% | 9.4 | 80% | 9.0 |
| p007 | 40% | 10.0 | 100% | 8.0 |
| p008 | 20% | 9.0 | 80% | 9.0 |

The model is maximally confident on its worst problems. p002 (60% expert) and p006 (80% expert) both report confidence 10 consistently. The critic/arbitrator never triggers for the problems that actually need it.

## Interpretation

### The gate does not work

The generator's self-assessed confidence is not a reliable gate. Three problems:

1. **No calibration.** The model reports 10/10 regardless of actual performance. It is maximally confident on p002 (mutable default) and p006 (mutation + double normalization), the two problems where it most frequently produces non-expert output.

2. **Trigger rate is driven by parse failures, not uncertainty.** The 3-13% trigger rate across thresholds comes from runs where the model failed to emit the CONFIDENCE_ASSESSMENT block at all (defaulting to 5). These are format compliance failures, not confidence signals.

3. **Expert rate drops across all thresholds.** Baseline full+KB achieves 93% expert. Every gated configuration performs worse (83-88%). The gate skips the critic/arbitrator on runs that would have benefited from review.

### Why self-assessment fails here

LLM confidence self-reports are known to be poorly calibrated, especially for instruction-following models that have been trained to be helpful and authoritative. The model has no incentive or mechanism to report low confidence. Its training pushes toward confident, complete answers.

A useful confidence gate would need an external signal, not self-report. Possible alternatives:
- **Output structure analysis:** runs that omit sections of the output contract may correlate with lower quality
- **Logprob entropy:** high token-level uncertainty in the diagnosis section (requires logprob access, not available via OpenRouter)
- **Lightweight verifier:** a fast check (cheaper than full critic/arbitrator) that flags suspicious outputs

### Cost analysis

Token usage across configurations:

| Config | Avg prompt tokens | Avg completion tokens | Relative cost |
|--------|-------------------|-----------------------|---------------|
| Gated t=7 (3% trigger) | 6,123 | 687 | ~1x (gen only) |
| Gated t=8 (13% trigger) | 7,579 | 842 | ~1.1x |
| Gated t=9 (8% trigger) | 6,807 | 716 | ~1x |

The gated pipeline is cheaper than the fixed full pipeline (which runs 3 agent calls every time), but the cost savings come at the expense of quality. Not a useful tradeoff.

## Recommendation

**Do not use self-assessed confidence as a gate.** No threshold produces acceptable results. The generator is overconfident on exactly the problems where review adds value.

If selective triggering is still a goal, pursue external confidence signals rather than self-report. The most promising direction: a lightweight structural check on the generator output (did it follow the output contract? did it identify a specific root cause vs. listing possibilities?) that could flag outputs needing review without requiring the generator to judge its own work.

The fixed full pipeline remains the recommended configuration for gemini-flash.
