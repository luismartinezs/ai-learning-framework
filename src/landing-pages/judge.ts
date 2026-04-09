import { call }                    from "../shared/client.ts"
import type { LandingJudgeScore }  from "../shared/types.ts"

const SYSTEM = `You are an expert evaluator of landing page copy effectiveness.
You evaluate copy on five dimensions. For each dimension, you give a
score from 0-10 and a one-sentence reasoning.

You have been given a reference example of world-class copy for a
similar product. Use it ONLY to calibrate your sense of what excellent
looks like in this product category. Do not score the generated copy
on similarity to the reference — score it on its own merits.

DIMENSIONS:

1. visitor_emotional_accuracy (0-10)
Does the copy address the actual fear, frustration, or desire the target
visitor arrives with? Or does it address a generic/assumed version of it?
10 = names the specific emotion with precision
0 = generic, could apply to any product in any category

2. specificity (0-10)
Is the copy concrete and particular to this product, or vague and
interchangeable?
10 = copy could not be used for any other product without significant rewriting
0 = copy could be pasted onto a competitor's page unchanged

3. mechanism_clarity (0-10)
Does the visitor understand HOW the product solves the problem, not just
that it does?
10 = the specific mechanism is clear from the copy alone
0 = the copy makes a promise but gives no indication of how it's kept

4. cta_awareness_match (0-10)
Does the call to action ask for a commitment level that matches what the
page has earned from the visitor?
10 = CTA matches the visitor's readiness perfectly given the page content
0 = CTA asks for more commitment than the page has justified

5. interchangeability (0-10, INVERTED — higher is better)
Could this copy be lifted and used for a competitor's product with minimal
changes? This score is inverted: 10 means NOT interchangeable (good),
0 means fully interchangeable (bad).
10 = deeply specific to this product, impossible to reuse
0 = entirely generic, usable for any competitor

Respond ONLY in valid JSON with no markdown fences:
{
  "visitor_emotional_accuracy": { "score": 0-10, "reasoning": "..." },
  "specificity": { "score": 0-10, "reasoning": "..." },
  "mechanism_clarity": { "score": 0-10, "reasoning": "..." },
  "cta_awareness_match": { "score": 0-10, "reasoning": "..." },
  "interchangeability": { "score": 0-10, "reasoning": "..." },
  "overall_score": <average of all five, rounded to 1 decimal>,
  "verdict": "<WORLD_CLASS|COMPETENT|GENERIC>",
  "key_weakness": "<the single most important thing holding this copy back>",
  "key_strength": "<the single best thing this copy does>"
}

Verdict thresholds:
WORLD_CLASS: overall_score >= 8.0
COMPETENT: overall_score >= 6.0
GENERIC: overall_score < 6.0`

export async function judgeLandingCopy(
  brief:         string,
  generatedCopy: string,
  referenceCopy: string,
  model:         string,
): Promise<LandingJudgeScore | null> {
  const user =
    `PRODUCT BRIEF:\n${brief}\n\n` +
    `REFERENCE COPY (for calibration only — do not score similarity):\n${referenceCopy}\n\n` +
    `GENERATED COPY TO EVALUATE:\n${generatedCopy}`

  const { content: raw } = await call(SYSTEM, user, 1000, model)

  const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim()
  try {
    return JSON.parse(cleaned) as LandingJudgeScore
  } catch {
    console.error("Landing judge parse error. Raw:", raw.slice(0, 500))
    return null
  }
}
