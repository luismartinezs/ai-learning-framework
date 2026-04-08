# OpenRouter Model Shortlist

Researched 2026-04-08 from OpenRouter API. Prices change, re-check periodically.

Pipeline makes ~4 LLM calls per full run (gen + critic + arb + judge), ~25K input tokens each.

## Cheap tier (workhorse, < $0.02/run)

| Model ID | In/1M | Out/1M | ~Cost/run | Notes |
|----------|--------|---------|-----------|-------|
| `qwen/qwen3.5-flash-02-23` | $0.065 | $0.26 | ~$0.009 | Cheapest viable. 1M ctx. |
| `google/gemini-2.0-flash-001` | $0.10 | $0.40 | ~$0.013 | Current default. Scored 10/10 on p001-p003. |
| `qwen/qwen3-coder-next` | $0.12 | $0.75 | ~$0.018 | Code-specialized. 262K ctx. |
| `deepseek/deepseek-chat-v3.1` | $0.15 | $0.75 | ~$0.021 | Strong code reasoning. |

## Mid tier (~$0.05/run)

| Model ID | In/1M | Out/1M | ~Cost/run | Notes |
|----------|--------|---------|-----------|-------|
| `google/gemini-2.5-flash` | $0.30 | $2.50 | ~$0.05 | Better reasoning than 2.0. |

## Reasoning tier (~$0.09/run)

| Model ID | In/1M | Out/1M | ~Cost/run | Notes |
|----------|--------|---------|-----------|-------|
| `deepseek/deepseek-r1` | $0.70 | $2.50 | ~$0.09 | Dedicated reasoning model. Best for hard problems. |

## Quality ceiling (~$0.42/run)

| Model ID | In/1M | Out/1M | ~Cost/run | Notes |
|----------|--------|---------|-----------|-------|
| `anthropic/claude-sonnet-4` | $3.00 | $15.00 | ~$0.42 | Run sparingly as quality benchmark. |

## Full ablation cost (3 problems x 5 runs x 2 modes = 30 runs per model)

- Cheap tier: $0.27 - $0.63
- Mid tier: ~$1.50
- Reasoning tier: ~$2.70
- Ceiling: ~$12.60

## Key experiment

Does `qwen3-coder-next` (code-specialized, cheap) beat `gemini-2.0-flash` (generalist, cheap)? Answer reveals whether domain-specialized models or the KB scaffold is doing more work.
