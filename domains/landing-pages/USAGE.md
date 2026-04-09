# Landing Page Copy Pipeline

AI pipeline that generates and scores landing page copy. Takes a product brief, routes it through the best-fit prompt strategy, and returns scored copy with per-dimension feedback.

## Prerequisites

- `OPENROUTER_API_KEY` in `.env`
- `bun` runtime

## Quick Start (3 commands)

```bash
# 1. Create a product brief
bun src/landing-pages/build_brief.ts

# 2. Generate copy (routed mode picks the best strategy automatically)
bun src/landing-pages/run.ts --product your_product --routed

# 3. Check the result
cat domains/landing-pages/results/your_product_routed_*.json
```

## Step-by-Step

### Step 1: Create the Brief

```bash
bun src/landing-pages/build_brief.ts
```

Interactive CLI that walks you through 12 fields:

| Field | What to write |
|-------|---------------|
| Product Name | Exact customer-facing name |
| Product Category | `saas`, `consumer_app`, `b2b_service`, `ecommerce`, `other` |
| Awareness Level | `cold` (never heard of you), `warm` (knows the category), `hot` (ready to buy) |
| Product Description | 2-4 sentences. HOW it works, not just what it does |
| Target Audience | Role, situation they're in, what they already know |
| Moment of Need | The exact scene that makes someone search for this. Be concrete |
| Primary Problem | One sentence. The outcome, not a feature |
| Key Mechanism | One sentence a non-expert would understand. What makes the promise believable |
| Trust Barriers | 2-3 honest reasons a qualified visitor would NOT convert |
| Real Data | Numbers, stats, pricing, proof points |
| Conversion Goal | Single action: "start free trial", "buy Trip Pass", etc. |
| CTA Commitment | `low` (free/no card), `medium` (card required), `high` (paid upfront) |

Saves to: `domains/landing-pages/problems/{slug}_brief.md`

**Alternative:** Write the brief file directly. See `domains/landing-pages/brief_template.md` for the format, or any existing brief in `domains/landing-pages/problems/` for a working example.

### Step 2: Create the Reference Example

The judge uses a reference copy file for calibration. Create one at:

```
domains/landing-pages/examples/{slug-with-hyphens}.md
```

Note the naming: briefs use underscores (`menu_decoder`), examples use hyphens (`menu-decoder`).

**If your product has an existing landing page:** Document its real copy (headline, subheadline, CTA, benefits, social proof). See `domains/landing-pages/examples/crazy-egg.md` for the format.

**If your product is new (no existing page):** Write a baseline version of what you'd put on the page. It doesn't need to be good. The judge uses it for calibration, not as a target to match.

### Step 3: Generate Copy

**Routed mode (recommended).** The pipeline classifies your product's primary conversion barrier, then picks the best prompt strategy and model:

```bash
bun src/landing-pages/run.ts --product your_product --routed
```

**Single config mode.** Force a specific strategy:

```bash
bun src/landing-pages/run.ts --product your_product --config mechanism_first
```

**All configs.** Run all 6 strategies and compare:

```bash
bun src/landing-pages/run.ts --product your_product
```

**All products, all configs (full matrix):**

```bash
bun src/landing-pages/run.ts
```

### Step 4: Read the Results

Each run saves a JSON file to `domains/landing-pages/results/`:

```
{slug}_{config}_{timestamp}.json
```

The JSON contains:

- `generated_copy` -- the full landing page copy
- `judge_score` -- per-dimension scores, overall score, verdict, key weakness/strength
- `config` / `model` -- which strategy and model were used
- In routed mode: routing reasoning and barrier classification

A summary table is also appended to `domains/landing-pages/results/summary.md`.

## How Scoring Works

The judge evaluates on 5 dimensions (0-10 each):

| Dimension | What it measures |
|-----------|-----------------|
| **visitor_emotional_accuracy** | Does the copy address the actual fear/frustration the visitor arrives with? |
| **specificity** | Is it concrete and particular to this product, or vague/interchangeable? |
| **mechanism_clarity** | Does the visitor understand HOW the product delivers on the promise? |
| **cta_awareness_match** | Does the CTA ask for a commitment level the page has earned? |
| **interchangeability** | Could this copy be pasted onto a competitor's page? (inverted: unique = high) |

**Verdicts:**
- **WORLD_CLASS** (>= 8.0) -- Copy that a conversion specialist would approve
- **COMPETENT** (>= 6.0) -- Functional but generic or missing a dimension
- **GENERIC** (< 6.0) -- Could be any product

The `key_weakness` field tells you exactly what to fix. The `key_strength` tells you what to keep.

## How Routing Works

When you use `--routed`, the pipeline:

1. **Classifies** your brief's conversion barrier using a lightweight model (Gemini Flash):
   - Awareness level: cold / warm / hot
   - Barrier type: emotional / rational / mixed
   - Mechanism gap: does the product need its "how" explained?

2. **Routes** to the best config + model based on classification:

| Condition | Config | Model | Why |
|-----------|--------|-------|-----|
| Has mechanism gap | `mechanism_first` | Claude Sonnet | Surfaces technical credibility |
| Hot traffic | `bare` | Gemini Flash | Directness converts hot visitors |
| Cold + any barrier | `question_first` | Default | Emotional framing for strangers |
| Warm + rational | `kb_scaffold` | Claude Sonnet | Principles-driven differentiation |
| Warm + emotional/mixed | `few_shot` | Default | Examples provide the right frame |

3. **Generates** copy using the selected config and model.

## The 6 Configs

| Config | Strategy |
|--------|----------|
| `bare` | Minimal prompt. Baseline for comparison |
| `question_first` | Forces the model to answer 3 visitor psychology questions before writing |
| `mechanism_first` | Forces the model to surface the product's specific mechanism first |
| `kb_scaffold` | Injects landing page principles (awareness spectrum, specificity, anti-patterns) |
| `few_shot` | Provides 2 example products (brief + copy pairs) as demonstrations |
| `constraint_aware` | Makes trust barriers the structural spine of the copy |

## Other Commands

**Judge ceiling test.** Checks whether the judge can score 8+ on real reference copy (sanity check for judge calibration):

```bash
bun src/landing-pages/judge-ceiling.ts
```

**Override the default model:**

```bash
MODEL=anthropic/claude-sonnet-4-5 bun src/landing-pages/run.ts --product your_product
```

## File Layout

```
domains/landing-pages/
├── USAGE.md              # This file
├── brief_template.md     # Template showing brief format
├── kb/
│   └── 01_principles.md  # Knowledge base (used by kb_scaffold config)
├── problems/
│   └── {slug}_brief.md   # Product briefs
├── examples/
│   └── {slug}.md         # Reference copy (hyphens, not underscores)
└── results/
    ├── {slug}_{config}_{timestamp}.json  # Individual results
    └── summary.md                        # Cumulative results log
```
