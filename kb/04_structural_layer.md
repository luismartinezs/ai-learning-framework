# Structural Layer: From Principles to Practice

## The Debugging Decision Tree

When encountering any bug, the expert navigates this structure:

```
1. CLASSIFY THE BUG TYPE
   ├── Deterministic (same input → same wrong output)
   │   ├── Logic error → reason about the algorithm
   │   ├── Data error → examine the input and state
   │   └── Interface error → examine the contract between components
   └── Non-deterministic (same input → sometimes wrong output)
       ├── Concurrency → reason about interleaving and shared state
       ├── Timing → reason about external dependencies and timeouts
       └── Environmental → reason about resource exhaustion, OS, hardware

2. IDENTIFY THE CAUSATION LEVEL (from 01_axioms.md)

3. FORM THE MINIMAL FALSIFIABLE HYPOTHESIS
   → "The bug is at LINE/FUNCTION X because REASON Y"
   → "I can verify this by OBSERVATION Z"

4. DESIGN THE MINIMAL REPRODUCTION
   → Smallest input that triggers the bug
   → If you can't reproduce it, you can't verify your fix

5. FIX AT THE ROOT, NOT THE SYMPTOM
   → The fix should make an invariant hold, not suppress a symptom

6. VERIFY THE FIX IS CORRECT, NOT JUST WORKING
   → Does the fix address the root cause?
   → Does it break any other invariants?
   → Is there a simpler fix that's equivalent?
```

---

## The Optimization Decision Tree

```
1. DO YOU HAVE A MEASURED PERFORMANCE PROBLEM?
   No → Stop. Don't optimize.
   Yes → Continue.

2. PROFILE THE ACTUAL BOTTLENECK
   → CPU-bound: where is time spent?
   → Memory-bound: what is being allocated?
   → I/O-bound: what is waiting?
   → Concurrency-bound: what is blocked?

3. IS THE BOTTLENECK IN YOUR CODE OR IN YOUR ARCHITECTURE?
   Architecture → optimization won't help much; redesign is needed
   Code → continue

4. WHAT IS THE ALGORITHMIC COMPLEXITY?
   Can it be reduced? → Reduce it first, before micro-optimizing
   Already optimal → continue

5. WHAT IS THE CONSTANT FACTOR?
   → Cache misses? Improve data locality.
   → Unnecessary allocations? Reduce them.
   → Repeated computation? Cache or precompute.
   → Unnecessary I/O? Batch or eliminate.

6. IMPLEMENT THE MINIMAL CHANGE
   → Measure before and after
   → Did it improve the target metric?
   → Did it regress anything else?
   → Repeat from step 2 (the bottleneck has shifted)
```

---

## Invariants by System Type

These are the load-bearing invariants that experts verify first in common system types.

### Data Processing Pipelines
- Input data volume × transformation complexity ≤ available resources
- Output is deterministic given same input (unless explicitly non-deterministic)
- Partial failures leave the system in a recoverable state (no partial writes that corrupt)
- Throughput scales linearly with parallelism (if not, there's a bottleneck or coordination overhead)

### Web / API Services
- Response time distribution (p50, p95, p99) — not just average
- Error rate under load ≠ error rate at low traffic
- State is never shared between requests unless explicitly designed to be
- Timeouts exist on all external calls

### Concurrent / Parallel Systems
- No data races on shared mutable state
- No deadlock: lock ordering is consistent across all code paths
- No livelock: progress is guaranteed under contention
- Memory visibility: writes by one thread are visible to readers on other threads when required

### Recursive Algorithms
- Base case is always reached (termination)
- Each recursive call makes progress toward the base case
- Stack depth is bounded by input size × constant factor

---

## Complexity Reference (Expert's Mental Map)

| Operation | Complexity | When it becomes a problem |
|---|---|---|
| Hash map lookup | O(1) | Rarely — watch for hash collisions |
| Array index access | O(1) | Never |
| Sorted array binary search | O(log n) | Rarely |
| Unsorted array search | O(n) | When n > ~10k and called frequently |
| Nested loop over same collection | O(n²) | When n > ~1k |
| Naive string concatenation in loop | O(n²) | When n > ~100 |
| Sorting | O(n log n) | When n > ~1M and called frequently |
| Recursive without memoization | O(2ⁿ) | Almost always — exponential is almost always wrong |

---

## Common Language-Specific Failure Points

### Python
- Mutable default arguments (`def f(x=[])`) — shared across all calls
- Integer division vs float division (`//` vs `/`)
- Late binding closures in loops
- GIL limiting CPU parallelism — threads don't parallelize CPU-bound work
- Generator exhaustion — iterating a generator twice

### JavaScript / TypeScript
- `==` vs `===` coercion
- `this` binding in callbacks and event handlers
- Promise rejection without `.catch()` — silent failure
- Async/await with `forEach` — async callbacks in forEach are not awaited
- Closure over loop variable with `var` (vs `let`)

### General (Language-Agnostic)
- Integer overflow — especially in languages without arbitrary precision
- Floating point comparison (`0.1 + 0.2 !== 0.3`)
- Timezone handling — store UTC, display local
- Encoding assumptions — always specify, never assume
