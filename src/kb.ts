import { readFileSync, existsSync } from "fs"
import { join } from "path"

const KB_DIR = join(import.meta.dir, "..", "kb")

const KB_FILES: Array<[string, string]> = [
  ["01_axioms",                     "axiomatic"],
  ["02_failure_library",            "failure"],
  ["03_antipatterns_and_exemplars", "judgment"],
  ["04_structural_layer",           "structural"],
]

export function loadKB(): string {
  const parts: string[] = []

  for (const [filename, layer] of KB_FILES) {
    const path = join(KB_DIR, `${filename}.md`)
    if (existsSync(path)) {
      parts.push(`=== ${filename.toUpperCase()} [${layer}] ===\n`)
      parts.push(readFileSync(path, "utf-8"))
      parts.push("\n\n")
    }
  }

  // Learned patterns — grows over time from the feedback loop
  const learned = join(KB_DIR, "07_learned_patterns.md")
  if (existsSync(learned)) {
    parts.push("=== LEARNED_PATTERNS [feedback_loop] ===\n")
    parts.push(readFileSync(learned, "utf-8"))
    parts.push("\n\n")
  }

  return parts.join("")
}
