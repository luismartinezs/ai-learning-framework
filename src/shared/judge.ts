import { call }         from "./client.ts"
import { JUDGE_SYSTEM } from "../code-debugging/activator.ts"
import type { JudgeScore } from "./types.ts"

export async function judgeOutput(
  problemText:  string,
  diagnosis:    string,
  groundTruth:  Record<string, string>,
): Promise<JudgeScore | null> {
  const { content: raw } = await call(
    JUDGE_SYSTEM,
    `Problem:\n${problemText}\n\n` +
    `Ground truth:\n${JSON.stringify(groundTruth, null, 2)}\n\n` +
    `Diagnosis:\n${diagnosis}`,
    1000,
  )

  const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim()
  try {
    return JSON.parse(cleaned) as JudgeScore
  } catch {
    console.error("Judge parse error. Raw:", raw.slice(0, 300))
    return null
  }
}
