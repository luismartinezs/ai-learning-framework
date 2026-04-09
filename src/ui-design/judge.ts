import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { call } from '../shared/client.ts'
import type { ChatContentItems } from '@openrouter/sdk/models/chatcontentitems.js'
import type { UIJudgeScore } from '../shared/types.ts'

const JUDGE_MODEL = 'anthropic/claude-opus-4-5'

const SYSTEM_PROMPT = `You are an expert UI designer evaluating a functional utility screen -- not a marketing page, not a brand experience. This screen is used by travelers with dietary restrictions in restaurants abroad. The user is potentially anxious, time-pressured, and needs to extract safety-critical information (can I eat this?) in under 3 seconds.

You have been given three reference screenshots of world-class functional utility UI. These represent excellent information hierarchy, glanceability, and stress-context usability. Use them to calibrate your sense of what excellent looks like for a tool screen, not a marketing screen.

Evaluate the generated UI on six dimensions. For each, respond with a score (0-10) and one sentence of reasoning.

1. safety_dominance (0-10)
Is the safety status (green/amber/red badge) the most visually dominant element in each dish row? Can a user determine safe/unsafe for each dish in under 2 seconds without reading carefully? Would it be readable at arm's length in a dimly lit restaurant? Evaluate ONLY the badge element: its size, color weight, and contrast.
10 = badge fills the row height, color is the first thing the eye lands on, status readable at arm's length
0 = badge is a small pill, competes with dish name, requires reading

2. layout_quality (0-10)
Does the overall layout serve a stressed traveler's needs? Is the information density appropriate -- all critical dishes visible without scrolling, FAB not obscuring content, viewfinder proportioned to leave adequate space for the safety list?
10 = layout feels considered for this specific use case, nothing fights for space, critical content always visible
0 = viewfinder dominates, safety list cramped, FAB covers content

3. intentionality (0-10)
Does each design decision serve the stressed traveler's needs, or does it appear to be a framework default?
Evaluate: Does the color system carry meaning consistently? Is the information density appropriate for glancing, not reading? Are touch targets appropriately sized for use while holding a phone?
10 = every decision serves the use context deliberately
0 = assembled from unchanged framework defaults

4. product_fit (0-10)
Does the visual language build trust for a safety-critical tool? Does it feel calm under stress, not alarming or clinical? Would a traveler with a life-threatening allergy feel confident using this at a restaurant table?
10 = perfectly calibrated for trust and calm in a stressful context
0 = feels mismatched -- too playful, too corporate, too alarming

5. distinctiveness (0-10)
Does this have a considered visual identity appropriate to its function, or does it look like a generic app template?
NOTE: For a functional utility screen, distinctiveness does NOT mean "looks like a trendy startup." It means: does the design feel like someone thought carefully about THIS product's specific needs, rather than applying a generic template?
10 = clearly designed for this specific product and use context
0 = interchangeable with any generic scanner or list app

6. consistency (0-10)
Is the same design logic applied throughout? Do spacing, color usage, typography weight, and touch target sizing follow a coherent system?
10 = coherent system throughout, every detail follows the logic
0 = inconsistent, feels assembled from parts

overall_score = average of all six dimension scores.

VERDICT THRESHOLDS:
WORLD_CLASS: overall_score >= 8.0
COMPETENT:   overall_score >= 6.0
GENERIC:     overall_score < 6.0

Also provide:
- key_weakness: the single most important thing holding this design back for a stressed traveler
- key_strength: the single design decision that most helps the stressed traveler
- design_identity: one sentence describing what visual identity this has, evaluated as a functional tool not a brand
- revision_instruction: Look at the dimension with the lowest score. Write ONE specific, actionable instruction targeting that dimension. Be precise: name the exact element to change, the exact change to make, and if relevant the exact CSS property or Tailwind class. Good example: "The safety badge on each dish row should use h-full to fill the entire row height and w-1/3 to occupy the right third of the row -- replace the current pill with a full-height color block." Bad example: "Improve the visual hierarchy of the safety badges." The instruction must be specific enough that a developer could implement it without asking any clarifying questions.

Respond ONLY in valid JSON. No markdown fences. No preamble.`

function toDataUrl(path: string): string {
  const base64 = readFileSync(path).toString('base64')
  return `data:image/png;base64,${base64}`
}

function loadReferences(referenceDir: string): { name: string; path: string }[] {
  const refs = [
    { name: 'Google Translate', file: 'google_translate.png' },
    { name: 'Google Maps',      file: 'google_maps.png' },
    { name: 'XE Currency',      file: 'xe_currency.png' },
  ]

  const files = readdirSync(referenceDir)
  return refs
    .filter(r => files.includes(r.file))
    .map(r => ({ name: r.name, path: join(referenceDir, r.file) }))
}

export async function judgeUIDesign(
  screenshotPath: string,
  productBrief: string,
  condition: string,
  referenceDir: string,
): Promise<UIJudgeScore | null> {
  const references = loadReferences(referenceDir)

  // Build multimodal content array
  const content: ChatContentItems[] = []

  content.push({
    type: 'text',
    text: 'Here are reference screenshots of world-class functional utility UI. Use these to calibrate what excellent looks like for a tool screen.',
  })

  for (const ref of references) {
    content.push({ type: 'text', text: `\nReference: ${ref.name}` })
    content.push({
      type: 'image_url',
      imageUrl: { url: toDataUrl(ref.path) },
    })
  }

  const briefSnippet = productBrief.slice(0, 300)
  content.push({
    type: 'text',
    text: `\nNow evaluate this generated UI for Menu Decoder (condition: ${condition}).\n\nProduct brief summary: ${briefSnippet}\n\nGenerated UI screenshot:`,
  })
  content.push({
    type: 'image_url',
    imageUrl: { url: toDataUrl(screenshotPath) },
  })
  content.push({
    type: 'text',
    text: 'Score this design on the six dimensions.',
  })

  try {
    const { content: raw } = await call(SYSTEM_PROMPT, content, 1500, JUDGE_MODEL)

    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    return JSON.parse(cleaned) as UIJudgeScore
  } catch (err) {
    console.error('[judge] Failed:', err)
    return null
  }
}
