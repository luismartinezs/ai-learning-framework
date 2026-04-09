import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'fs'
import { join } from 'path'
import { chromium } from 'playwright'
import { call, type UserContent } from '../shared/client.ts'
import { judgeUIDesign } from './judge.ts'
import type { UIJudgeScore } from '../shared/types.ts'

const DOMAIN_DIR      = join(import.meta.dir, '../../domains/ui-design')
const PREVIEW_APP     = join(DOMAIN_DIR, 'preview-app')
const COMPONENT_PATH  = join(PREVIEW_APP, 'src/components/GeneratedComponent.astro')
const OUTPUTS_DIR     = join(DOMAIN_DIR, 'outputs')
const SCREENSHOTS_DIR = join(DOMAIN_DIR, 'screenshots')
const RESULTS_DIR     = join(DOMAIN_DIR, 'results')
const JUDGE_REF_DIR   = join(DOMAIN_DIR, 'judge_references')

const FEW_SHOT_DIR = join(DOMAIN_DIR, 'few_shot_references')

const CONDITIONS = ['bare', 'product_context', 'reference_style', 'full_brief', 'autonomous', 'few_shot_visual'] as const
type Condition = typeof CONDITIONS[number]

const MODEL = 'anthropic/claude-sonnet-4-5'

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadPrompt(condition: Condition): string {
  const spec     = readFileSync(join(DOMAIN_DIR, 'functional_spec.md'), 'utf-8')
  const template = readFileSync(join(DOMAIN_DIR, 'prompts', `${condition}.md`), 'utf-8')
  return template.replace('{{FUNCTIONAL_SPEC}}', spec)
}

function ensureDirs() {
  [OUTPUTS_DIR, SCREENSHOTS_DIR, RESULTS_DIR].forEach(d =>
    mkdirSync(d, { recursive: true })
  )
}

function buildFewShotUserContent(condition: Condition): UserContent {
  if (condition !== 'few_shot_visual') return loadPrompt(condition)

  const spec = readFileSync(join(DOMAIN_DIR, 'functional_spec.md'), 'utf-8')
  const template = readFileSync(join(DOMAIN_DIR, 'prompts', 'few_shot_visual.md'), 'utf-8')

  const preamble = template.split('[Image 1: Linear]')[0].trim()
  const taskOnward = template.split('[Image 3: Arc]')[1].replace('{{FUNCTIONAL_SPEC}}', spec).trim()

  const linearB64  = readFileSync(join(FEW_SHOT_DIR, 'linear_features.png')).toString('base64')
  const revolutB64 = readFileSync(join(FEW_SHOT_DIR, 'revolut_home.png')).toString('base64')
  const arcB64     = readFileSync(join(FEW_SHOT_DIR, 'arc_home.png')).toString('base64')

  return [
    { type: 'text' as const, text: preamble },
    { type: 'text' as const, text: '[Image 1: Linear]' },
    { type: 'image_url' as const, imageUrl: { url: `data:image/png;base64,${linearB64}` } },
    { type: 'text' as const, text: '[Image 2: Revolut]' },
    { type: 'image_url' as const, imageUrl: { url: `data:image/png;base64,${revolutB64}` } },
    { type: 'text' as const, text: '[Image 3: Arc]' },
    { type: 'image_url' as const, imageUrl: { url: `data:image/png;base64,${arcB64}` } },
    { type: 'text' as const, text: taskOnward },
  ]
}

async function generateComponent(condition: Condition): Promise<string> {
  const userContent = buildFewShotUserContent(condition)
  const system = `You are an expert UI designer and front-end developer.
Your output is always a single, complete, self-contained Astro component.
Output ONLY the component code — no explanation, no markdown fences,
no preamble. Start directly with the comment or the --- frontmatter.
The component must use only Tailwind utility classes for all styling.
No external CSS. No JavaScript framework imports. No component libraries.`

  const { content: raw } = await call(system, userContent, 4000, MODEL)

  // Strip markdown fences if model wraps output despite instructions
  return raw
    .replace(/^```(?:astro|html)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

async function screenshot(label: string, ts: string): Promise<string> {
  const outPath = join(SCREENSHOTS_DIR, `${label}_${ts}.png`)

  // Start Astro dev server
  const server = Bun.spawn(['bun', 'run', 'dev'], {
    cwd: PREVIEW_APP,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Wait for server ready — poll until 4321 responds
  let ready = false
  for (let i = 0; i < 30; i++) {
    await Bun.sleep(1000)
    try {
      const res = await fetch('http://localhost:4321/preview')
      if (res.ok) { ready = true; break }
    } catch { /* not ready yet */ }
  }

  if (!ready) {
    server.kill()
    throw new Error('Astro dev server did not start within 30 seconds')
  }

  // Screenshot
  const browser = await chromium.launch()
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('http://localhost:4321/preview', { waitUntil: 'networkidle' })
  await page.screenshot({ path: outPath, fullPage: false })
  await browser.close()

  server.kill()
  return outPath
}

// ── Fingerprint Extraction ──────────────────────────────────────────────────

interface Fingerprint {
  rootBg: string
  badgeColors: string
  shadowCount: number
  blueIndigoCount: number
}

function extractFingerprint(astroPath: string): Fingerprint {
  const src = readFileSync(astroPath, 'utf-8')

  // Root bg: first bg- class on the outermost div (first <div after frontmatter)
  const firstDiv = src.match(/<div\s[^>]*class="([^"]*)"/)
  const bgMatch = firstDiv?.[1]?.match(/bg-\S+/)
  const rootBg = bgMatch?.[0] ?? '-'

  // Badge colors: green/amber/red/emerald classes
  const badgeColorSet = new Set<string>()
  for (const m of src.matchAll(/(green|amber|red|emerald)-[\w/]+/g)) {
    badgeColorSet.add(m[0])
  }
  const badgeColors = badgeColorSet.size > 0 ? [...badgeColorSet].join(', ') : '-'

  // Shadow count
  const shadowCount = (src.match(/shadow/g) ?? []).length

  // Blue/indigo count
  const blueIndigoCount = (src.match(/\b(blue|indigo)/g) ?? []).length

  return { rootBg, badgeColors, shadowCount, blueIndigoCount }
}

// ── Summary ─────────────────────────────────────────────────────────────────

interface RunResult {
  condition: Condition
  model: string
  timestamp: string
  outputPath: string
  screenshotPath: string
  fingerprint: Fingerprint
  judgeScore: UIJudgeScore | null
}

function appendSummary(results: RunResult[]) {
  const summaryPath = join(RESULTS_DIR, 'summary.md')

  if (!existsSync(summaryPath)) {
    writeFileSync(summaryPath, '# UI Design Experiment — Results Log\n')
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const conditions = results.map(r => r.condition).join(', ')

  const fpHeader = '| Condition | Root bg | Badge colors | Shadow count | Blue/indigo count |'
  const fpSep    = '|-----------|---------|--------------|-------------|-------------------|'
  const fpRows = results.map(r =>
    `| ${r.condition} | ${r.fingerprint.rootBg} | ${r.fingerprint.badgeColors} | ${r.fingerprint.shadowCount} | ${r.fingerprint.blueIndigoCount} |`
  )

  // Judge scores table
  const judged = results.filter(r => r.judgeScore)
  const jHeader = '| Condition | overall | safety_dom | layout_q | intentionality | product_fit | distinctiveness | consistency | verdict |'
  const jSep    = '|-----------|---------|------------|----------|----------------|-------------|-----------------|-------------|---------|'
  const jRows = judged.map(r => {
    const j = r.judgeScore!
    return `| ${r.condition} | ${j.overall_score} | ${j.safety_dominance.score} | ${j.layout_quality.score} | ${j.intentionality.score} | ${j.product_fit.score} | ${j.distinctiveness.score} | ${j.consistency.score} | ${j.verdict} |`
  })

  const judgeDetails = judged.map(r => {
    const j = r.judgeScore!
    return `**${r.condition}**: strength: ${j.key_strength} | weakness: ${j.key_weakness} | identity: ${j.design_identity}`
  })

  const ssHeader = '| Condition | Path |'
  const ssSep    = '|-----------|------|'
  const ssRows = results.map(r =>
    `| ${r.condition} | ${r.screenshotPath} |`
  )

  let section = `
---
## Run: ${ts}
Model: ${results[0].model}
Conditions: ${conditions}

### Quantitative Fingerprint
${fpHeader}
${fpSep}
${fpRows.join('\n')}
`

  if (judged.length > 0) {
    section += `
### Judge Scores
${jHeader}
${jSep}
${jRows.join('\n')}

### Judge Notes
${judgeDetails.join('\n')}
`
  }

  section += `
### Screenshot Paths
${ssHeader}
${ssSep}
${ssRows.join('\n')}

### Visual Notes

`
  appendFileSync(summaryPath, section)
  console.log(`\nAppended -> domains/ui-design/results/summary.md`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runCondition(condition: Condition): Promise<RunResult> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  console.log(`\n[${ condition }] generating...`)

  ensureDirs()

  // 1. Generate
  const component = await generateComponent(condition)

  // 2. Write to preview app
  writeFileSync(COMPONENT_PATH, component)

  // 3. Save output
  const outputPath = join(OUTPUTS_DIR, `${condition}_${ts}.astro`)
  writeFileSync(outputPath, component)
  console.log(`[${ condition }] component saved → ${ outputPath }`)

  // 4. Screenshot
  console.log(`[${ condition }] screenshotting...`)
  const screenshotPath = await screenshot(condition, ts)
  console.log(`[${ condition }] screenshot saved → ${ screenshotPath }`)

  // 5. Extract fingerprint
  const fingerprint = extractFingerprint(outputPath)

  // 6. Judge
  console.log(`[${ condition }] judging design...`)
  const brief = readFileSync(join(DOMAIN_DIR, 'functional_spec.md'), 'utf-8')
  const judgeScore = await judgeUIDesign(screenshotPath, brief, condition, JUDGE_REF_DIR)

  if (judgeScore) {
    console.log(`[${ condition }] judge verdict: ${judgeScore.verdict} (${judgeScore.overall_score})`)
    console.log(`  safety_dom:     ${judgeScore.safety_dominance.score}/10  ${judgeScore.safety_dominance.reasoning}`)
    console.log(`  layout_q:       ${judgeScore.layout_quality.score}/10  ${judgeScore.layout_quality.reasoning}`)
    console.log(`  intentionality: ${judgeScore.intentionality.score}/10  ${judgeScore.intentionality.reasoning}`)
    console.log(`  product_fit:    ${judgeScore.product_fit.score}/10  ${judgeScore.product_fit.reasoning}`)
    console.log(`  distinctiveness:${judgeScore.distinctiveness.score}/10  ${judgeScore.distinctiveness.reasoning}`)
    console.log(`  consistency:    ${judgeScore.consistency.score}/10  ${judgeScore.consistency.reasoning}`)
    console.log(`  strength:  ${judgeScore.key_strength}`)
    console.log(`  weakness:  ${judgeScore.key_weakness}`)
    console.log(`  identity:  ${judgeScore.design_identity}`)
    if (judgeScore.revision_instruction) {
      console.log(`  revision:  ${judgeScore.revision_instruction}`)
    }
  } else {
    console.log(`[${ condition }] judge returned null — parse failure`)
  }

  // 7. Save result JSON
  const result = {
    condition,
    model: MODEL,
    timestamp: ts,
    output_file: outputPath,
    screenshot_file: screenshotPath,
    fingerprint,
    judge_score: judgeScore,
  }
  const resultPath = join(RESULTS_DIR, `${condition}_${ts}.json`)
  writeFileSync(resultPath, JSON.stringify(result, null, 2))

  return {
    condition,
    model: MODEL,
    timestamp: ts,
    outputPath,
    screenshotPath,
    fingerprint,
    judgeScore,
  }
}

// ── Revision Loop ────────────────────────────────────────────────────────────

interface PassResult {
  pass:           number
  component:      string
  screenshotPath: string
  judgeScore:     UIJudgeScore
}

const REVISION_SYSTEM = `You are an expert UI designer and front-end developer.
You are revising a mobile UI for "Menu Decoder" — a travel app that helps users with dietary restrictions identify safe dishes from foreign-language menus. The primary screen shows scan results: a list of menu items with safety indicators (green=safe, amber=caution, red=unsafe).
Your output is always a single, complete, self-contained Astro component.
Output ONLY the component code — no explanation, no markdown fences,
no preamble. Start directly with the comment or the --- frontmatter.
The component must use only Tailwind utility classes for all styling.
No external CSS. No JavaScript framework imports. No component libraries.`

async function runWithRevision(
  baseCondition: Condition,
  maxPasses: number = 2
): Promise<{
  passes:      PassResult[]
  finalScore:  UIJudgeScore
  improvement: number
}> {
  ensureDirs()
  const ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const brief = readFileSync(join(DOMAIN_DIR, 'functional_spec.md'), 'utf-8')
  const passes: PassResult[] = []

  // ── Pass 0: initial generation ──
  console.log(`\n[${baseCondition}] pass 0: generating...`)
  const component0 = await generateComponent(baseCondition)
  const outPath0 = join(OUTPUTS_DIR, `${baseCondition}_pass0_${ts}.astro`)
  writeFileSync(outPath0, component0)
  writeFileSync(COMPONENT_PATH, component0)
  console.log(`[${baseCondition}] pass 0: saved → ${outPath0}`)

  console.log(`[${baseCondition}] pass 0: screenshotting...`)
  const ssPath0 = await screenshot(`${baseCondition}_pass0`, ts)
  console.log(`[${baseCondition}] pass 0: screenshot → ${ssPath0}`)

  console.log(`[${baseCondition}] pass 0: judging...`)
  const judge0 = await judgeUIDesign(ssPath0, brief, baseCondition, JUDGE_REF_DIR)
  if (!judge0) throw new Error('Judge returned null on pass 0')
  console.log(`[${baseCondition}] pass 0: ${judge0.verdict} (${judge0.overall_score})`)

  passes.push({ pass: 0, component: component0, screenshotPath: ssPath0, judgeScore: judge0 })

  let prevScreenshot = ssPath0
  let prevScore      = judge0

  // ── Revision passes ──
  for (let p = 1; p <= maxPasses; p++) {
    console.log(`\n[${baseCondition}] pass ${p}: revising...`)

    const screenshotB64 = readFileSync(prevScreenshot).toString('base64')
    const revisionContent: UserContent = [
      { type: 'text' as const, text: 'Here is your current design:' },
      { type: 'image_url' as const, imageUrl: { url: `data:image/png;base64,${screenshotB64}` } },
      {
        type: 'text' as const,
        text: `The judge evaluation identified this as the most important thing to fix:\n${prevScore.revision_instruction}\n\nAlso address these weaknesses if possible:\n- key_weakness: ${prevScore.key_weakness}\n\nRevise the component to address this feedback.\nOutput only the complete revised .astro component.\nDo not explain changes. Do not use markdown fences.`,
      },
    ]

    const { content: raw } = await call(REVISION_SYSTEM, revisionContent, 4000, MODEL)
    const revised = raw
      .replace(/^```(?:astro|html)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    const outPath = join(OUTPUTS_DIR, `${baseCondition}_pass${p}_${ts}.astro`)
    writeFileSync(outPath, revised)
    writeFileSync(COMPONENT_PATH, revised)
    console.log(`[${baseCondition}] pass ${p}: saved → ${outPath}`)

    console.log(`[${baseCondition}] pass ${p}: screenshotting...`)
    const ssPath = await screenshot(`${baseCondition}_pass${p}`, ts)
    console.log(`[${baseCondition}] pass ${p}: screenshot → ${ssPath}`)

    console.log(`[${baseCondition}] pass ${p}: judging...`)
    const judge = await judgeUIDesign(ssPath, brief, baseCondition, JUDGE_REF_DIR)
    if (!judge) throw new Error(`Judge returned null on pass ${p}`)
    console.log(`[${baseCondition}] pass ${p}: ${judge.verdict} (${judge.overall_score})`)

    passes.push({ pass: p, component: revised, screenshotPath: ssPath, judgeScore: judge })
    prevScreenshot = ssPath
    prevScore      = judge
  }

  const finalScore  = passes[passes.length - 1].judgeScore
  const improvement = finalScore.overall_score - passes[0].judgeScore.overall_score

  // Save revision trace
  const resultPath = join(RESULTS_DIR, `revision_${baseCondition}_${ts}.json`)
  writeFileSync(resultPath, JSON.stringify({ passes: passes.map(p => ({ ...p, component: undefined })), improvement }, null, 2))
  console.log(`\nRevision trace → ${resultPath}`)

  return { passes, finalScore, improvement }
}

// Helper: extract dimension score whether judge returned {score,reasoning} or bare number
function dim(d: unknown): number {
  if (typeof d === 'object' && d !== null && 'score' in d) return (d as any).score
  if (typeof d === 'number') return d
  return NaN
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2)
const runAll    = args.includes('--all')
const revise    = args.includes('--revise')
const condition = args.find(a => CONDITIONS.includes(a as Condition)) as Condition | undefined

if (revise) {
  const reviseCondition = condition ?? 'full_brief'
  const result = await runWithRevision(reviseCondition)

  // Score progression table
  console.log('\n\n═══ Revision Results ═══\n')
  console.log('| Pass | safety_dom | layout_q | intentional | product_fit | distinct | consist | overall | verdict |')
  console.log('|------|-----------|----------|-------------|-------------|----------|---------|---------|---------|')
  for (const p of result.passes) {
    const j     = p.judgeScore
    const label = p.pass === 0 ? '0 (initial)' : `${p.pass} (revision ${p.pass})`
    console.log(`| ${label} | ${dim(j.safety_dominance)} | ${dim(j.layout_quality)} | ${dim(j.intentionality)} | ${dim(j.product_fit)} | ${dim(j.distinctiveness)} | ${dim(j.consistency)} | ${j.overall_score} | ${j.verdict} |`)
  }
  console.log(`\nImprovement: ${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}`)

  // Revision instructions
  console.log('\nRevision instructions given:')
  for (const p of result.passes.slice(0, -1)) {
    console.log(`  Pass ${p.pass} → ${p.pass + 1}: ${p.judgeScore.revision_instruction}`)
  }

  // Screenshot paths
  console.log('\nScreenshots:')
  for (const p of result.passes) {
    console.log(`  Pass ${p.pass}: ${p.screenshotPath}`)
  }
} else if (!runAll && !condition) {
  console.error(`Usage:
  bun src/ui-design/run.ts --all
  bun src/ui-design/run.ts bare
  bun src/ui-design/run.ts full_brief
  bun src/ui-design/run.ts --revise [condition]    # iterative revision loop (default: full_brief)`)
  process.exit(1)
} else {
  const allResults: RunResult[] = []
  if (runAll) {
    for (const c of CONDITIONS) {
      allResults.push(await runCondition(c))
    }
  } else {
    allResults.push(await runCondition(condition!))
  }
  appendSummary(allResults)
}
