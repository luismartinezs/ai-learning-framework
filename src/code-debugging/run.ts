/**
 * run.ts — full pipeline + verification in one command
 *
 * bun src/code-debugging/run.ts               # p001, all agents, then verify
 * bun src/code-debugging/run.ts p002          # different problem
 * bun src/code-debugging/run.ts p003 --gen    # generator only (no critic/arb)
 * bun src/code-debugging/run.ts --all         # all 3 problems sequentially
 */
import { runPipeline }  from "./pipeline.ts"
import { evaluate }     from "./verifier.ts"
import { PROBLEMS }     from "../../domains/code-debugging/problems/index.ts"
import { buildEntry, appendToRegistry } from "../shared/registry.ts"
import type { ProblemKey, PipelineMode } from "../shared/types.ts"

async function runAndVerify(problemKey: ProblemKey, mode: PipelineMode) {
  console.log(`\n${"#".repeat(60)}`)
  console.log(`  PROBLEM:  ${problemKey} — ${PROBLEMS[problemKey].label}`)
  console.log(`  TYPE:     ${PROBLEMS[problemKey].type} / ${PROBLEMS[problemKey].difficulty}`)
  console.log("#".repeat(60))

  // Run pipeline
  const trace = await runPipeline(problemKey, mode)

  // Save trace
  const ts        = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const tracePath = `traces/${problemKey}_${mode}_${ts}.json`
  await Bun.write(tracePath, JSON.stringify(trace, null, 2))
  console.log(`\nTrace  → ${tracePath}`)

  // Verify
  const agent  = mode === "all" ? "arbitrator" : "generator"
  const result = await evaluate(trace, agent)

  const evalPath = tracePath.replace(".json", "_eval.json")
  await Bun.write(evalPath, JSON.stringify(result, null, 2))
  console.log(`Eval   → ${evalPath}`)

  // Append to persistent registry
  const entry = buildEntry(trace, result, tracePath)
  await appendToRegistry(entry)
  console.log(`Registry ← ${entry.problem} ${entry.model} ${entry.verdict ?? "NO_SCORE"}`)

  return { trace, result }
}

// ── main ──────────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2)
const runAll     = args.includes("--all")
const mode: PipelineMode = args.includes("--gen") ? "gen" : "all"
const problemKey = (args.find(a => a.startsWith("p0")) as ProblemKey) ?? "p001"

if (!process.env.OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set.")
  console.error("  cp .env.example .env  →  add your key  →  source .env")
  process.exit(1)
}

if (runAll) {
  for (const key of Object.keys(PROBLEMS) as ProblemKey[]) {
    await runAndVerify(key, mode)
  }
} else {
  await runAndVerify(problemKey, mode)
}
