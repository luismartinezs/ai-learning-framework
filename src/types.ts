// ─── Problem ────────────────────────────────────────────────────────────────

export interface Problem {
  label:       string
  type:        "bug" | "optimization"
  difficulty:  "easy" | "medium" | "hard"
  problem:     string
  groundTruth: Record<string, string>
}

export type ProblemKey = "p001" | "p002" | "p003" | "p004" | "p005" | "p006" | "p007" | "p008"

// ─── Pipeline ───────────────────────────────────────────────────────────────

export type PipelineMode = "all" | "gen"

export interface Trace {
  problemKey:         ProblemKey
  mode:               PipelineMode
  model:              string
  includeKB:          boolean
  timestamp:          string
  generatorOutput:    string
  criticOutput:       string | null
  arbitratorOutput:   string | null
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

export interface CodeVerifyResult {
  status: "passed" | "failed" | "not_implemented"
  stdout?: string
  stderr?: string
}

export interface JudgeScore {
  correctness_score:          number
  correctness_reasoning:      string
  reasoning_quality_score:    number
  reasoning_quality_reasoning: string
  root_cause_identified:      boolean
  correct_fix_proposed:       boolean
  expert_markers_present:     string[]
  mediocre_markers_present:   string[]
  overall_verdict:            "EXPERT" | "COMPETENT" | "MEDIOCRE"
  key_insight:                string
}

export interface EvalResult {
  problemKey:      ProblemKey
  agent:           string
  codeVerify:      CodeVerifyResult
  judgeScore:      JudgeScore | null
  judgeParseError?: string
}

// ─── Registry ──────────────────────────────────────────────────────────────

export interface RegistryEntry {
  timestamp:        string
  problem:          ProblemKey
  model:            string
  mode:             PipelineMode
  includeKB:        boolean
  agent:            string
  codePassed:       boolean | null
  correctness:      number | null
  reasoning:        number | null
  rootCause:        boolean | null
  correctFix:       boolean | null
  verdict:          string | null
  expertMarkers:    number
  mediocreMarkers:  number
  traceFile:        string
}
