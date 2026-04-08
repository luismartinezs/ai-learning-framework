# KB Diagnosis: Format vs Content Interference

Does the KB's net-negative effect come from the structured output contract (format)
or from the KB content itself?

## Method

Three generator-only configs compared:
- **gen-KB**: bare model, no KB, no output contract
- **gen+KB**: full KB + structured output contract (CLASSIFICATION | HYPOTHESIS | ...)
- **gen-minimal**: same KB knowledge as natural prose, no output contract or structured format

If gen-minimal scores closer to gen-KB than gen+KB: format is the problem.
If gen-minimal still scores below gen-KB: the KB content itself interferes.
If gen-minimal scores above both: current KB structure is doubly wrong.

## gemini-2.0-flash

| Problem | gen-KB | gen+KB | gen-minimal | Interpretation |
|---------|--------|--------|-------------|----------------|
| p001 | 10.00 (100%E, n=10) | 10.00 (100%E, n=10) | 10.00 (100%E, n=5) | Minimal wins both: structure hurts |
| p002 | 9.40 (80%E, n=10) | 6.70 (40%E, n=10) | 5.00 (20%E, n=5) | Closer to full KB: content interferes |
| p003 | 10.00 (100%E, n=10) | 10.00 (100%E, n=10) | 10.00 (100%E, n=5) | Minimal wins both: structure hurts |
| p004 | 10.00 (100%E, n=5) | 9.60 (80%E, n=5) | 10.00 (100%E, n=5) | Minimal wins both: structure hurts |
| p005 | 10.00 (100%E, n=5) | 10.00 (100%E, n=5) | 10.00 (100%E, n=5) | Minimal wins both: structure hurts |
| p006 | 8.60 (60%E, n=5) | 6.20 (20%E, n=5) | 9.60 (80%E, n=5) | Minimal wins both: structure hurts |
| p007 | 8.40 (60%E, n=5) | 9.00 (80%E, n=5) | 7.80 (60%E, n=5) | Closer to bare: format is the problem |
| p008 | 9.00 (80%E, n=5) | 10.00 (100%E, n=5) | 7.60 (60%E, n=5) | Closer to bare: format is the problem |

**Aggregated:**

| Config | Correctness | Expert Rate | Runs |
|--------|-------------|-------------|------|
| gen-KB | 9.53 | 87% | 55 |
| gen+KB | 8.93 | 78% | 55 |
| gen-minimal | 8.75 | 78% | 40 |

## qwen3-coder-next

| Problem | gen-KB | gen+KB | gen-minimal | Interpretation |
|---------|--------|--------|-------------|----------------|
| p001 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | Minimal wins both: structure hurts |
| p002 | 9.00 (100%E, n=3) | 10.00 (100%E, n=3) | 8.33 (67%E, n=3) | Closer to bare: format is the problem |
| p003 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | Minimal wins both: structure hurts |
| p004 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | Minimal wins both: structure hurts |
| p005 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | Minimal wins both: structure hurts |
| p006 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | n/a |  |
| p007 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | n/a |  |
| p008 | 10.00 (100%E, n=3) | 10.00 (100%E, n=3) | n/a |  |

**Aggregated:**

| Config | Correctness | Expert Rate | Runs |
|--------|-------------|-------------|------|
| gen-KB | 9.88 | 100% | 24 |
| gen+KB | 10.00 | 100% | 24 |
| gen-minimal | 9.67 | 93% | 15 |

## Conclusion

Aggregate scores (across all models with minimal data):
- gen-KB (bare): correctness 9.63, expert rate 91%
- gen+KB (full scaffold): correctness 9.25, expert rate 85%
- gen-minimal (prose KB, no format): correctness 9.00, expert rate 82%

**Verdict: Content interference.** The minimal prose activator scores closer to the
full structured KB than to the bare model. Removing the output contract did not recover
performance. The KB content itself interferes with the model's native reasoning,
regardless of how it is presented.

