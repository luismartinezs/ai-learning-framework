import { OpenRouter } from "@openrouter/sdk"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set. Copy .env.example → .env and add your key.")

export const MODEL = process.env.MODEL ?? "google/gemini-2.0-flash-001"

const client = new OpenRouter({ apiKey })

export async function call(
  system:    string,
  user:      string,
  maxTokens: number = 2000,
): Promise<string> {
  const res = await client.chat.send({
    chatRequest: {
      model:      MODEL,
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
  return content
}
