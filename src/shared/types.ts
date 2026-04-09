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

export type PipelineMode = "all" | "gen" | "gated"
export type KbMode = "full" | "none" | "minimal"

export interface TokenUsage {
  promptTokens:     number
  completionTokens: number
}

export interface Trace {
  problemKey:         ProblemKey
  mode:               PipelineMode
  model:              string
  includeKB:          boolean
  kbMode?:            KbMode
  timestamp:          string
  generatorOutput:    string
  criticOutput:       string | null
  arbitratorOutput:   string | null
  confidenceScore?:   number
  confidenceTriggered?: boolean
  usage?:             TokenUsage
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

// ─── Landing Pages ─────────────────────────────────────────────────────────

export interface LandingCopySection {
  headline:            string
  subheadline?:        string
  hero_body?:          string
  primary_cta:         string
  cta_context?:        string
  key_benefits:        string[]
  social_proof?:       string
  secondary_sections?: string[]
}

export interface LandingJudgeScore {
  visitor_emotional_accuracy: { score: number; reasoning: string }
  specificity:                { score: number; reasoning: string }
  mechanism_clarity:          { score: number; reasoning: string }
  cta_awareness_match:        { score: number; reasoning: string }
  interchangeability:         { score: number; reasoning: string }
  overall_score:  number
  verdict:        "WORLD_CLASS" | "COMPETENT" | "GENERIC"
  key_weakness:   string
  key_strength:   string
}

export interface LandingEvalResult {
  product_name:      string
  config:            string
  model:             string
  timestamp:         string
  generated_copy:    string
  judge_score:       LandingJudgeScore | null
  judge_parse_error?: string
}

// ─── Registry ──────────────────────────────────────────────────────────────

export interface RegistryEntry {
  timestamp:        string
  problem:          ProblemKey
  model:            string
  mode:             PipelineMode
  includeKB:        boolean
  kbMode?:          KbMode
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
  confidenceScore?: number
  triggered?:       boolean
  threshold?:       number
  promptTokens?:    number
  completionTokens?: number
}
