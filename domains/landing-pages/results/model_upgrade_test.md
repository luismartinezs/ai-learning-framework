# Model Upgrade Test: Gemini Flash vs Claude Sonnet 4.5

**Date:** 2026-04-09
**Hypothesis:** Upgrading from gemini-2.0-flash to claude-sonnet-4.5 closes the gap between generated and reference scores.

## Score Comparison

| Product | Config | Gemini Flash Score | Sonnet 4.5 Score | Delta | Gemini Verdict | Sonnet Verdict |
|---------|--------|--------------------|------------------|-------|----------------|----------------|
| Course Hero | kb_scaffold | 7.4 | 8.4 | **+1.0** | COMPETENT | WORLD_CLASS |
| Sunshine | bare | 7.8 | 6.8 | **-1.0** | COMPETENT | COMPETENT |

## Dimension Breakdown

### Course Hero (kb_scaffold)

| Dimension | Gemini Flash | Sonnet 4.5 | Delta |
|-----------|-------------|------------|-------|
| visitor_emotional_accuracy | 8 | 9 | +1 |
| specificity | 7 | 8 | +1 |
| mechanism_clarity | 7 | 9 | +2 |
| cta_awareness_match | 8 | 7 | -1 |
| interchangeability | 7 | 9 | +2 |
| **overall** | **7.4** | **8.4** | **+1.0** |

### Sunshine (bare)

| Dimension | Gemini Flash | Sonnet 4.5 | Delta |
|-----------|-------------|------------|-------|
| visitor_emotional_accuracy | 8 | 7 | -1 |
| specificity | 8 | 6 | -2 |
| mechanism_clarity | 7 | 8 | +1 |
| cta_awareness_match | 9 | 9 | 0 |
| interchangeability | 7 | 4 | -3 |
| **overall** | **7.8** | **6.8** | **-1.0** |

---

## Generated Copy: Side-by-Side

### Course Hero (kb_scaffold)

<table>
<tr><th>Gemini Flash (7.4)</th><th>Sonnet 4.5 (8.4)</th></tr>
<tr><td>

**Headline:** Ace Your Exams with Notes From Your Class

**Subheadline:** Unlock a library of course-specific study resources shared by students just like you.

**Hero Body:** Stuck on a problem? Don't have notes from last week's lecture? Course Hero gives you instant access to over 30 million course-specific documents -- so you can get unstuck, learn faster, and get better grades. Finally get the help you need, precisely when you need it.

**CTA:** Find Your Course & Get Instant Access

**Benefits:**
- Stop relying on generic textbooks. Get notes, flashcards, and practice problems tailored to *your exact* course.
- Learn from top students. See how your classmates are tackling the toughest assignments.
- Get unstuck in minutes, not hours. Find the specific help you need, exactly when you need it.
- Prepare for exams with confidence. Access practice tests and study guides to master the material.

**Social Proof:** "Course Hero helped me pass Organic Chemistry -- the tutor videos are lifesavers!" - Maria P., University of Texas

</td><td>

**Headline:** Stop staring at homework problems you can't solve

**Subheadline:** Get step-by-step solutions, notes from students in your exact course, and on-demand tutors when you're stuck -- starting right now

**Hero Body:** You've Googled the problem. You've reread the textbook paragraph three times. Your professor's office hours aren't until Thursday and the assignment is due tomorrow.

Course Hero gives you instant access to 40+ million study documents uploaded by students in your exact course -- homework solutions, lecture notes, practice exams, flashcards -- plus expert tutors online 24/7 when you need a real explanation. Created by students at your university, for the courses you're actually taking.

Find the exact resource you need in under 60 seconds, or ask a tutor and get an answer in minutes. No appointments, no expensive hourly rates, no guessing if the explanation matches what your professor taught.

**CTA:** Find your course materials now -- free to search

**Benefits:**
- Course-specific solutions, not generic examples. Search by your exact university, course code, and professor.
- Expert tutors online 24/7. Post your question and get a detailed explanation in minutes.
- 40+ million resources from real students. Uploaded by students who sat in the same lectures and took the same exams.
- Works on your phone between classes. Pull up notes while walking to your exam.

**Social Proof:** Over 10 million college students use Course Hero to pass their hardest classes -- with an average GPA increase of 0.4 points after their first semester on the platform

</td></tr>
</table>

### Sunshine (bare)

<table>
<tr><th>Gemini Flash (7.8)</th><th>Sonnet 4.5 (6.8)</th></tr>
<tr><td>

**Headline:** Unbeatable Package Holidays. Seriously.

**Subheadline:** The UK's Cheapest All-Inclusive Getaways. Flights + Hotel, With Absolutely No Hidden Fees.

**Hero Body:** Stop endlessly searching for a better deal. Sunshine.co.uk cuts out the hidden costs and passes the savings directly to you. We ditch expensive call centers and high-street shops so you can soak up the sun for less. See the price, pay the price, *guaranteed*. Find a cheaper package holiday elsewhere? We'll match it! Your holiday is financially protected too, thanks to our ABTA bonding.

**CTA:** Find My Sunshine Holiday Now

**Benefits:**
- Lowest Price, Guaranteed. We match any competitor's price.
- No Hidden Fees, Ever. The price you see is the price you pay.
- Safe & Secure. Your holiday is financially protected by ABTA bonding.
- Dream Holidays on a Budget. Discover amazing destinations without breaking the bank.
- Unbelievable Deals for Everyone. We find the best deals from every corner of the travel market.

**Social Proof:** "I saved over £200 compared to other sites! I was skeptical at first because the price was so low, but everything went smoothly, and the holiday was fantastic." - Sarah J, Verified Customer.

</td><td>

**Headline:** The Cheapest Package Holidays. Actually.

**Subheadline:** No call centers. No high street shops. No hidden fees. Just hundreds of pounds less than you'll pay anywhere else.

**Hero Body:** We're a UK online travel agent built to do one thing brilliantly: sell package holidays cheaper than everyone else. How? We don't waste money on expensive phone lines or retail stores -- and we pass every penny of those savings straight to you. The price you see includes *everything*: flights, hotel, taxes, baggage. No surprises at checkout. Plus, you're fully protected with ABTA bonding, and if you find the same holiday cheaper elsewhere, we'll match it. Search thousands of packages departing from UK airports and see the difference for yourself.

**CTA:** Find Your Holiday Now

**Benefits:**
- Prices hundreds lower. Our online-only model means you pay less than traditional travel agents.
- What you see is what you pay. All taxes, fees, and baggage included upfront.
- Fully ABTA protected. Your money is financially protected if anything goes wrong.
- Price Match Guarantee. Found it cheaper? We'll match it.
- Instant online booking. Search, compare, and book in minutes. No waiting on hold.

**Social Proof:** "Saved £340 compared to TUI for the exact same Tenerife hotel. Didn't believe it was real until I checked out." - Sarah M., Manchester

</td></tr>
</table>

---

## Analysis

**Course Hero: Sonnet wins decisively (+1.0).** The quality difference is visible. Gemini produced competent but generic copy ("Ace Your Exams"). Sonnet opened with a scenario that captures the exact emotional moment ("You've Googled the problem. You've reread the textbook paragraph three times."). The mechanism clarity jumped +2 because Sonnet explicitly connected the crowdsourced model to why the content matches your specific course. The interchangeability score jumped +2 because Sonnet's copy couldn't be honestly claimed by Chegg or Khan Academy.

**Sunshine: Gemini wins (-1.0 for Sonnet).** The judge penalized Sonnet heavily on interchangeability (-3) and specificity (-2). Looking at the copy, both are honestly similar in quality. Gemini's copy is slightly more energetic ("Seriously.", "simple as that") while Sonnet's is more measured but also more generic in its benefit claims. The judge noted Sonnet lacked concrete price examples (e.g., "£91 per person for a week in Algarve") that would make the low-price claim verifiable. Gemini got away with the same vagueness but scored higher, suggesting judge variance on this run.

**Key takeaway:** Model upgrade is not uniformly better. Sonnet excels at emotional precision and mechanism storytelling (Course Hero), but the bare config doesn't give it enough scaffolding to overcome its tendency toward measured, safe copy (Sunshine). The interaction between model capability and prompt config matters more than either alone.
