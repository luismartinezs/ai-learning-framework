/**
 * confidence_gate.ts — confidence-gated multi-agent ablation
 *
 * Tests whether the generator's self-assessed confidence can reliably
 * gate the critic/arbitrator, reducing cost while maintaining quality.
 *
 * bun src/confidence_gate.ts                    # full run: 3 thresholds x 8 problems x 5 repeats
 * bun src/confidence_gate.ts --repeats 3        # fewer repeats
 * bun src/confidence_gate.ts --threshold 8      # single threshold
 * bun src/confidence_gate.ts --concurrency 10   # parallel workers (default: 8)
 */
import { runPipeline }                   from "./pipeline.ts"
import { evaluate }                      from "./verifier.ts"
import { PROBLEMS }                      from "./problems.ts"
import { MODEL }                         from "./client.ts"
import { buildEntry, appendToRegistry, readRegistry } from "./registry.ts"
import type { ProblemKey, RegistryEntry } from "./types.ts"

// ── Configuration ────────────────────────────────────────────────────────────

const THRESHOLDS = [7, 8, 9]
const ALL_PROBLEMS = Object.keys(PROBLEMS) as ProblemKey[]

// ── Helpers ──────────────────────────────────────────────────────────────────

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const fmt = (n: number, d = 1) => n.toFixed(d)
const pad = (s: string, w: number) => s.padEnd(w)
const rpad = (s: string, w: number) => s.padStart(w)

// ── Single run ───────────────────────────────────────────────────────────────

async function runOne(
  threshold: number,
  problemKey: ProblemKey,
  current: number,
  total: number,
): Promise<RegistryEntry> {
  console.log(`[${current}/${total}] threshold=${threshold} | ${problemKey}`)

  const trace = await runPipeline(
    problemKey,
    "gated",
    false,     // verbose
    true,      // includeKB
    undefined, // model (use default = gemini-flash)
    undefined, // kbMode
    threshold,
  )

  // Save trace
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const triggered = trace.confidenceTriggered ? "T" : "S"  // Triggered or Skipped
  const tracePath = `traces/${problemKey}_gated_t${threshold}_${triggered}_${ts}.json`
  await Bun.write(tracePath, JSON.stringify(trace, null, 2))

  // Evaluate: use arbitrator output if critic/arbitrator ran, else generator
  const agent = trace.confidenceTriggered ? "arbitrator" : "generator"
  const result = await evaluate(trace, agent)

  const evalPath = tracePath.replace(".json", "_eval.json")
  await Bun.write(evalPath, JSON.stringify(result, null, 2))

  // Registry
  const entry = buildEntry(trace, result, tracePath, threshold)
  await appendToRegistry(entry)

  const verdict = entry.verdict ?? "PARSE_ERR"
  const corr = entry.correctness !== null ? `${entry.correctness}/10` : "?"
  const conf = trace.confidenceScore ?? "?"
  const trig = trace.confidenceTriggered ? "TRIGGERED" : "SKIPPED"
  console.log(`  → ${verdict} correctness=${corr} confidence=${conf} ${trig}\n`)

  return entry
}

// ── Summary ──────────────────────────────────────────────────────────────────

function printSummary(
  gatedEntries: RegistryEntry[],
  baselineEntries: RegistryEntry[],
  thresholds: number[],
) {
  const line = "─".repeat(90)

  console.log(`\n${"═".repeat(90)}`)
  console.log("  CONFIDENCE GATE RESULTS")
  console.log(`${"═".repeat(90)}\n`)

  // Baseline stats
  const baseCorrs = baselineEntries.map(r => r.correctness).filter((c): c is number => c !== null)
  const baseExpRate = baselineEntries.length
    ? (baselineEntries.filter(r => r.verdict === "EXPERT").length / baselineEntries.length * 100)
    : 0
  const baseCorr = baseCorrs.length ? mean(baseCorrs) : 0

  console.log(`  Baseline (full+KB fixed pipeline):`)
  console.log(`    Runs: ${baselineEntries.length}  Correctness: ${fmt(baseCorr)}  Expert: ${fmt(baseExpRate, 0)}%\n`)

  // Per-threshold summary
  console.log(
    pad("Threshold", 12) +
    rpad("Runs", 6) +
    rpad("Trigger%", 10) +
    rpad("Correct", 10) +
    rpad("Expert%", 9) +
    rpad("Prompt tok", 12) +
    rpad("Compl tok", 12) +
    rpad("vs base", 10),
  )
  console.log(line)

  for (const t of thresholds) {
    const rows = gatedEntries.filter(e => e.threshold === t)
    if (rows.length === 0) continue

    const triggered = rows.filter(r => r.triggered === true).length
    const triggerRate = (triggered / rows.length) * 100
    const corrs = rows.map(r => r.correctness).filter((c): c is number => c !== null)
    const expertRate = (rows.filter(r => r.verdict === "EXPERT").length / rows.length) * 100
    const promptToks = rows.map(r => r.promptTokens ?? 0)
    const complToks = rows.map(r => r.completionTokens ?? 0)

    const delta = corrs.length ? mean(corrs) - baseCorr : 0
    const deltaStr = delta >= 0 ? `+${fmt(delta)}` : fmt(delta)

    console.log(
      pad(`t=${t}`, 12) +
      rpad(String(rows.length), 6) +
      rpad(`${fmt(triggerRate, 0)}%`, 10) +
      rpad(corrs.length ? fmt(mean(corrs)) : "n/a", 10) +
      rpad(`${fmt(expertRate, 0)}%`, 9) +
      rpad(fmt(mean(promptToks), 0), 12) +
      rpad(fmt(mean(complToks), 0), 12) +
      rpad(deltaStr, 10),
    )
  }
  console.log(line)

  // Per-problem breakdown for each threshold
  for (const t of thresholds) {
    const rows = gatedEntries.filter(e => e.threshold === t)
    if (rows.length === 0) continue

    console.log(`\n  Threshold ${t} — per-problem:`)
    console.log(
      pad("  Problem", 12) +
      rpad("Runs", 6) +
      rpad("Trig%", 8) +
      rpad("Corr", 8) +
      rpad("Exp%", 8) +
      rpad("Conf avg", 10),
    )

    for (const pk of ALL_PROBLEMS) {
      const pRows = rows.filter(r => r.problem === pk)
      if (pRows.length === 0) continue
      const triggered = pRows.filter(r => r.triggered === true).length
      const corrs = pRows.map(r => r.correctness).filter((c): c is number => c !== null)
      const expertRate = (pRows.filter(r => r.verdict === "EXPERT").length / pRows.length) * 100
      const confScores = pRows.map(r => r.confidenceScore).filter((c): c is number => c != null)

      console.log(
        pad(`  ${pk}`, 12) +
        rpad(`${fmt((triggered / pRows.length) * 100, 0)}%`, 6) +
        rpad(String(pRows.length), 8) +
        rpad(corrs.length ? fmt(mean(corrs)) : "n/a", 8) +
        rpad(`${fmt(expertRate, 0)}%`, 8) +
        rpad(confScores.length ? fmt(mean(confScores)) : "?", 10),
      )
    }
  }

  // Confidence distribution
  console.log(`\n  Confidence score distribution (all gated runs):`)
  const allConf = gatedEntries.map(r => r.confidenceScore).filter((c): c is number => c != null)
  const confCounts: Record<number, number> = {}
  for (const c of allConf) confCounts[c] = (confCounts[c] ?? 0) + 1
  for (let i = 1; i <= 10; i++) {
    const count = confCounts[i] ?? 0
    const bar = "█".repeat(Math.round(count / Math.max(1, allConf.length) * 40))
    console.log(`    ${i}: ${bar} ${count}`)
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!process.env.OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set.")
  process.exit(1)
}

const args = process.argv.slice(2)
const repeatsIdx = args.indexOf("--repeats")
const REPEATS = repeatsIdx >= 0 ? parseInt(args[repeatsIdx + 1], 10) : 5
const threshIdx = args.indexOf("--threshold")
const singleThreshold = threshIdx >= 0 ? parseInt(args[threshIdx + 1], 10) : undefined
const activeThresholds = singleThreshold != null ? [singleThreshold] : THRESHOLDS

const displayModel = MODEL

// Check existing registry for resume
const existing = await readRegistry()
function existingCount(threshold: number, problem: string): number {
  return existing.filter(
    e => e.model === displayModel &&
         e.mode === "gated" &&
         e.problem === problem &&
         e.threshold === threshold,
  ).length
}

// Build run list
const runs: { threshold: number; pk: ProblemKey }[] = []
let skipped = 0
for (const t of activeThresholds) {
  for (const pk of ALL_PROBLEMS) {
    const have = existingCount(t, pk)
    const need = Math.max(0, REPEATS - have)
    for (let r = 0; r < need; r++) {
      runs.push({ threshold: t, pk })
    }
    skipped += Math.min(have, REPEATS)
  }
}

const totalTarget = activeThresholds.length * ALL_PROBLEMS.length * REPEATS
console.log(`\nConfidence gate ablation: ${activeThresholds.length} thresholds × ${ALL_PROBLEMS.length} problems × ${REPEATS} repeats = ${totalTarget} target`)
console.log(`Model: ${displayModel}`)
console.log(`Thresholds: ${activeThresholds.join(", ")}`)
if (skipped > 0) console.log(`Resuming: ${skipped} already in registry, ${runs.length} remaining`)
console.log()

const concurrencyIdx = args.indexOf("--concurrency")
const CONCURRENCY = concurrencyIdx >= 0 ? parseInt(args[concurrencyIdx + 1], 10) : 8

if (runs.length === 0) {
  console.log("All runs complete. Nothing to do.\n")
} else {
  console.log(`Concurrency: ${CONCURRENCY}\n`)
  let completed = 0
  let failures = 0

  async function worker(queue: typeof runs) {
    while (true) {
      const run = queue.shift()
      if (!run) return
      const idx = ++completed
      try {
        await runOne(run.threshold, run.pk, idx, runs.length)
      } catch (err) {
        failures++
        console.error(`  ✗ FAILED [t=${run.threshold} ${run.pk}]: ${(err as Error).message}\n`)
      }
    }
  }

  const queue = [...runs]
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

  if (failures > 0) {
    console.log(`\n⚠ ${failures} runs failed`)
  }
}

// Gather all gated entries + baseline for summary
const allEntries = await readRegistry()
const gatedEntries = allEntries.filter(
  e => e.model === displayModel && e.mode === "gated" && e.threshold != null,
)
const baselineEntries = allEntries.filter(
  e => e.model === displayModel && e.mode === "all" && e.includeKB === true,
)

printSummary(gatedEntries, baselineEntries, activeThresholds)
console.log()
