import { call, MODEL }            from "./client.ts"
import { buildActivator, buildCriticSystem, buildArbitratorSystem } from "./activator.ts"
import { PROBLEMS }               from "./problems.ts"
import type { Trace, ProblemKey, PipelineMode } from "./types.ts"

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  ${title}`)
  console.log("=".repeat(60))
}

export async function runPipeline(
  problemKey: ProblemKey,
  mode: PipelineMode = "all",
  verbose = true,
  includeKB = true,
): Promise<Trace> {
  const prob    = PROBLEMS[problemKey]
  const problem = prob.problem

  const trace: Trace = {
    problemKey,
    mode,
    model:             MODEL,
    includeKB,
    timestamp:         new Date().toISOString(),
    generatorOutput:   "",
    criticOutput:      null,
    arbitratorOutput:  null,
  }

  // ── Generator ────────────────────────────────────────────────────────────
  if (verbose) section("AGENT 1 — GENERATOR")
  const genOut = await call(buildActivator(includeKB), problem)
  trace.generatorOutput = genOut
  if (verbose) console.log(genOut)

  if (mode === "gen") return trace

  // ── Critic ───────────────────────────────────────────────────────────────
  if (verbose) section("AGENT 2 — CRITIC")
  const critOut = await call(
    buildCriticSystem(includeKB),
    `Original problem:\n${problem}\n\nDiagnosis to review:\n${genOut}`,
    1500,
  )
  trace.criticOutput = critOut
  if (verbose) console.log(critOut)

  // ── Arbitrator ───────────────────────────────────────────────────────────
  if (verbose) section("AGENT 3 — ARBITRATOR")
  const arbOut = await call(
    buildArbitratorSystem(includeKB),
    `Original problem:\n${problem}\n\n` +
    `Original diagnosis:\n${genOut}\n\n` +
    `Critique:\n${critOut}\n\n` +
    `Evaluate the critique and produce your final improved diagnosis.`,
  )
  trace.arbitratorOutput = arbOut
  if (verbose) console.log(arbOut)

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
