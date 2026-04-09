/**
 * compare.ts — cross-model comparison from registry data
 *
 * bun src/code-debugging/compare.ts              # full comparison table
 * bun src/code-debugging/compare.ts --thesis     # thesis test only (cheap+scaffold vs expensive+bare)
 */
import { readRegistry } from "../shared/registry.ts"
import type { RegistryEntry } from "../shared/types.ts"

// ── Helpers ──────────────────────────────────────────────────────────────────

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const std = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}
const fmt = (n: number, d = 1) => n.toFixed(d)
const pad = (s: string, w: number) => s.padEnd(w)
const rpad = (s: string, w: number) => s.padStart(w)

interface Config {
  label: string
  mode: string
  kb: boolean
}

const CONFIGS: Config[] = [
  { label: "full+KB", mode: "all", kb: true },
  { label: "full-KB", mode: "all", kb: false },
  { label: "gen+KB", mode: "gen", kb: true },
  { label: "gen-KB", mode: "gen", kb: false },
]

// Discriminating problems from Phase 2 analysis
const HARD_PROBLEMS = ["p002", "p006", "p007"]

function matchConfig(e: RegistryEntry, c: Config): boolean {
  return e.mode === c.mode && e.includeKB === c.kb
}

function shortModel(m: string): string {
  return m.replace(/^.*\//, "").replace(/-001$/, "")
}

// ── Main ─────────────────────────────────────────────────────────────────────

const all = await readRegistry()
const entries = all.filter(e => "includeKB" in e) // ablation runs only

const models = [...new Set(entries.map(e => e.model))].sort()
const problems = [...new Set(entries.map(e => e.problem))].sort()

if (models.length === 0) {
  console.error("No ablation data in registry.")
  process.exit(1)
}

console.log(`\nModels in registry: ${models.map(shortModel).join(", ")}`)
console.log(`Problems: ${problems.join(", ")}`)
console.log(`Total ablation runs: ${entries.length}\n`)

// ═══════════════════════════════════════════════════════════════════════════════
// Table 1: Aggregated model x config
// ═══════════════════════════════════════════════════════════════════════════════

const line = "─".repeat(90)
console.log("═".repeat(90))
console.log("  MODEL x CONFIG (all problems)")
console.log("═".repeat(90))
console.log(
  pad("Model", 22) +
  rpad("full+KB", 14) +
  rpad("full-KB", 14) +
  rpad("gen+KB", 14) +
  rpad("gen-KB", 14) +
  rpad("Runs", 6),
)
console.log(line)

for (const model of models) {
  const modelRows = entries.filter(e => e.model === model)
  const cells: string[] = []

  for (const c of CONFIGS) {
    const rows = modelRows.filter(e => matchConfig(e, c))
    const corrs = rows.map(r => r.correctness).filter((c): c is number => c !== null)
    if (corrs.length === 0) {
      cells.push("n/a")
    } else {
      const expPct = (rows.filter(r => r.verdict === "EXPERT").length / rows.length * 100)
      cells.push(`${fmt(mean(corrs))} ${fmt(expPct, 0)}%E`)
    }
  }

  console.log(
    pad(shortModel(model), 22) +
    rpad(cells[0], 14) +
    rpad(cells[1], 14) +
    rpad(cells[2], 14) +
    rpad(cells[3], 14) +
    rpad(String(modelRows.length), 6),
  )
}
console.log(line)

// ═══════════════════════════════════════════════════════════════════════════════
// Table 2: Per hard problem, model x config
// ═══════════════════════════════════════════════════════════════════════════════

for (const p of HARD_PROBLEMS) {
  const pRows = entries.filter(e => e.problem === p)
  if (pRows.length === 0) continue

  console.log(`\n${"═".repeat(90)}`)
  console.log(`  ${p} — detail`)
  console.log("═".repeat(90))
  console.log(
    pad("Model", 22) +
    rpad("full+KB", 14) +
    rpad("full-KB", 14) +
    rpad("gen+KB", 14) +
    rpad("gen-KB", 14),
  )
  console.log(line)

  for (const model of models) {
    const cells: string[] = []
    for (const c of CONFIGS) {
      const rows = pRows.filter(e => e.model === model && matchConfig(e, c))
      const corrs = rows.map(r => r.correctness).filter((c): c is number => c !== null)
      if (corrs.length === 0) {
        cells.push("—")
      } else {
        cells.push(`${fmt(mean(corrs))}±${fmt(std(corrs))}`)
      }
    }
    console.log(
      pad(shortModel(model), 22) +
      rpad(cells[0], 14) +
      rpad(cells[1], 14) +
      rpad(cells[2], 14) +
      rpad(cells[3], 14),
    )
  }
  console.log(line)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Table 3: Thesis test — cheap+scaffold vs expensive+bare
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${"═".repeat(90)}`)
console.log("  THESIS TEST: cheap model + scaffold vs expensive model + bare")
console.log("═".repeat(90))

// For each model, show best config (full+KB) and bare config (gen-KB)
console.log(
  pad("Model", 22) +
  rpad("full+KB corr", 14) +
  rpad("full+KB exp%", 14) +
  rpad("gen-KB corr", 14) +
  rpad("gen-KB exp%", 14),
)
console.log(line)

for (const model of models) {
  const modelRows = entries.filter(e => e.model === model)

  const fullKB = modelRows.filter(e => e.mode === "all" && e.includeKB === true)
  const genBare = modelRows.filter(e => e.mode === "gen" && e.includeKB === false)

  const fullCorrs = fullKB.map(r => r.correctness).filter((c): c is number => c !== null)
  const bareCorrs = genBare.map(r => r.correctness).filter((c): c is number => c !== null)

  const fullExp = fullKB.length ? (fullKB.filter(r => r.verdict === "EXPERT").length / fullKB.length * 100) : 0
  const bareExp = genBare.length ? (genBare.filter(r => r.verdict === "EXPERT").length / genBare.length * 100) : 0

  console.log(
    pad(shortModel(model), 22) +
    rpad(fullCorrs.length ? fmt(mean(fullCorrs)) : "n/a", 14) +
    rpad(fullCorrs.length ? `${fmt(fullExp, 0)}%` : "n/a", 14) +
    rpad(bareCorrs.length ? fmt(mean(bareCorrs)) : "n/a", 14) +
    rpad(bareCorrs.length ? `${fmt(bareExp, 0)}%` : "n/a", 14),
  )
}
console.log(line)

// Key comparison callout
const cheapModels = models.filter(m => m.includes("gemini-2.0-flash") || m.includes("qwen3"))
const expensiveModels = models.filter(m => m.includes("claude") || m.includes("deepseek-r1"))

if (cheapModels.length > 0 && expensiveModels.length > 0) {
  console.log("\n  Key comparison:")
  for (const cheap of cheapModels) {
    const cheapFull = entries.filter(e => e.model === cheap && e.mode === "all" && e.includeKB === true)
    const cheapCorrs = cheapFull.map(r => r.correctness).filter((c): c is number => c !== null)
    if (cheapCorrs.length === 0) continue
    const cheapScore = mean(cheapCorrs)
    const cheapExp = cheapFull.filter(r => r.verdict === "EXPERT").length / cheapFull.length * 100

    for (const exp of expensiveModels) {
      const expBare = entries.filter(e => e.model === exp && e.mode === "gen" && e.includeKB === false)
      const expCorrs = expBare.map(r => r.correctness).filter((c): c is number => c !== null)
      if (expCorrs.length === 0) continue
      const expScore = mean(expCorrs)
      const expExp = expBare.filter(r => r.verdict === "EXPERT").length / expBare.length * 100

      const delta = cheapScore - expScore
      const verdict = delta >= 0 ? "SCAFFOLD WINS" : delta >= -1 ? "COMPARABLE" : "MODEL WINS"
      console.log(
        `  ${shortModel(cheap)} full+KB (${fmt(cheapScore)}, ${fmt(cheapExp,0)}%E)` +
        ` vs ${shortModel(exp)} gen-KB (${fmt(expScore)}, ${fmt(expExp,0)}%E)` +
        ` → ${verdict} (delta: ${delta >= 0 ? "+" : ""}${fmt(delta)})`,
      )
    }
  }
}

console.log()
