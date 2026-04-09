import { call, MODEL }            from "../shared/client.ts"
import { buildActivator, buildMinimalActivator, buildCriticSystem, buildArbitratorSystem } from "./activator.ts"
import { PROBLEMS }               from "../../domains/code-debugging/problems/index.ts"
import type { Trace, ProblemKey, PipelineMode, KbMode } from "../shared/types.ts"

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  ${title}`)
  console.log("=".repeat(60))
}

function addUsage(trace: Trace, usage: { promptTokens: number; completionTokens: number } | null) {
  if (!usage) return
  if (!trace.usage) trace.usage = { promptTokens: 0, completionTokens: 0 }
  trace.usage.promptTokens += usage.promptTokens
  trace.usage.completionTokens += usage.completionTokens
}

export function parseConfidence(output: string): number {
  const match = output.match(/CONFIDENCE_ASSESSMENT:[\s\S]*?score:\s*(\d+)/i)
  if (!match) return 5
  const score = parseInt(match[1], 10)
  if (score < 1 || score > 10) return 5
  return score
}

export async function runPipeline(
  problemKey: ProblemKey,
  mode: PipelineMode = "all",
  verbose = true,
  includeKB = true,
  model?: string,
  kbMode?: KbMode,
  threshold?: number,
): Promise<Trace> {
  const prob    = PROBLEMS[problemKey]
  const problem = prob.problem

  const resolvedKbMode: KbMode = kbMode ?? (includeKB ? "full" : "none")

  const trace: Trace = {
    problemKey,
    mode,
    model:             model ?? MODEL,
    includeKB,
    kbMode:            resolvedKbMode,
    timestamp:         new Date().toISOString(),
    generatorOutput:   "",
    criticOutput:      null,
    arbitratorOutput:  null,
  }

  // ── Generator ────────────────────────────────────────────────────────────
  if (verbose) section("AGENT 1 — GENERATOR")
  const genSystem = resolvedKbMode === "minimal" ? buildMinimalActivator() : buildActivator(includeKB)
  const gen = await call(genSystem, problem, 2000, model)
  trace.generatorOutput = gen.content
  addUsage(trace, gen.usage)
  if (verbose) console.log(gen.content)

  if (mode === "gen") return trace

  // ── Gated mode: check confidence before proceeding ───────────────────────
  if (mode === "gated" && threshold != null) {
    const confidence = parseConfidence(gen.content)
    trace.confidenceScore = confidence
    if (confidence >= threshold) {
      trace.confidenceTriggered = false
      if (verbose) console.log(`\n  Confidence ${confidence} >= ${threshold}, skipping critic/arbitrator`)
      return trace
    }
    trace.confidenceTriggered = true
    if (verbose) console.log(`\n  Confidence ${confidence} < ${threshold}, triggering critic/arbitrator`)
  }

  // ── Critic ───────────────────────────────────────────────────────────────
  if (verbose) section("AGENT 2 — CRITIC")
  const crit = await call(
    buildCriticSystem(includeKB),
    `Original problem:\n${problem}\n\nDiagnosis to review:\n${gen.content}`,
    1500,
    model,
  )
  trace.criticOutput = crit.content
  addUsage(trace, crit.usage)
  if (verbose) console.log(crit.content)

  // ── Arbitrator ───────────────────────────────────────────────────────────
  if (verbose) section("AGENT 3 — ARBITRATOR")
  const arb = await call(
    buildArbitratorSystem(includeKB),
    `Original problem:\n${problem}\n\n` +
    `Original diagnosis:\n${gen.content}\n\n` +
    `Critique:\n${crit.content}\n\n` +
    `Evaluate the critique and produce your final improved diagnosis.`,
    2000,
    model,
  )
  trace.arbitratorOutput = arb.content
  addUsage(trace, arb.usage)
  if (verbose) console.log(arb.content)

  return trace
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args       = process.argv.slice(2)
  const problemKey = (args[0] as ProblemKey) ?? "p001"
  const mode       = args.includes("--mode")
    ? (args[args.indexOf("--mode") + 1] as PipelineMode)
    : "all"

  if (args.includes("--list")) {
    for (const [k, v] of Object.entries(PROBLEMS)) {
      console.log(`  ${k}  [${v.type}/${v.difficulty}]  ${v.label}`)
    }
    process.exit(0)
  }

  console.log(`Problem: ${problemKey} — ${PROBLEMS[problemKey].label}`)
  console.log(`Mode:    ${mode}`)

  const trace = await runPipeline(problemKey, mode)

  if (args.includes("--save")) {
    const ts   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const path = `traces/${problemKey}_${mode}_${ts}.json`
    await Bun.write(path, JSON.stringify(trace, null, 2))
    console.log(`\nTrace saved → ${path}`)
  }
}
