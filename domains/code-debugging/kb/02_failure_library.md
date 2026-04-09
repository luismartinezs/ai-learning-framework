# Failure Library: Root Cause Taxonomy

## How to Use This Library
Each failure class has:
- What the symptom looks like
- What the actual cause is (not the same thing)
- The expert's reasoning path to identify it
- The correct fix vs. the common wrong fix

---

## Class 1: Off-By-One Errors
**Symptom:** Array index out of bounds, fence-post miscount, loop executing one too many or few times  
**Root cause:** Confusion between inclusive/exclusive bounds, zero vs one indexing, or loop termination condition  
**Expert reasoning path:** Trace the loop/index with a minimal case (n=1, n=2). The error will be visible. Then generalize.  
**Correct fix:** Establish a clear invariant for what the index means at each loop stage and enforce it consistently  
**Wrong fix:** Adding +1 or -1 until tests pass — this patches one case while hiding the logical error  

---

## Class 2: Null / Undefined Reference
**Symptom:** NullPointerException, TypeError, segfault  
**Root cause:** Assumption that a reference is valid when it may not be — missing initialization, premature deallocation, or unhandled empty return  
**Expert reasoning path:** Where could this reference have become null? Trace backwards from the access point to every assignment. Find the path that wasn't covered.  
**Correct fix:** Make nullability explicit and handle it at the boundary where it can occur, not scattered throughout  
**Wrong fix:** Null checks everywhere — this suppresses the symptom and hides which code path is actually wrong  

---

## Class 3: Concurrency / Race Condition
**Symptom:** Non-deterministic failures, works in single-thread mode, fails under load or intermittently  
**Root cause:** Shared mutable state accessed by multiple threads without correct synchronization, or incorrect assumptions about operation atomicity  
**Expert reasoning path:** Identify all shared mutable state. For each: who reads it, who writes it, is there a happens-before guarantee between them?  
**Correct fix:** Either eliminate sharing (immutability, message passing) or enforce correct synchronization at the point of shared access  
**Wrong fix:** Adding sleep() calls, reducing thread count, or retrying on failure — these change the timing without fixing the race  

---

## Class 4: Memory Leak
**Symptom:** Steadily growing memory consumption, eventual OOM crash  
**Root cause:** Allocated resources not released — references held longer than necessary, event listeners not removed, caches without eviction  
**Expert reasoning path:** Profile allocation over time, identify which object type is growing, trace who holds references to it and why they're not released  
**Correct fix:** Fix the ownership model — make clear who is responsible for releasing each resource and enforce it structurally (RAII, try-finally, weak references)  
**Wrong fix:** Periodic process restart, increasing memory limits — the leak is still there  

---

## Class 5: Algorithmic Complexity Regression
**Symptom:** Acceptable performance at small scale, catastrophic degradation at scale  
**Root cause:** O(n²) or worse algorithm where linear or logarithmic is achievable — often nested loops, repeated linear searches, or quadratic string concatenation  
**Expert reasoning path:** Identify the loop structure. For each nested loop, ask: does the inner loop's size depend on the outer loop's input size? If yes, you have at least O(n²).  
**Correct fix:** Redesign the algorithm — use a hash map instead of linear search, sort once instead of repeatedly, use dynamic programming to eliminate recomputation  
**Wrong fix:** Hardware upgrade, caching results of the slow algorithm — the algorithm is still wrong  

---

## Class 6: State Mutation Bug
**Symptom:** Correct behavior on first call, wrong behavior on subsequent calls; tests pass in isolation but fail when run together  
**Root cause:** Shared mutable state not reset between uses — global variables, class-level state, mutable default arguments  
**Expert reasoning path:** Make the function deterministic by calling it twice with the same input. If results differ, something is being mutated between calls. Find what.  
**Correct fix:** Eliminate shared state or make reset explicit and guaranteed  
**Wrong fix:** Running tests in a fixed order, clearing specific known state variables — leaves other mutations undiscovered  

---

## Class 7: Wrong Abstraction Level Fix
**Symptom:** Bug seems to reappear in different forms after fixes, or fix requires touching many places  
**Root cause:** The fix was applied at the wrong level of abstraction — patching manifestations of a deeper design error  
**Expert reasoning path:** If fixing this requires more than one change, or if you've fixed similar issues more than twice, the bug is in the abstraction, not the code  
**Correct fix:** Fix at the level where the invariant is actually violated — often this means refactoring the abstraction itself  
**Wrong fix:** Adding yet another special case, flag, or conditional  

---

## Class 8: Incorrect Assumption About External System
**Symptom:** Correct in local/test environment, fails in production; intermittent failures correlated with external dependency  
**Root cause:** Assumption about external system behavior that doesn't hold — API response format, timing guarantees, ordering guarantees, error modes  
**Expert reasoning path:** List every assumption the code makes about the external system. Which of these are documented? Which are tested? Which are assumed?  
**Correct fix:** Make the assumption explicit, verify it at the boundary, handle the case where it doesn't hold  
**Wrong fix:** Retry logic without understanding why it fails — often masks a real problem while adding latency  
