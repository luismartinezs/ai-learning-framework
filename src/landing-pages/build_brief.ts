import { mkdirSync, existsSync } from "fs";

const BRIEF_DIR = "domains/landing-pages/problems";

interface BriefField {
  key: string;
  label: string;
  hint: string;
  multiline: boolean;
  options?: string[];
}

const fields: BriefField[] = [
  {
    key: "product_name",
    label: "Product Name",
    hint: "The product or brand name exactly as it appears to customers.",
    multiline: false,
  },
  {
    key: "product_category",
    label: "Product Category",
    hint: "Pick the category that best fits.",
    multiline: false,
    options: ["saas", "consumer_app", "b2b_service", "ecommerce", "other"],
  },
  {
    key: "awareness_level",
    label: "Awareness Level",
    hint: "How aware is the visitor? Cold = never heard of you. Warm = knows the category. Hot = knows you, ready to buy.",
    multiline: false,
    options: ["cold", "warm", "hot"],
  },
  {
    key: "product_description",
    label: "Product Description",
    hint: "2-4 sentences. Be specific about HOW it works, not just what it does.",
    multiline: true,
  },
  {
    key: "target_audience",
    label: "Target Audience",
    hint: "Who uses this? Include role/demographics, the situation they're in, and what they already know.",
    multiline: true,
  },
  {
    key: "moment_of_need",
    label: "The Moment of Need",
    hint: "Describe the exact scene or frustration that makes someone seek this product. Be concrete.",
    multiline: true,
  },
  {
    key: "primary_problem",
    label: "Primary Problem Solved",
    hint: "One sentence. The pain, fear, or desire addressed. An outcome, not a feature.",
    multiline: false,
  },
  {
    key: "key_mechanism",
    label: "Key Mechanism",
    hint: "One sentence a non-expert would understand. What makes the promise believable?",
    multiline: false,
  },
  {
    key: "trust_barriers",
    label: "Trust Barriers",
    hint: "2-3 reasons a qualified visitor would NOT convert. Be honest about objections.",
    multiline: true,
  },
  {
    key: "real_data",
    label: "Real Data",
    hint: "Specific numbers, stats, proof points. Customer counts, metrics, pricing, results, awards.",
    multiline: true,
  },
  {
    key: "conversion_goal",
    label: "Primary Conversion Goal",
    hint: 'The single action you want. e.g. "start free trial", "book a demo".',
    multiline: false,
  },
  {
    key: "cta_commitment",
    label: "CTA Commitment Level",
    hint: "How much does the CTA ask of the visitor?",
    multiline: false,
    options: ["low", "medium", "high"],
  },
];

async function prompt(message: string): Promise<string> {
  process.stdout.write(message);
  for await (const line of console) {
    return line.trim();
  }
  return "";
}

async function promptMultiline(message: string): Promise<string> {
  console.log(message);
  console.log("  (enter a blank line when done)");
  const lines: string[] = [];
  for await (const line of console) {
    if (line.trim() === "") break;
    lines.push(line);
  }
  return lines.join("\n");
}

async function promptOptions(
  message: string,
  options: string[]
): Promise<string> {
  console.log(message);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  process.stdout.write("Choice (number or text): ");
  for await (const line of console) {
    const input = line.trim();
    const num = parseInt(input);
    if (num >= 1 && num <= options.length) return options[num - 1];
    if (options.includes(input)) return input;
    console.log(`Invalid. Pick 1-${options.length} or type the option.`);
    process.stdout.write("Choice: ");
  }
  return options[0];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildMarkdown(data: Record<string, string>): string {
  return `---
product_name: ${data.product_name}
product_category: ${data.product_category}
awareness_level: ${data.awareness_level}
---

## Product Description
${data.product_description}

## Target Audience
${data.target_audience}

## The Moment of Need
${data.moment_of_need}

## Primary Problem Solved
${data.primary_problem}

## Key Mechanism
${data.key_mechanism}

## Trust Barriers
${data.trust_barriers}

## Real Data
${data.real_data}

## Primary Conversion Goal
${data.conversion_goal}

## CTA Commitment Level
${data.cta_commitment}
`;
}

async function main() {
  console.log("\n=== Landing Page Brief Builder ===\n");

  const data: Record<string, string> = {};

  for (const field of fields) {
    console.log(`\n--- ${field.label} ---`);
    console.log(`  ${field.hint}`);

    if (field.options) {
      data[field.key] = await promptOptions("", field.options);
    } else if (field.multiline) {
      data[field.key] = await promptMultiline("");
    } else {
      data[field.key] = await prompt("> ");
    }
  }

  const markdown = buildMarkdown(data);
  const slug = slugify(data.product_name);
  const outPath = `${BRIEF_DIR}/${slug}_brief.md`;

  console.log("\n\n=== COMPLETED BRIEF ===\n");
  console.log(markdown);
  console.log(`\nWill save to: ${outPath}`);

  const confirm = await prompt("Save? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Discarded.");
    process.exit(0);
  }

  if (!existsSync(BRIEF_DIR)) mkdirSync(BRIEF_DIR, { recursive: true });
  await Bun.write(outPath, markdown);
  console.log(`Saved to ${outPath}`);
}

main();
