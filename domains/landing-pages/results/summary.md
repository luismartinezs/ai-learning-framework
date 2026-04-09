# Landing Pages Experiment — Results Log

---
## Run: 2026-04-09T06-04-48
Model: google/gemini-2.0-flash-001
Products: crazy_egg
Configs: bare

| Product | bare |
|---------|--------|
| Crazy Egg | 7 COMPETENT |

---
## Run: 2026-04-09T06-04-57
Model: google/gemini-2.0-flash-001
Products: moz
Configs: bare

| Product | bare |
|---------|--------|
| Moz (formerly SEOmoz) | 7.6 COMPETENT |

---
## Run: 2026-04-09T06-10-13
Model: google/gemini-2.0-flash-001
Products: crazy_egg
Configs: question_first

| Product | question_first |
|---------|--------|
| Crazy Egg | 6.8 COMPETENT |

---
## Run: 2026-04-09T06-16-32
Model: google/gemini-2.0-flash-001
Products: course_hero, moz, crazy_egg, smart_insights, gohenry, sunshine
Configs: bare, question_first, kb_scaffold, few_shot

| Product | bare | question_first | kb_scaffold | few_shot |
|---------|--------|--------|--------|--------|
| Course Hero | 6 COMPETENT | 6 COMPETENT | 6.6 COMPETENT | 6.4 COMPETENT |
| Moz (formerly SEOmoz) | 7.6 COMPETENT | 6.4 COMPETENT | 7.2 COMPETENT | 7.4 COMPETENT |
| Crazy Egg | 6.8 COMPETENT | 7.4 COMPETENT | 7.2 COMPETENT | 7.8 COMPETENT |
| Smart Insights | 6.6 COMPETENT | 5.4 GENERIC | 6.2 COMPETENT | 7 COMPETENT |
| GoHenry | 6.2 COMPETENT | 7.4 COMPETENT | 6.8 COMPETENT | 6.6 COMPETENT |
| Sunshine.co.uk | 7.4 COMPETENT | 6 COMPETENT | 6.6 COMPETENT | 6.6 COMPETENT |

---
## Run: 2026-04-09T06-44-40
Model: google/gemini-2.0-flash-001
Products: crazy_egg
Configs: mechanism_first

| Product | mechanism_first |
|---------|--------|
| Crazy Egg | 7.2 COMPETENT |

---
## Run: 2026-04-09T06-46-15
Model: google/gemini-2.0-flash-001
Products: smart_insights
Configs: mechanism_first

| Product | mechanism_first |
|---------|--------|
| Smart Insights | 7.2 COMPETENT |

---
## Run: 2026-04-09T06-49-00
Model: google/gemini-2.0-flash-001
Products: crazy_egg
Configs: constraint_aware

| Product | constraint_aware |
|---------|--------|
| Crazy Egg | 7 COMPETENT |

---
## Run: 2026-04-09T06-49-07
Model: google/gemini-2.0-flash-001
Products: sunshine
Configs: constraint_aware

| Product | constraint_aware |
|---------|--------|
| Sunshine.co.uk | 7.4 COMPETENT |

---
## Run: 2026-04-09T06-49-15
Model: google/gemini-2.0-flash-001
Products: smart_insights
Configs: constraint_aware

| Product | constraint_aware |
|---------|--------|
| Smart Insights | 6.8 COMPETENT |

---
## Run: 2026-04-09T07-12-02
Model: google/gemini-2.0-flash-001
Products: course_hero
Configs: kb_scaffold

| Product | kb_scaffold |
|---------|--------|
| Course Hero | 7.4 COMPETENT |

---
## Run: 2026-04-09T07-12-09
Model: google/gemini-2.0-flash-001
Products: sunshine
Configs: bare

| Product | bare |
|---------|--------|
| Sunshine.co.uk | 7.8 COMPETENT |

---
## Run: 2026-04-09T07-12-38
Model: anthropic/claude-sonnet-4-5
Products: course_hero
Configs: kb_scaffold

| Product | kb_scaffold |
|---------|--------|
| Course Hero | 8.4 WORLD_CLASS |

---
## Run: 2026-04-09T07-13-03
Model: anthropic/claude-sonnet-4-5
Products: sunshine
Configs: bare

| Product | bare |
|---------|--------|
| Sunshine.co.uk | 6.8 COMPETENT |

---
## Run: 2026-04-09T07-41-59
Mode: fixed
Model: google/gemini-2.0-flash-001
Products: course_hero, moz, crazy_egg, smart_insights, gohenry, sunshine
Configs: bare, question_first, mechanism_first, kb_scaffold, few_shot, constraint_aware

| Product | bare | question_first | mechanism_first | kb_scaffold | few_shot | constraint_aware |
|---------|--------|--------|--------|--------|--------|--------|
| Course Hero | 6.6 COMPETENT | 7.2 COMPETENT | 6.4 COMPETENT | 7.2 COMPETENT | 6.8 COMPETENT | 7.8 COMPETENT |
| Moz (formerly SEOmoz) | 7.6 COMPETENT | 7.2 COMPETENT | 6.8 COMPETENT | 7.4 COMPETENT | 7.6 COMPETENT | 7.2 COMPETENT |
| Crazy Egg | 7.4 COMPETENT | 7.4 COMPETENT | 7.2 COMPETENT | 7.6 COMPETENT | 7.8 COMPETENT | 8 WORLD_CLASS |
| Smart Insights | 6.6 COMPETENT | 6.4 COMPETENT | 7.2 COMPETENT | - | 7.4 COMPETENT | 7 COMPETENT |
| GoHenry | 6.6 COMPETENT | 7.2 COMPETENT | 7.4 COMPETENT | 7.4 COMPETENT | 7.4 COMPETENT | 7.8 COMPETENT |
| Sunshine.co.uk | 7.6 COMPETENT | 7.4 COMPETENT | 7.6 COMPETENT | 7.2 COMPETENT | 6.8 COMPETENT | 7.6 COMPETENT |

---
## Run: 2026-04-09T07-44-42
Mode: routed
Model: google/gemini-2.0-flash-001
Products: crazy_egg
Configs: routed_mechanism_first

| Product | routed_mechanism_first |
|---------|--------|
| Crazy Egg | 7.4 COMPETENT |

---
## Run: 2026-04-09T07-48-14
Mode: routed
Products: crazy_egg
Configs: routed_mechanism_first

| Product | Config | Model | Score |
|---------|--------|-------|-------|
| Crazy Egg | routed_mechanism_first | anthropic/claude-sonnet-4-5 | 7.6 COMPETENT |

---
## Run: 2026-04-09T08-01-57
Mode: routed
Products: menu_decoder
Configs: routed_mechanism_first

| Product | Config | Model | Score |
|---------|--------|-------|-------|
| Menu Decoder | routed_mechanism_first | anthropic/claude-sonnet-4-5 | 8.4 WORLD_CLASS |
