# Anti-Pattern Library: What Mediocre Looks Like and Why

## Anti-Pattern 1: Symptom-First Debugging
**What it looks like:** Developer sees the error message and immediately searches for that exact error string online. Applies the first fix that matches.  
**Why it's wrong:** Error messages describe the symptom, not the cause. The same symptom can have dozens of different root causes. Applying a fix without understanding the cause means you don't know if your fix is correct, and you'll encounter the same class of bug again.  
**Expert alternative:** Use the error as a pointer to *where* the system detected a problem, then reason backwards to *what* caused that state.

## Anti-Pattern 2: Shotgun Debugging
**What it looks like:** Making multiple changes simultaneously to "see if it fixes it." Commenting things out randomly. Trying every suggested fix from Stack Overflow sequentially.  
**Why it's wrong:** Even if it works, you don't know *which* change fixed it or *why*. You've learned nothing. The bug is likely to recur in a different form. You may have introduced new bugs in the changes that didn't fix anything.  
**Expert alternative:** One hypothesis, one change, one observation. Every step must be designed to produce information.

## Anti-Pattern 3: Optimizing Without Profiling
**What it looks like:** "This part of the code looks slow so I'll optimize it." Replacing readable code with clever micro-optimizations. Caching results of a function that isn't the bottleneck.  
**Why it's wrong:** Human intuition about performance is wrong most of the time. The bottleneck is almost never where you think it is. You spend effort on code that doesn't matter while the real problem remains.  
**Expert alternative:** Profile first. Let the data identify the bottleneck. Optimize exactly that. Measure the result.

## Anti-Pattern 4: Cargo-Cult Performance Patterns
**What it looks like:** "I heard you should always use StringBuilder." "Avoid virtual functions for performance." "Use bit operations instead of arithmetic."  
**Why it's wrong:** Performance patterns are context-dependent. They apply under specific conditions that may not hold in your system. Applying them without measurement is as likely to make things worse as better.  
**Expert alternative:** Understand *why* a pattern improves performance (what resource it conserves, what overhead it eliminates). Then verify whether that resource/overhead is actually the constraint in your specific case.

## Anti-Pattern 5: Adding Complexity to Fix Complexity
**What it looks like:** Adding caching to a system that's slow because of bad architecture. Adding more threads to fix a problem caused by thread contention. Adding retry logic to hide a bug.  
**Why it's wrong:** Complexity added to patch another complexity compounds the total system complexity. Each layer of this makes the system harder to reason about and easier to break.  
**Expert alternative:** Remove complexity first. Most performance problems are caused by doing more work than necessary, not by doing necessary work inefficiently.

## Anti-Pattern 6: Local Optimization, Global Regression
**What it looks like:** Making one function faster while ignoring its effect on the system. Reducing memory in one component while causing another to work harder. Parallelizing work that creates contention downstream.  
**Why it's wrong:** Systems have emergent behavior. Local changes have global effects. Optimization that improves one metric while degrading another is not an improvement.  
**Expert alternative:** Define the system-level metric before optimizing. Measure the system-level metric after every change.

---

# Expert Reasoning Exemplars

## Exemplar 1: The Expert's Approach to an Unfamiliar Bug

*Scenario: A function returns wrong results intermittently under load.*

**Mediocre approach:** Add logging everywhere, run it a bunch of times, try to catch it, apply guesses.

**Expert internal reasoning:**
> "Intermittent under load but not in isolation immediately points to concurrency or timing. The question is: what shared state does this function touch? Let me enumerate. It reads from a shared cache and writes to a result accumulator. Is the cache access synchronized? Is the accumulator being mutated by multiple threads? Let me construct the minimal scenario that would produce a race — two threads interleaving at the specific point where the cache is read and then written. If I can construct that scenario, I can verify it deterministically. Then the fix is structurally about ownership, not about adding locks in random places."

**Why this is different:** The expert never searches randomly. Every thought narrows the hypothesis space by reasoning from the first principle (intermittent under load = concurrency) to a specific, testable prediction.

---

## Exemplar 2: The Expert's Approach to Performance Degradation

*Scenario: A data processing job that took 2 minutes last month now takes 45 minutes.*

**Mediocre approach:** "We have more data now, it's probably fine." Or: start optimizing the most complex-looking code.

**Expert internal reasoning:**
> "45 minutes vs 2 minutes is a 22x slowdown. What changed? Data volume is one candidate — if the algorithm has a super-linear complexity, 10x more data could produce 100x more runtime. Let me check the data volume change first. If data grew 10x, that matches quadratic complexity. Now which part of the pipeline is quadratic? Let me profile the current run to find which function accounts for most of the time. Then I'll look at its structure. If data grew less than 10x but performance degraded 22x, there's something else — a new code path, a changed dependency, an infrastructure change. I'll check the git log and deployment history for that period."

**Why this is different:** The expert uses the numbers to constrain the hypothesis space before profiling. A 22x slowdown has a small set of explanations. They reason to the right experiment rather than fishing.

---

## Exemplar 3: Knowing When to Stop Optimizing

*Scenario: After two rounds of optimization, the job now takes 4 minutes. Target was under 5 minutes.*

**Mediocre approach:** Keep optimizing because there's always room to improve.

**Expert internal reasoning:**
> "We've hit the target. The remaining bottleneck is network I/O which is bounded by our bandwidth — we're already saturating it. Further optimization would require either architectural changes (different data locality model) or infrastructure changes (more bandwidth). The cost of either exceeds the value of the remaining 4 minutes. The next constraint is the downstream consumer which only processes results every 10 minutes anyway. Actual user-experienced improvement from further optimization: zero. Stop here."

**Why this is different:** The expert models the full system including constraints that are outside the code. Optimization stops when the constraint shifts outside the optimizable boundary, not when the code "looks clean."
