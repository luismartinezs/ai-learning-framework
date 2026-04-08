import { OpenRouter } from "@openrouter/sdk"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set. Copy .env.example → .env and add your key.")

export const MODEL = process.env.MODEL ?? "google/gemini-2.0-flash-001"

const client = new OpenRouter({ apiKey })

export interface CallResult {
  content: string
  usage:   { promptTokens: number; completionTokens: number } | null
}

const MAX_RETRIES = 3
const RETRY_BASE_MS = 2000

export async function call(
  system:    string,
  user:      string,
  maxTokens: number = 2000,
  model?:    string,
): Promise<CallResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await client.chat.send({
        chatRequest: {
          model:      model ?? MODEL,
          stream:     false,
          maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user   },
          ],
        },
      })
      const content = res.choices[0]?.message?.content
      if (!content) throw new Error("Empty response from model")
      const usage = res.usage
        ? { promptTokens: res.usage.promptTokens, completionTokens: res.usage.completionTokens }
        : null
      return { content, usage }
    } catch (err) {
      const isLast = attempt === MAX_RETRIES - 1
      if (isLast) throw err
      const delay = RETRY_BASE_MS * 2 ** attempt
      console.warn(`  [retry ${attempt + 1}/${MAX_RETRIES}] ${(err as Error).message}. Waiting ${delay}ms...`)
      await Bun.sleep(delay)
    }
  }
  throw new Error("Unreachable")
}
