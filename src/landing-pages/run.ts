/**
 * run.ts — landing page experiment runner
 *
 * bun src/landing-pages/run.ts                    # all products, all configs
 * bun src/landing-pages/run.ts --product stripe   # one product, all configs
 * bun src/landing-pages/run.ts --config bare      # all products, one config
 * bun src/landing-pages/run.ts --product crazy_egg --routed  # routed mode
 */
import { readFileSync, readdirSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs"
import { join }                                                  from "path"
import { generateLandingCopy, generateWithRouting, type LandingConfig, type Example } from "./pipeline.ts"
import { judgeLandingCopy }                                      from "./judge.ts"
import { MODEL }                                                 from "../shared/client.ts"
import type { LandingEvalResult }                                from "../shared/types.ts"

// ─── Constants ─────────────────────────────────────────────────────────────

const CONFIGS: LandingConfig[] = ["bare", "question_first", "mechanism_first", "kb_scaffold", "few_shot", "constraint_aware"]

const DOMAINS_DIR  = join(import.meta.dir, "..", "..", "domains", "landing-pages")
const BRIEFS_DIR   = join(DOMAINS_DIR, "problems")
const EXAMPLES_DIR = join(DOMAINS_DIR, "examples")
const RESULTS_DIR  = join(DOMAINS_DIR, "results")

// ─── Product Discovery ────────────────────────────────────────────────────

interface Product {
  slug:      string
  briefPath: string
  examplePath: string
}

function discoverProducts(): Product[] {
  const briefs = readdirSync(BRIEFS_DIR).filter(f => f.endsWith("_brief.md"))
  return briefs.map(f => {
    const slug = f.replace("_brief.md", "")               // crazy_egg
    const exampleSlug = slug.replace(/_/g, "-")            // crazy-egg
    return {
      slug,
      briefPath:   join(BRIEFS_DIR, f),
      examplePath: join(EXAMPLES_DIR, `${exampleSlug}.md`),
    }
  })
}

// ─── Loaders ──────────────────────────────────────────────────────────────

function loadBrief(path: string): string {
  return readFileSync(path, "utf-8")
}

function loadExample(path: string): string {
  return readFileSync(path, "utf-8")
}

function extractProductName(brief: string): string {
  const match = brief.match(/product_name:\s*(.+)/i)
  return match ? match[1].trim() : "unknown"
}

/** Build Example[] for few-shot config, excluding the current product */
function buildExamples(products: Product[], excludeSlug: string): Example[] {
  return products
    .filter(p => p.slug !== excludeSlug)
    .map(p => {
      const brief = loadBrief(p.briefPath)
      const copy  = loadExample(p.examplePath)
      return { product_name: extractProductName(brief), brief, copy }
    })
}

// ─── Single Run ───────────────────────────────────────────────────────────

async function runOne(
  product:  Product,
  config:   LandingConfig,
  examples: Example[],
): Promise<LandingEvalResult> {
  const brief         = loadBrief(product.briefPath)
  const referenceCopy = loadExample(product.examplePath)
  const productName   = extractProductName(brief)
  const ts            = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  console.log(`  [${config}] generating...`)
  const generatedCopy = await generateLandingCopy(brief, config, examples, MODEL)

  console.log(`  [${config}] judging...`)
  const judgeScore = await judgeLandingCopy(brief, generatedCopy, referenceCopy, MODEL)

  const result: LandingEvalResult = {
    product_name:  productName,
    config,
    model:         MODEL,
    timestamp:     ts,
    generated_copy: generatedCopy,
    judge_score:   judgeScore,
  }

  if (!judgeScore) {
    result.judge_parse_error = "Failed to parse judge response"
  }

  // Save individual result
  const filename = `${product.slug}_${config}_${ts}.json`
  writeFileSync(join(RESULTS_DIR, filename), JSON.stringify(result, null, 2))

  const score   = judgeScore?.overall_score ?? "?"
  const verdict = judgeScore?.verdict ?? "NO_SCORE"
  console.log(`  [${config}] -> ${score} ${verdict}`)

  return result
}

// ─── Routed Run ───────────────────────────────────────────────────────────

async function runOneRouted(
  product:  Product,
  examples: Example[],
): Promise<LandingEvalResult> {
  const brief         = loadBrief(product.briefPath)
  const referenceCopy = loadExample(product.examplePath)
  const productName   = extractProductName(brief)
  const ts            = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  console.log(`  [routed] classifying barrier...`)
  const routedResult = await generateWithRouting(brief, examples)

  console.log(`  [routed] -> config: ${routedResult.config}, model: ${routedResult.model}`)
  console.log(`  [routed] -> reasoning: ${routedResult.routing_reasoning}`)
  console.log(`  [routed] -> barrier: ${routedResult.barrier_classification.awarenessLevel}/${routedResult.barrier_classification.barrierType} (mechanism_gap: ${routedResult.barrier_classification.hasMechanismGap})`)

  console.log(`  [routed] judging...`)
  const judgeScore = await judgeLandingCopy(brief, routedResult.generated_copy, referenceCopy, routedResult.model)

  const configLabel = `routed_${routedResult.config}`
  const result: LandingEvalResult = {
    product_name:   productName,
    config:         configLabel,
    model:          routedResult.model,
    timestamp:      ts,
    generated_copy: routedResult.generated_copy,
    judge_score:    judgeScore,
  }

  if (!judgeScore) {
    result.judge_parse_error = "Failed to parse judge response"
  }

  const filename = `${product.slug}_${configLabel}_${ts}.json`
  writeFileSync(join(RESULTS_DIR, filename), JSON.stringify(result, null, 2))

  const score   = judgeScore?.overall_score ?? "?"
  const verdict = judgeScore?.verdict ?? "NO_SCORE"
  console.log(`  [routed] -> ${score} ${verdict}`)

  return result
}

// ─── Summary Table ────────────────────────────────────────────────────────

function buildSummaryTable(
  results: LandingEvalResult[],
  products: string[],
  configs: string[],
  routed: boolean,
): string {
  if (routed) {
    const header = `| Product | Config | Model | Score |`
    const sep    = `|---------|--------|-------|-------|`
    const rows = results.map(r => {
      const score = r.judge_score
        ? `${r.judge_score.overall_score} ${r.judge_score.verdict}`
        : "-"
      return `| ${r.product_name} | ${r.config} | ${r.model} | ${score} |`
    })
    return [header, sep, ...rows].join("\n")
  }

  const header = `| Product | ${configs.join(" | ")} |`
  const sep    = `|---------|${configs.map(() => "--------").join("|")}|`

  const rows = products.map(product => {
    const cells = configs.map(config => {
      const r = results.find(r => r.product_name === product && r.config === config)
      if (!r?.judge_score) return "-"
      return `${r.judge_score.overall_score} ${r.judge_score.verdict}`
    })
    return `| ${product} | ${cells.join(" | ")} |`
  })

  return [header, sep, ...rows].join("\n")
}

// ─── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (!process.env.OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set.")
  process.exit(1)
}

const productFilter = args.includes("--product")
  ? args[args.indexOf("--product") + 1]
  : null

const configFilter = args.includes("--config")
  ? args[args.indexOf("--config") + 1] as LandingConfig
  : null

const isRouted = args.includes("--routed")

const allProducts = discoverProducts()
const products = productFilter
  ? allProducts.filter(p => p.slug.includes(productFilter!))
  : allProducts

const configs = configFilter ? [configFilter] : CONFIGS

if (products.length === 0) {
  console.error(`No products matching "${productFilter}"`)
  process.exit(1)
}

mkdirSync(RESULTS_DIR, { recursive: true })

console.log(`Mode:     ${isRouted ? "routed" : "fixed"}`)
if (!isRouted) console.log(`Model:    ${MODEL}`)
console.log(`Products: ${products.map(p => p.slug).join(", ")}`)
if (!isRouted) console.log(`Configs:  ${configs.join(", ")}`)
console.log()

const allResults: LandingEvalResult[] = []

for (const product of products) {
  const productName = extractProductName(loadBrief(product.briefPath))
  console.log(`\n${"─".repeat(50)}`)
  console.log(`  ${productName} (${product.slug})`)
  console.log("─".repeat(50))

  const examples = buildExamples(allProducts, product.slug)

  if (isRouted) {
    const result = await runOneRouted(product, examples)
    allResults.push(result)
  } else {
    for (const config of configs) {
      const result = await runOne(product, config, examples)
      allResults.push(result)
    }
  }
}

// Print and save summary
const productNames = [...new Set(allResults.map(r => r.product_name))]
const usedConfigs  = [...new Set(allResults.map(r => r.config))]
const table = buildSummaryTable(allResults, productNames, usedConfigs, isRouted)

console.log(`\n${"═".repeat(60)}`)
console.log("  SUMMARY")
console.log("═".repeat(60))
console.log()
console.log(table)

const summaryPath = join(RESULTS_DIR, "summary.md")
if (!existsSync(summaryPath)) {
  writeFileSync(summaryPath, "# Landing Pages Experiment - Results Log\n")
}

const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
const productSlugs = products.map(p => p.slug).join(", ")
const modelLine = isRouted ? "" : `\nModel: ${MODEL}`
const section = `\n---\n## Run: ${ts}\nMode: ${isRouted ? "routed" : "fixed"}${modelLine}\nProducts: ${productSlugs}\nConfigs: ${usedConfigs.join(", ")}\n\n${table}\n`
appendFileSync(summaryPath, section)
console.log(`\nAppended -> domains/landing-pages/results/summary.md`)
