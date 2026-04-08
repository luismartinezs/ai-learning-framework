import type { EvalResult, Trace, RegistryEntry } from "./types.ts"

const REGISTRY_PATH = "traces/registry.jsonl"

export function buildEntry(trace: Trace, eval_: EvalResult, traceFile: string): RegistryEntry {
  const s = eval_.judgeScore
  return {
    timestamp:       trace.timestamp,
    problem:         trace.problemKey,
    model:           trace.model,
    mode:            trace.mode,
    includeKB:       trace.includeKB,
    agent:           eval_.agent,
    codePassed:      eval_.codeVerify.status === "not_implemented" ? null : eval_.codeVerify.status === "passed",
    correctness:     s?.correctness_score ?? null,
    reasoning:       s?.reasoning_quality_score ?? null,
    rootCause:       s?.root_cause_identified ?? null,
    correctFix:      s?.correct_fix_proposed ?? null,
    verdict:         s?.overall_verdict ?? null,
    expertMarkers:   s?.expert_markers_present.length ?? 0,
    mediocreMarkers: s?.mediocre_markers_present.length ?? 0,
    traceFile,
  }
}

export async function appendToRegistry(entry: RegistryEntry): Promise<void> {
  const line = JSON.stringify(entry) + "\n"
  const file = Bun.file(REGISTRY_PATH)

  if (await file.exists()) {
    const existing = await file.text()
    await Bun.write(REGISTRY_PATH, existing + line)
  } else {
    await Bun.write(REGISTRY_PATH, line)
  }
}

export async function readRegistry(): Promise<RegistryEntry[]> {
  const file = Bun.file(REGISTRY_PATH)
  if (!(await file.exists())) return []
  const text = await file.text()
  return text.trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
}
