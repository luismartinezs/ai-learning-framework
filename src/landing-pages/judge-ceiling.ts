/**
 * judge-ceiling.ts — test whether the judge can score 8+
 *
 * Extracts reference copy from each example, formats it as pipeline output,
 * and runs it through the judge. This tests judge calibration, not generation.
 *
 * bun src/landing-pages/judge-ceiling.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { join }                                     from "path"
import { judgeLandingCopy }                         from "./judge.ts"
import { MODEL }                                   from "../shared/client.ts"

const DOMAINS_DIR  = join(import.meta.dir, "..", "..", "domains", "landing-pages")
const BRIEFS_DIR   = join(DOMAINS_DIR, "problems")
const EXAMPLES_DIR = join(DOMAINS_DIR, "examples")
const RESULTS_DIR  = join(DOMAINS_DIR, "results")

// ─── Reference copy extracted from each example, formatted as pipeline output ──

const REFERENCE_COPIES: Record<string, string> = {

  crazy_egg: `## Headline
See what's wrong with your website.

## Subheadline
Over 449,000+ websites use Crazy Egg for Heatmaps, Recordings, A/B Testing, Web Analytics, and more.

## Hero Body
You're driving traffic to your site, but something's not working. Google Analytics tells you what's happening, but not why. Are visitors missing your call to action? Getting confused by your layout? Scrolling right past your best content?

Crazy Egg shows you exactly where visitors click, how far they scroll, and what they ignore. Heatmaps, scrollmaps, and session recordings give you eye-tracking-level insight at a fraction of the cost. Carnegie Mellon research found 88% correlation between eye movement and mouse movement. A formal eye-tracking study costs six figures and takes months. Crazy Egg gives you comparable visitor intelligence for a tiny fraction of the cost, in minutes.

And unlike Google Analytics, Crazy Egg doesn't drown you in data tables. You get visual reports you can act on immediately. Fewer features means less data overload, not less insight. Sometimes less is more.

## Primary CTA
Start your 30-day FREE trial

## Key Benefits
- See where visitors click, scroll, and get stuck with visual heatmaps and scrollmaps
- Watch real visitor sessions to understand the "why" behind your analytics
- Run A/B tests and learn what drives more conversions, no coding required
- Get real-time traffic reporting without confusing configuration or navigation
- Easy setup, unlimited seats, unlimited domains

## Social Proof Hook
Over 449,000 websites trust Crazy Egg. When we asked our customers to share how they use heatmaps, the results spoke for themselves.`,

  moz: `## Headline
When eBay, Disney, and Marriott need SEO help, here's what they do...

## Subheadline
They use SEOmoz PRO. And for $1, you can too.

## Hero Body
You already know SEO matters. You've read the blog posts, tried the free tools, maybe even attended a conference. But you're still guessing which changes will actually move your rankings.

SEOmoz PRO gives you the same keyword research, site optimization, and link building tools that Fortune 500 companies rely on. But the tool most paid members love? Our Q&A service. Submit your specific SEO question and get a personalized, detailed answer from our expert staff. Not a forum post. Not a generic FAQ. A real answer to your real problem.

Here's what's included in PRO that you can't get with a free account: keyword difficulty scores, on-page optimization reports, crawl diagnostics for your entire site, competitive link analysis, and unlimited Q&A submissions with expert responses.

## Primary CTA
Get a full month of PRO for just $1

## Key Benefits
- Keyword research tools used by eBay, Disney, and Marriott
- Personalized Q&A: submit your SEO question, get an expert answer
- Site crawl diagnostics that find the issues hurting your rankings
- Competitive link analysis to see exactly how rivals outrank you
- Full-featured access for $1 for your first month, cancel anytime

## Social Proof Hook
"I've been doing SEO for 8 years and SEOmoz PRO is the first tool that actually changed how I work." Trusted by Fortune 500 marketing teams and independent SEO professionals alike.`,

  course_hero: `## Headline
Join more than 10 million students and educators on Course Hero

## Subheadline
The largest (and best) collection of study resources, flashcards, and expert tutors. Free to create an account.

## Hero Body
You've got an exam tomorrow and your notes aren't cutting it. You need the specific study guide for your course, not a generic textbook summary. Course Hero has thousands of course-specific documents, flashcards, and study guides uploaded by students and educators who've already taken the class you're in right now.

Can't find what you need? Ask one of our hundreds of expert tutors. They don't give you a link to a FAQ. They answer your specific question with a detailed, personalized explanation.

## Primary CTA
Create my FREE account

## Key Benefits
- Access thousands of course-specific study guides, notes, and flashcards
- Get personalized answers from hundreds of expert tutors
- Find resources for your exact course and professor
- Join more than 10 million students and educators already on the platform
- Free to create an account, no credit card required

## Social Proof Hook
More than 10 million students and educators already use Course Hero to study smarter, not harder.`,

  gohenry: `## Headline
The Visa debit card designed to teach your child about money

## Subheadline
Trusted by Visa. Built for kids ages 8-18. Try it free for 30 days.

## Hero Body
You want your child to understand money before they're on their own. But handing them cash doesn't teach budgeting. And your bank doesn't offer accounts designed for kids to actually learn from.

GoHenry gives your child their own Visa debit card with real-time spending controls you manage from your phone. Set weekly allowances, define where they can spend, and watch them learn to save and budget with real money in a safe environment.

This isn't just a payment card. It's a financial education tool. Your child sees their balance, tracks their spending, and learns to make choices about money. Visual diagrams show them exactly how their money works. And because it's backed by Visa, their card works everywhere, with the same protections you'd expect.

## Primary CTA
Start your free trial

## Key Benefits
- Your child gets their own Visa debit card that works everywhere
- Set spending limits, allowances, and savings goals from your phone
- Real-time notifications every time your child spends
- Financial education built in: your child learns budgeting with real money
- Cancel anytime during your 30-day free trial

## Social Proof Hook
Backed by Visa. Ranked in the FinTech 100. Winner of the Sunday Times Fast Track 100 for growth.`,

  smart_insights: `## Headline
Digital marketing is hard. You already know that.

## Subheadline
Get the guides, templates, and expert frameworks that Dr. Dave Chaffey and team use with clients like GQ, WIRED, and Glamour.

## Hero Body
You've read the blog posts. Watched the webinars. Downloaded the free PDFs. But you're still not sure which channels to prioritize, which metrics matter, or whether your strategy has gaps you can't see.

Smart Insights gives you the complete toolkit: step-by-step guides, ready-to-use templates, e-books, and training modules covering every aspect of digital marketing. Not theory. Actionable frameworks you can apply to your business this week.

Think of it this way: hiring Dr. Dave Chaffey's team for a personal consultation would cost thousands. A Smart Insights membership gives you the same strategic frameworks, templates, and training for a fraction of that cost. And you get instant access the moment you join.

## Primary CTA
Join Smart Insights

## Key Benefits
- Complete digital marketing guides from strategy to execution
- Ready-to-use templates for SEO, email, social, paid, and analytics
- Training modules you can apply to your business this week
- Frameworks from Dr. Dave Chaffey, named one of "50 gurus who shaped the future of marketing"
- Instant access to the full library the moment you join

## Social Proof Hook
Dr. Dave Chaffey, recognized by the Chartered Institute of Marketing as one of "50 gurus who shaped the future of marketing," has worked with GQ, New Yorker, WIRED, and Glamour.`,

  sunshine: `## Headline
Cheap holidays you can actually trust

## Subheadline
Lowest-price guarantee. No hidden charges. ABTA-bonded for your protection.

## Hero Body
You've found a deal that looks too good to be true. £91 per person for a week in the Algarve, flights and hotel included. So what's the catch?

There isn't one. That price includes baggage fees, taxes, fuel surcharges, and even supplier failure cover. Most travel sites charge extra for all of those. We don't, because we don't have expensive call centres or high street offices. We pass those savings directly to you.

And if you find a cheaper price anywhere else? We'll refund the difference and give you a fiver on top.

## Primary CTA
Search holidays

## Key Benefits
- Lowest-price guarantee: find it cheaper elsewhere and we'll refund the difference, plus give you £5
- Price includes everything: baggage, taxes, fuel surcharges, and supplier failure cover
- ABTA-bonded: your booking and holiday are financially protected
- Peace of mind: if a supplier goes bust, claim your money back from us
- No hidden charges, ever. The price you see is the price you pay.

## Social Proof Hook
ABTA-bonded and trusted by hundreds of thousands of UK holiday-makers. Where's our phone number? We don't have expensive call centres, so we pass those savings to you.`,
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!process.env.OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY not set.")
  process.exit(1)
}

mkdirSync(RESULTS_DIR, { recursive: true })

console.log(`Model: ${MODEL}`)
console.log(`Testing judge ceiling with reference copy...\n`)

interface CeilingResult {
  product: string
  visitor_emotional: number | string
  specificity: number | string
  mechanism: number | string
  cta_match: number | string
  interchangeability: number | string
  overall: number | string
  verdict: string
}

const results: CeilingResult[] = []

const slugs = Object.keys(REFERENCE_COPIES)

for (const slug of slugs) {
  const briefPath   = join(BRIEFS_DIR, `${slug}_brief.md`)
  const examplePath = join(EXAMPLES_DIR, `${slug.replace(/_/g, "-")}.md`)

  const brief         = readFileSync(briefPath, "utf-8")
  const referenceCopy = readFileSync(examplePath, "utf-8")
  const formattedCopy = REFERENCE_COPIES[slug]

  console.log(`  ${slug}: judging reference copy...`)

  // The generated copy IS the reference copy (formatted), and we pass
  // the raw example as the reference for calibration
  const score = await judgeLandingCopy(brief, formattedCopy, referenceCopy, MODEL)

  if (score) {
    results.push({
      product: slug,
      visitor_emotional: score.visitor_emotional_accuracy.score,
      specificity: score.specificity.score,
      mechanism: score.mechanism_clarity.score,
      cta_match: score.cta_awareness_match.score,
      interchangeability: score.interchangeability.score,
      overall: score.overall_score,
      verdict: score.verdict,
    })
    console.log(`  ${slug}: ${score.overall_score} ${score.verdict}`)
    console.log(`    strength: ${score.key_strength}`)
    console.log(`    weakness: ${score.key_weakness}\n`)
  } else {
    results.push({
      product: slug,
      visitor_emotional: "?",
      specificity: "?",
      mechanism: "?",
      cta_match: "?",
      interchangeability: "?",
      overall: "?",
      verdict: "PARSE_ERROR",
    })
    console.log(`  ${slug}: PARSE ERROR\n`)
  }
}

// ─── Build table ──────────────────────────────────────────────────────────────

const header = "| Product | visitor_emotional | specificity | mechanism | cta_match | interchangeability | overall | verdict |"
const sep    = "|---------|------------------|-------------|-----------|-----------|-------------------|---------|---------|"
const rows = results.map(r =>
  `| ${r.product} | ${r.visitor_emotional} | ${r.specificity} | ${r.mechanism} | ${r.cta_match} | ${r.interchangeability} | ${r.overall} | ${r.verdict} |`
)

const table = [header, sep, ...rows].join("\n")

console.log("\n" + "═".repeat(60))
console.log("  JUDGE CEILING TEST")
console.log("═".repeat(60))
console.log()
console.log(table)

// Save
const output = `# Judge Ceiling Test — Reference Copy Scores\n\nModel: ${MODEL}\nDate: ${new Date().toISOString().slice(0, 10)}\n\nPurpose: Test whether the judge can score 8+ when given the actual reference copy.\nIf reference copy can't hit 8+, the ceiling is in judge calibration, not generation.\n\n${table}\n`

writeFileSync(join(RESULTS_DIR, "reference_scores.md"), output)
console.log(`\nSaved → domains/landing-pages/results/reference_scores.md`)
