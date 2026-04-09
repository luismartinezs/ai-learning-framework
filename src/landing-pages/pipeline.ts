import { readFileSync } from "fs"
import { join }         from "path"
import { call, MODEL }  from "../shared/client.ts"

// ─── KB Loader ─────────────────────────────────────────────────────────────

const KB_PATH = join(import.meta.dir, "..", "..", "domains", "landing-pages", "kb", "01_principles.md")

function loadLandingKB(): string {
  return readFileSync(KB_PATH, "utf-8")
}

// ─── Output Format ─────────────────────────────────────────────────────────

const OUTPUT_FORMAT = `
Format your output as:

## Headline
[text]

## Subheadline
[text]

## Hero Body
[text]

## Primary CTA
[text]

## Key Benefits
[3-5 benefit statements]

## Social Proof Hook
[one line — a testimonial format, stat, or trust signal]`

// ─── Config Types ──────────────────────────────────────────────────────────

export type LandingConfig = "bare" | "question_first" | "mechanism_first" | "kb_scaffold" | "few_shot" | "constraint_aware"

export interface Example {
  product_name: string
  brief:        string
  copy:         string
}

// ─── Config Builders ───────────────────────────────────────────────────────

function buildBare(brief: string): { system: string; user: string } {
  return {
    system: "You are a copywriter. Write landing page copy.",
    user:   `${brief}\n${OUTPUT_FORMAT}`,
  }
}

function buildQuestionFirst(brief: string): { system: string; user: string } {
  return {
    system: "You are a copywriter.",
    user: `Before writing any copy, answer these three questions about the visitor:
1. What is the single most acute fear or frustration this visitor has in the specific moment they would need this product?
2. What does the visitor need to believe is true about this product before they would take action?
3. What would make this visitor distrust this product or dismiss it?

Answer the three questions internally — do not include your answers in the output. Output only the landing page copy in the required format, informed by your answers.

Product brief:
${brief}
${OUTPUT_FORMAT}`,
  }
}

function buildMechanismFirst(brief: string): { system: string; user: string } {
  return {
    system: "You are a copywriter.",
    user: `Before writing any copy, answer this one question:
What is the specific, concrete thing this product does that no competitor does in the same way? Describe the mechanism in one sentence a non-expert would understand.

Answer internally — do not include your answer in the output. Then write the landing page copy, leading with that mechanism.

Product brief:
${brief}
${OUTPUT_FORMAT}`,
  }
}

function buildConstraintAware(brief: string): { system: string; user: string } {
  return {
    system: "You are a copywriter.",
    user: `The brief below contains a CONSTRAINTS section. These constraints are not obstacles to work around — they are the brief's most important information. Each constraint represents either a trust barrier the visitor has, a credibility problem to address, or a specific objection that will prevent conversion if unaddressed.

Before writing, identify the single most conversion-critical constraint and make addressing it the structural spine of the copy.

Product brief:
${brief}
${OUTPUT_FORMAT}`,
  }
}

function buildKBScaffold(brief: string): { system: string; user: string } {
  const kb = loadLandingKB()
  return {
    system: `You are an expert copywriter. The following knowledge base contains principles that guide world-class landing page copy. Internalize them and apply them to the brief you receive.\n\n${kb}`,
    user:   `${brief}\n${OUTPUT_FORMAT}`,
  }
}

function buildFewShot(
  brief:    string,
  examples: Example[],
): { system: string; user: string } {
  const selected = selectExamples(examples, 2)

  let exampleBlock = ""
  for (let i = 0; i < selected.length; i++) {
    const ex = selected[i]
    exampleBlock += `[EXAMPLE ${i + 1}]
Product: ${ex.product_name}
Brief: ${ex.brief}
Copy:
${ex.copy}

`
  }

  return {
    system: "You are an expert copywriter.",
    user: `Here are ${selected.length} examples of world-class landing page copy. Study them, then write copy for the product described in the brief below at the same level of quality.

${exampleBlock}[BRIEF TO WRITE COPY FOR]
${brief}
${OUTPUT_FORMAT}`,
  }
}

// ─── Example Selection ─────────────────────────────────────────────────────

function selectExamples(examples: Example[], n: number): Example[] {
  if (examples.length <= n) return examples
  // Shuffle and take n — simple Fisher-Yates on a copy
  const shuffled = [...examples]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, n)
}

// ─── Main Function ─────────────────────────────────────────────────────────

export async function generateLandingCopy(
  brief:    string,
  config:   LandingConfig,
  examples: Example[],
  model:    string,
): Promise<string> {
  let system: string
  let user: string

  switch (config) {
    case "bare":           ({ system, user } = buildBare(brief)); break
    case "question_first":  ({ system, user } = buildQuestionFirst(brief)); break
    case "mechanism_first": ({ system, user } = buildMechanismFirst(brief)); break
    case "kb_scaffold":     ({ system, user } = buildKBScaffold(brief)); break
    case "few_shot":          ({ system, user } = buildFewShot(brief, examples)); break
    case "constraint_aware":  ({ system, user } = buildConstraintAware(brief)); break
  }

  const result = await call(system, user, 2000, model)
  return result.content
}

// ─── Barrier Classification ───────────────────────────────────────────

export type AwarenessLevel = "cold" | "warm" | "hot"
export type BarrierType = "emotional" | "rational" | "mixed"

export interface BarrierClassification {
  awarenessLevel: AwarenessLevel
  barrierType:    BarrierType
  hasMechanismGap: boolean
  reasoning:      string
}

const CLASSIFIER_MODEL = "google/gemini-2.0-flash-001"

export async function classifyBarrier(brief: string): Promise<BarrierClassification> {
  const system = "You are analyzing a product brief to classify the visitor's primary conversion barrier. Respond only in valid JSON."
  const user = `Analyze this brief and return:
- awarenessLevel: cold (visitor doesn't know product exists) / warm (visitor knows the problem) / hot (visitor ready to buy)
- barrierType: emotional (fear/trust/identity) / rational (price/value/comparison) / mixed
- hasMechanismGap: true if the product has a specific technical mechanism, academic research, or unique data that differentiates it from competitors and that copy should surface
- reasoning: one sentence explaining the classification

Brief:
${brief}`

  const result = await call(system, user, 500, CLASSIFIER_MODEL)
  const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned) as BarrierClassification
}

// ─── Routing ──────────────────────────────────────────────────────────

export function routeConfig(
  awarenessLevel:  AwarenessLevel,
  barrierType:     BarrierType,
  hasMechanismGap: boolean,
  model:           string,
): { config: LandingConfig; model: string; reasoning: string } {
  // Mechanism gap overrides everything
  if (hasMechanismGap) {
    return {
      config: "mechanism_first",
      model: "anthropic/claude-sonnet-4-5",
      reasoning: "Mechanism gap detected: Sonnet + mechanism_first surfaces technical credibility that other configs miss",
    }
  }

  if (awarenessLevel === "hot") {
    return {
      config: "bare",
      model: "google/gemini-2.0-flash-001",
      reasoning: "Hot traffic responds to directness; bare Gemini outperformed scaffolded Sonnet on price/trust products",
    }
  }

  if (awarenessLevel === "cold") {
    return {
      config: "question_first",
      model,
      reasoning: barrierType === "mixed"
        ? "Cold traffic defaults to emotional framing; mixed barriers handled by question_first's broad visitor analysis"
        : "Cold traffic with emotional barriers benefits from visitor-psychology framing before copy generation",
    }
  }

  // warm
  if (barrierType === "rational") {
    return {
      config: "kb_scaffold",
      model: "anthropic/claude-sonnet-4-5",
      reasoning: "Rational barriers on warm traffic: Sonnet + principles produces non-safe differentiated copy",
    }
  }

  return {
    config: "few_shot",
    model,
    reasoning: barrierType === "mixed"
      ? "Warm traffic defaults to few_shot; most consistent config across warm-traffic products"
      : "Warm traffic with emotional barriers: examples provide the right frame without over-engineering",
  }
}

// ─── Routed Generation ───────────────────────────────────────────────

export interface RoutedResult {
  config:                string
  model:                 string
  routing_reasoning:     string
  barrier_classification: BarrierClassification
  generated_copy:        string
}

export async function generateWithRouting(
  brief:          string,
  examples:       Example[],
  overrideConfig?: string,
  overrideModel?:  string,
): Promise<RoutedResult> {
  const classification = await classifyBarrier(brief)
  const route = routeConfig(
    classification.awarenessLevel,
    classification.barrierType,
    classification.hasMechanismGap,
    MODEL,
  )

  const finalConfig = (overrideConfig ?? route.config) as LandingConfig
  const finalModel  = overrideModel ?? route.model

  const copy = await generateLandingCopy(brief, finalConfig, examples, finalModel)

  return {
    config:                finalConfig,
    model:                 finalModel,
    routing_reasoning:     route.reasoning,
    barrier_classification: classification,
    generated_copy:        copy,
  }
}

// ─── CLI ───────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const args   = process.argv.slice(2)
  const config = (args[0] as LandingConfig) ?? "bare"
  const brief  = args[1] ?? "A project management tool for remote teams."

  console.log(`Config: ${config}`)
  console.log(`Model:  ${MODEL}`)
  console.log()

  const copy = await generateLandingCopy(brief, config, [], MODEL)
  console.log(copy)
}
