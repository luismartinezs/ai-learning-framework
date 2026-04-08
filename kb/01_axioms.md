# Axiomatic Layer: First Principles of Code Debugging & Optimization

## What a Bug Actually Is
A bug is a divergence between the **mental model of the programmer** and the **actual behavior of the system**.
This is the root definition. Everything else follows from it.

Corollaries:
- Fixing a bug without updating the mental model guarantees recurrence in a different form
- The most dangerous bugs are those where the mental model is wrong in a way the programmer doesn't know to question
- Symptoms are never the bug. They are the system's observable expression of the divergence.

## What Debugging Actually Is
Debugging is **hypothesis-driven model refinement**. Not searching. Not guessing.

The process:
1. Form a precise, falsifiable hypothesis about where and why the model diverges from reality
2. Design the minimal observation that would falsify it
3. Execute and observe
4. Update the model — whether hypothesis was confirmed or not
5. Repeat until the mental model and system behavior are congruent

The expert debugger's advantage is not speed of execution — it's **quality of hypothesis generation**. They rarely test wrong hypotheses because they reason from structure, not from surface symptoms.

## What Optimization Actually Is
Optimization is **resource allocation under constraints**, applied to a running system.

The constraints are:
- Time (wall clock, CPU)
- Space (memory, disk)
- Complexity (cognitive, architectural)
- Correctness (optimization that breaks behavior is worse than no optimization)

First principles:
- You cannot optimize what you cannot measure. Profiling before optimizing is not optional.
- The bottleneck is the only thing that matters. Optimizing a non-bottleneck produces no improvement.
- The bottleneck shifts after you fix it. Optimization is iterative, not terminal.
- Algorithmic complexity dominates constant factors at scale. O(n log n) beats O(n²) × 0.001 eventually.
- Premature optimization is wrong because it optimizes the wrong thing, not because optimization is bad.

## The Hierarchy of Causation
Bugs and performance problems have causes at multiple levels. Expert diagnosis works from the highest applicable level downward:

1. **Specification error** — the requirements or design are wrong
2. **Algorithmic error** — the approach is correct in specification but wrong in logic
3. **Data model error** — the representation of state is incorrect
4. **Implementation error** — the algorithm is correct but implemented wrongly
5. **Environmental error** — correct code, wrong runtime assumptions (OS, compiler, concurrency)
6. **Integration error** — correct components, wrong interface assumptions

A mediocre debugger starts at level 6 and works up. An expert identifies the level first.

## Invariants as Ground Truth
Any non-trivial system has invariants — properties that must always be true for the system to be correct.

Expert debugging practice:
- Enumerate the invariants the system should maintain
- Find the point where an invariant is first violated (not where the symptom appears)
- The violation point is the actual bug location

The symptom may appear far downstream from the invariant violation. Fixing the symptom without finding the violation is patching, not debugging.

## The Information Theory of Debugging
Each observation you make either reduces or fails to reduce your uncertainty about the bug's location.

Expert principle: **maximize information per observation**. A good debugging step eliminates the largest possible fraction of the hypothesis space. A bad one confirms what you already suspected without ruling anything else out.

Binary search on hypothesis space is the mental model. Every test should cut the remaining space roughly in half.

## Performance Mental Models Every Expert Holds
- **Memory hierarchy**: registers → L1 → L2 → L3 → RAM → disk. Each level is ~10x slower. Cache misses dominate many real workloads.
- **Amdahl's Law**: speedup is bounded by the fraction of work that can't be parallelized.
- **The cost of abstraction**: every abstraction layer has overhead. Most of the time it's worth it. Sometimes it isn't. Know the difference.
- **I/O is almost always the bottleneck** in production systems. Not CPU.
- **Concurrency bugs are a different class**: they are non-deterministic, timing-dependent, and reproduce inconsistently. They require a different mental model (happens-before, memory visibility, race conditions).
