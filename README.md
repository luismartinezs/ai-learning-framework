# World-Class AI Pipeline — Code Debug & Optimization

Multi-agent LLM pipeline for expert-level code debugging and optimization.
Uses OpenRouter for cheap, model-agnostic inference.

## Architecture

```
kb/  (markdown knowledge base)
 └─ src/activator.ts   (latent space activator — builds system prompts)
      ├─ Agent 1: Generator    → expert diagnosis
      ├─ Agent 2: Critic       → adversarial challenge
      ├─ Agent 3: Arbitrator   → improved final output
      └─ src/verifier.ts       → code execution + judge scoring
```

## Setup

```bash
# 1. Install deps
bun install

# 2. Configure
cp .env.example .env
# → add OPENROUTER_API_KEY and optionally change MODEL

# 3. Run
bun src/run.ts
```

## Commands

```bash
# Full pipeline: Generator → Critic → Arbitrator → Verify
bun src/run.ts

# Specific problem
bun src/run.ts p002
bun src/run.ts p003

# Generator only (no critic/arbitrator) — useful for ablation
bun src/run.ts p001 --gen

# All problems sequentially
bun src/run.ts --all

# Run pipeline only, save trace manually
bun src/pipeline.ts p001 --save

# Verify a saved trace
bun src/verifier.ts traces/p001_all_2024-01-01T12-00-00.json
bun src/verifier.ts traces/p001_all_2024-01-01T12-00-00.json --agent gen
```

## Problems

| Key  | Type         | Difficulty | Description                        |
|------|--------------|------------|------------------------------------|
| p001 | optimization | medium     | O(n²) list search → set lookup     |
| p002 | bug          | medium     | Mutable default argument mutation  |
| p003 | bug          | hard       | Race condition / lost increments   |

## Knowledge Base

```
kb/
  01_axioms.md                      # First principles of debugging & optimization
  02_failure_library.md             # Root cause taxonomy with reasoning paths
  03_antipatterns_and_exemplars.md  # What mediocre looks like + expert reasoning
  04_structural_layer.md            # Decision trees, complexity reference
  07_learned_patterns.md            # Auto-grows from feedback loop (create manually)
```

## Model swapping

Edit `.env`:
```
MODEL=google/gemini-flash-2.0       # fast, cheap, great at code
MODEL=deepseek/deepseek-chat        # excellent code reasoning
MODEL=anthropic/claude-sonnet-4     # highest quality, higher cost
```

All models go through the same pipeline — easy to benchmark one against another.

## Output

Each run produces two files in `traces/`:
- `{problem}_{mode}_{timestamp}.json`       — full pipeline trace
- `{problem}_{mode}_{timestamp}_eval.json`  — verification scores

## Next steps

- Add problems p004+ of increasing complexity
- Implement feedback loop: eval deltas → KB updates written to `kb/07_learned_patterns.md`
- Run ablation: compare `--gen` vs full pipeline, with/without KB
- Add second domain (logical argumentation) to stress-test the activator
