/**
 * kb_diagnosis.ts — compare gen-KB vs gen+KB vs gen-minimal from registry
 *
 * bun src/kb_diagnosis.ts
 *
 * Reads the registry, compares the three generator-only configs, and writes
 * results/kb_diagnosis.md with a per-problem table and conclusion.
 */
import { readRegistry } from "./registry.ts"
import type { RegistryEntry, KbMode } from "./types.ts"

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const fmt = (n: number, d = 2) => n.toFixed(d)

function resolveKbMode(e: { includeKB: boolean; kbMode?: KbMode }): KbMode {
  return e.kbMode ?? (e.includeKB ? "full" : "none")
}

const entries = await readRegistry()
const genEntries = entries.filter(e => e.mode === "gen")

const models = [...new Set(genEntries.map(e => e.model))].sort()
const problems = [...new Set(genEntries.map(e => e.problem))].sort()

function shortModel(m: string): string {
  return m.replace(/^.*\//, "").replace(/-001$/, "")
}

type ConfigKey = "gen-KB" | "gen+KB" | "gen-minimal"

function configFilter(e: RegistryEntry, key: ConfigKey): boolean {
  const km = resolveKbMode(e)
  if (key === "gen-KB") return km === "none"
  if (key === "gen+KB") return km === "full"
  if (key === "gen-minimal") return km === "minimal"
  return false
}

function getScores(rows: RegistryEntry[]): { corr: number; exp: number; n: number } {
  const corrs = rows.map(r => r.correctness).filter((c): c is number => c !== null)
  const expRate = rows.length
    ? (rows.filter(r => r.verdict === "EXPERT").length / rows.length) * 100
    : 0
  return { corr: mean(corrs), exp: expRate, n: rows.length }
}

// ── Build the report ───────────────────────────────────────────────────────

const lines: string[] = []
const w = (s: string) => lines.push(s)

w("# KB Diagnosis: Format vs Content Interference")
w("")
w("Does the KB's net-negative effect come from the structured output contract (format)")
w("or from the KB content itself?")
w("")
w("## Method")
w("")
w("Three generator-only configs compared:")
w("- **gen-KB**: bare model, no KB, no output contract")
w("- **gen+KB**: full KB + structured output contract (CLASSIFICATION | HYPOTHESIS | ...)")
w("- **gen-minimal**: same KB knowledge as natural prose, no output contract or structured format")
w("")
w("If gen-minimal scores closer to gen-KB than gen+KB: format is the problem.")
w("If gen-minimal still scores below gen-KB: the KB content itself interferes.")
w("If gen-minimal scores above both: current KB structure is doubly wrong.")
w("")

const configs: ConfigKey[] = ["gen-KB", "gen+KB", "gen-minimal"]

for (const model of models) {
  const modelRows = genEntries.filter(e => e.model === model)

  // Check if this model has minimal runs
  const hasMinimal = modelRows.some(e => resolveKbMode(e) === "minimal")
  if (!hasMinimal) continue

  w(`## ${shortModel(model)}`)
  w("")
  w("| Problem | gen-KB | gen+KB | gen-minimal | Interpretation |")
  w("|---------|--------|--------|-------------|----------------|")

  const modelSummary: { config: ConfigKey; corr: number; exp: number }[] = []

  for (const pk of problems) {
    const cells: string[] = []
    const scores: Record<ConfigKey, { corr: number; exp: number; n: number }> = {} as any

    for (const ck of configs) {
      const rows = modelRows.filter(e => e.problem === pk && configFilter(e, ck))
      const s = getScores(rows)
      scores[ck] = s
      cells.push(s.n > 0 ? `${fmt(s.corr)} (${fmt(s.exp, 0)}%E, n=${s.n})` : "n/a")
    }

    // Interpretation
    let interp = ""
    if (scores["gen-minimal"].n > 0 && scores["gen-KB"].n > 0 && scores["gen+KB"].n > 0) {
      const bare = scores["gen-KB"].corr
      const full = scores["gen+KB"].corr
      const min = scores["gen-minimal"].corr

      const distToFull = Math.abs(min - full)
      const distToBare = Math.abs(min - bare)

      if (min >= bare && min >= full) {
        interp = "Minimal wins both: structure hurts"
      } else if (distToBare < distToFull) {
        interp = "Closer to bare: format is the problem"
      } else if (distToFull < distToBare) {
        interp = "Closer to full KB: content interferes"
      } else {
        interp = "Equidistant"
      }
    }

    w(`| ${pk} | ${cells[0]} | ${cells[1]} | ${cells[2]} | ${interp} |`)
  }

  // Aggregated row
  w("")
  w("**Aggregated:**")
  w("")
  w("| Config | Correctness | Expert Rate | Runs |")
  w("|--------|-------------|-------------|------|")

  for (const ck of configs) {
    const rows = modelRows.filter(e => configFilter(e, ck))
    const s = getScores(rows)
    w(`| ${ck} | ${fmt(s.corr)} | ${fmt(s.exp, 0)}% | ${s.n} |`)
    modelSummary.push({ config: ck, corr: s.corr, exp: s.exp })
  }

  w("")
}

// ── Conclusion ──────────────────────────────────────────────────────────────

w("## Conclusion")
w("")

// Compute aggregate across all models that have minimal data
const allWithMinimal = genEntries.filter(e => {
  const model = e.model
  return genEntries.some(e2 => e2.model === model && resolveKbMode(e2) === "minimal")
})

const aggScores: Record<ConfigKey, { corr: number; exp: number; n: number }> = {} as any
for (const ck of configs) {
  const rows = allWithMinimal.filter(e => configFilter(e, ck))
  aggScores[ck] = getScores(rows)
}

const bare = aggScores["gen-KB"]
const full = aggScores["gen+KB"]
const min = aggScores["gen-minimal"]

if (min.n === 0) {
  w("No gen-minimal runs found in the registry. Run the ablation first:")
  w("```")
  w("bun src/ablation.ts")
  w("```")
} else {
  const distToFull = Math.abs(min.corr - full.corr)
  const distToBare = Math.abs(min.corr - bare.corr)

  w(`Aggregate scores (across all models with minimal data):`)
  w(`- gen-KB (bare): correctness ${fmt(bare.corr)}, expert rate ${fmt(bare.exp, 0)}%`)
  w(`- gen+KB (full scaffold): correctness ${fmt(full.corr)}, expert rate ${fmt(full.exp, 0)}%`)
  w(`- gen-minimal (prose KB, no format): correctness ${fmt(min.corr)}, expert rate ${fmt(min.exp, 0)}%`)
  w("")

  if (min.corr >= bare.corr && min.corr >= full.corr) {
    w("**Verdict: Both format and content structure hurt.** The minimal prose activator outperforms")
    w("both the bare model and the full structured KB. The current KB design is doubly wrong:")
    w("the output contract constrains reasoning, and the structured KB format interferes with")
    w("the model's native chain-of-thought. The expert knowledge itself has value, but only")
    w("when presented as natural prose without imposed reasoning structure.")
  } else if (distToBare < distToFull) {
    w("**Verdict: Format interference.** The minimal prose activator scores closer to the bare")
    w("model than to the full structured KB. The output contract (CLASSIFICATION | HYPOTHESIS | ...)")
    w("is the primary source of interference. The KB content has marginal effect when the")
    w("structured format is removed.")
  } else if (distToFull < distToBare) {
    w("**Verdict: Content interference.** The minimal prose activator scores closer to the")
    w("full structured KB than to the bare model. Removing the output contract did not recover")
    w("performance. The KB content itself interferes with the model's native reasoning,")
    w("regardless of how it is presented.")
  } else {
    w("**Verdict: Inconclusive.** The minimal activator is equidistant from both the bare")
    w("model and the full KB. Both format and content may contribute to the interference,")
    w("or the effect size is too small to distinguish with this sample.")
  }
}

w("")

// ── Write to file ──────────────────────────────────────────────────────────

const output = lines.join("\n") + "\n"
await Bun.write("results/kb_diagnosis.md", output)
console.log("Wrote results/kb_diagnosis.md")
console.log(output)
