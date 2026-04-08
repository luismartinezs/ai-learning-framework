/**
 * ablation.ts — run the full ablation matrix and print summary
 *
 * bun src/ablation.ts              # full matrix: 4 configs x 3 problems x 5 repeats
 * bun src/ablation.ts --repeats 3  # fewer repeats (faster, less precise)
 */
import { runPipeline }  from "./pipeline.ts"
import { evaluate }     from "./verifier.ts"
import { PROBLEMS }     from "./problems.ts"
import { MODEL }        from "./client.ts"
import { buildEntry, appendToRegistry } from "./registry.ts"
import type { ProblemKey, PipelineMode, RegistryEntry } from "./types.ts"

// ── Configuration ────────────────────────────────────────────────────────────

interface AblationConfig {
  label:     string
  mode:      PipelineMode
  includeKB: boolean
}

const CONFIGS: AblationConfig[] = [
  { label: "full+KB", mode: "all", includeKB: true  },
  { label: "full-KB", mode: "all", includeKB: false },
  { label: "gen+KB",  mode: "gen", includeKB: true  },
  { label: "gen-KB",  mode: "gen", includeKB: false },
]

const PROBLEM_KEYS = Object.keys(PROBLEMS) as ProblemKey[]

// ── Helpers ──────────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1))
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

function pad(s: string, w: number): string {
  return s.padEnd(w)
}

function rpad(s: string, w: number): string {
  return s.padStart(w)
}

// ── Single run ───────────────────────────────────────────────────────────────

async function runOne(
  config: AblationConfig,
  problemKey: ProblemKey,
  runIndex: number,
  totalRuns: number,
  currentRun: number,
): Promise<RegistryEntry> {
  console.log(
    `[${currentRun}/${totalRuns}] ${config.label} | ${problemKey} | repeat ${runIndex + 1}`,
  )

  const trace = await runPipeline(problemKey, config.mode, false, config.includeKB)

  // Save trace
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const tracePath = `traces/${problemKey}_${config.mode}_kb${config.includeKB ? "1" : "0"}_${ts}.json`
  await Bun.write(tracePath, JSON.stringify(trace, null, 2))

  // Evaluate
  const agent = config.mode === "all" ? "arbitrator" : "generator"
  const result = await evaluate(trace, agent)

  const evalPath = tracePath.replace(".json", "_eval.json")
  await Bun.write(evalPath, JSON.stringify(result, null, 2))

  // Registry
  const entry = buildEntry(trace, result, tracePath)
  await appendToRegistry(entry)

  const verdict = entry.verdict ?? "PARSE_ERR"
  const corr = entry.correctness !== null ? `${entry.correctness}/10` : "?"
  console.log(`  → ${verdict} correctness=${corr}\n`)

  return entry
}

// ── Summary ──────────────────────────────────────────────────────────────────

function printSummary(entries: RegistryEntry[]) {
  const line = "─".repeat(82)

  console.log(`\n${"═".repeat(82)}`)
  console.log("  ABLATION RESULTS")
  console.log(`${"═".repeat(82)}\n`)
  console.log(`  Model: ${MODEL}`)
  console.log(`  Runs:  ${entries.length}\n`)

  // Per-problem breakdown
  console.log(
    pad("Config", 10) +
    pad("Problem", 9) +
    rpad("Correct", 14) +
    rpad("Reason", 14) +
    rpad("Pass", 6) +
    rpad("Verdicts", 14),
  )
  console.log(line)

  for (const config of CONFIGS) {
    for (const pk of PROBLEM_KEYS) {
      const rows = entries.filter(
        (e) => e.mode === config.mode && e.includeKB === config.includeKB && e.problem === pk,
      )
      const corrs = rows.map((r) => r.correctness).filter((c): c is number => c !== null)
      const reasons = rows.map((r) => r.reasoning).filter((r): r is number => r !== null)
      const passed = rows.filter((r) => r.codePassed === true).length
      const expert = rows.filter((r) => r.verdict === "EXPERT").length
      const competent = rows.filter((r) => r.verdict === "COMPETENT").length
      const mediocre = rows.filter((r) => r.verdict === "MEDIOCRE").length

      const corrStr = corrs.length ? `${fmt(mean(corrs))} ± ${fmt(stddev(corrs))}` : "n/a"
      const reasonStr = reasons.length ? `${fmt(mean(reasons))} ± ${fmt(stddev(reasons))}` : "n/a"
      const passStr = `${passed}/${rows.length}`
      const verdictStr = `${expert}E ${competent}C ${mediocre}M`

      console.log(
        pad(config.label, 10) +
        pad(pk, 9) +
        rpad(corrStr, 14) +
        rpad(reasonStr, 14) +
        rpad(passStr, 6) +
        rpad(verdictStr, 14),
      )
    }
    console.log(line)
  }

  // Aggregated per-config
  console.log(`\n${"═".repeat(82)}`)
  console.log("  AGGREGATED BY CONFIG")
  console.log(`${"═".repeat(82)}\n`)

  console.log(
    pad("Config", 10) +
    rpad("Correctness", 16) +
    rpad("Reasoning", 16) +
    rpad("Pass Rate", 11) +
    rpad("Expert Rate", 13),
  )
  console.log(line)

  for (const config of CONFIGS) {
    const rows = entries.filter(
      (e) => e.mode === config.mode && e.includeKB === config.includeKB,
    )
    const corrs = rows.map((r) => r.correctness).filter((c): c is number => c !== null)
    const reasons = rows.map((r) => r.reasoning).filter((r): r is number => r !== null)
    const passRate = rows.length
      ? (rows.filter((r) => r.codePassed === true).length / rows.length) * 100
      : 0
    const expertRate = rows.length
      ? (rows.filter((r) => r.verdict === "EXPERT").length / rows.length) * 100
      : 0

    console.log(
      pad(config.label, 10) +
      rpad(corrs.length ? `${fmt(mean(corrs))} ± ${fmt(stddev(corrs))}` : "n/a", 16) +
      rpad(reasons.length ? `${fmt(mean(reasons))} ± ${fmt(stddev(reasons))}` : "n/a", 16) +
      rpad(`${fmt(passRate, 0)}%`, 11) +
      rpad(`${fmt(expertRate, 0)}%`, 13),
    )
  }

  console.log(line)
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!process.env.OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set.")
  process.exit(1)
}

const args = process.argv.slice(2)
const repeatsIdx = args.indexOf("--repeats")
const REPEATS = repeatsIdx >= 0 ? parseInt(args[repeatsIdx + 1], 10) : 5

const totalRuns = CONFIGS.length * PROBLEM_KEYS.length * REPEATS
console.log(`\nAblation matrix: ${CONFIGS.length} configs × ${PROBLEM_KEYS.length} problems × ${REPEATS} repeats = ${totalRuns} runs`)
console.log(`Model: ${MODEL}\n`)

const collected: RegistryEntry[] = []
let current = 0

for (const config of CONFIGS) {
  for (const pk of PROBLEM_KEYS) {
    for (let r = 0; r < REPEATS; r++) {
      current++
      const entry = await runOne(config, pk, r, totalRuns, current)
      collected.push(entry)
    }
  }
}

printSummary(collected)
