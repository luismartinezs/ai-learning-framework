# I run 3 experiments to test whether AI can learn and become "world class" at something

I will write this by hand because I am tried of using AI for everything and bc reddit rules

TL,DR: Can AI somehow learn like a human to produce "world-class" outputs for specific domains? I spent about $5 and 100s of LLM calls. I tested 3 domains w following observations / conclusions:

A) **code debugging**: AI are already world-class at debugging and trying to guide them results in **worse performance**. Dead end

B) **Landing page copy**: **routing strategy** depending on visitor type won over one-size-fits-all prompting strategy. Promising results

C) **UI design**: Producing "world-class" UI design seems required defining a **design system** first, it seems like can't be one-shotted. One shotting designs defaults to generic "tailwindy" UI because that is the design system the model knows. Might work but needs more testing with design system

---

I have spent the last days running some experiments more or less compulsively and curiosity driven. The question I was asking myself first is: can AI learn to be a "world-class" somewhat like a human would? Gathering knowledge, processing, producing, analyzing, removing what is wrong, learning from experience etc. But compressed in hours (aka "I know Kung Fu"). To be clear I am talking about context engineering, not finetuning (I dont have the resources or the patience for that)

I will mention world-class a handful of times. You can replace it be "expert" or "master" if that seems confusing. Ultimately, the ability of generating "world-class" output.

I was asking myself that because I figure AI output out of the box kinda sucks at some tasks, for example, writing landing copy.

I started talking with claude, and I designed and run experiments in 3 domains, one by one: code debugging, landing copy writing, UI design

I relied on different models available in OpenRouter: Gemini Flash 2.0, DeepSeek R1, Qwen3 Coder, Claude Sonnet 4.5

I am not going to describe the experiments in detail because everyone would go to sleep, I will summarize and then provide my observations

EXPERIMENT 1: CODE DEBUGGING

I picked debugging because of zero downtime for testing. The result is either wrong or right and can be checked programmatically in seconds so I can perform many tests and iterations quickly.

I started with the assumption that a prewritten knowledge base (KB) could improve debugging. I asked claude (opus 4.6) to design 8 realistic tests of different complexity then I run:

- bare model (zero shot, no instructions, "fix the bug"): 92%
- KB only: 85%
- KB + Multi-agent pipeline (diagnoser - critic -resolver: 93%

What this shows is kinda suprising to me: context engineering (or, to be more precise, the context engineering in these experiments) at best it is a waste of tokens. And at worst it lowers output quality.

Current models, not even SOTA like Opus 4.6 but current low-budget best models like gemini flash or qwen3 coder, are already world-class at debugging. And giving them context engineered to "behave as an expert", basically giving them instructions on how to debug, harms the result. This effect is stronger the smarter the model is.

What this suggests? That if a model is already an expert at something, a human expert trying to nudge the model based on their opinionated experience might hurt more than it helps (plus consuming more tokens).

And funny (or scary) enough a domain agnostic person might be getting better results than an expert because they are letting the model act without biasing it.

This might be true as long as the model has the world-class expertise encoded in the weights. So if this is the case, you are likely better off if you don't tell the model how to do things.

If this trend continues, if AI continues getting better at everything, we might reach a point where human expertise might be irrelevant or a liability. I am not saying I want that or don't want that. I just say this is a possibility.

EXPERIMENT 2: LANDING COPY

Here, since I can't and dont have the resources to run actual A/B testing experiments with a real audience, what I did was:

- Scrape documented landing copy conversion cases with real numbers: Moz, Crazy Egg, GoHenry, Smart Insights, Sunshine.co.uk, Course Hero
- Deconstructed the product or target of the page into a raw and plain description (no copy no sales)
- As claude oppus 4.6 to build a judge that scores the outputs in different dimensions

Then I run landing copy geneation pipelines with different patterns (raw zero shot, question first, mechanism first...). I'll spare the details, ask if you really need to know. I'll jump into the observations:

Context engineering helps writing landing copy of higher quality but it is not linear. The domain is not as deterministic as debugging (it fails or it breaks). It is much more depending on the context. Or one may say that in debugging all the context is self-contained in the problem itself whereas in landing writing you have to provide it.

No single config won across all products. Instead, the best strategy seems to point to a route-based strategy that points to the right config based on the user type (cold traffic, hot traffic, user intent and barriers to conversion).

Smarter models with the wrong config underperform smaller models with the right config. In other words the wrong AI pipeline can kill your landing ("the true grail will bring you life... and the false grail will take it from you", sorry I am a nerd, I like movie quotes)

Current models already have all the "world-class" knowledge to write landings, but they need to first understand the product and the user and use a strategy depending on that.

If I had to keep one experiment, I would keep this one.

The next one had me a bit disappointed ngl...

EXPERIMENT 3: UI DESIGN

I am not a designer (I am dev) and to be honest, if I zero-shot UI desings with claude, they don't look bad to me, they look neat. Then I look online other "vibe-coded" sites, and my reaction is... "uh... why this looks exactly like my website". So I think that AI output designs which are not bad, they are just very generic and "safe", and lack any identity. To a certain extent I don't care. If the product does the thing, and doesn't burn my eyes, it's kinda enough. But it is obviously not "world-class", so that is why I picked UI as the third experiment.

I tried a handful of experiments with help of opus 4.6 and sonnet, with astro and tailwind for coding the UI.

My visceral reaction to all the "engineered" designs is that they looked quite ugly (images in the blogpost linked below if you are curious).

I tested one single widget for one page of my product, created a judge (similar to the landing copy experiment) and scored the designs by taking screenshots.

Adding information about the product (describing user emotions) as context did not produce any change, the model does not know how to translate product description to any meaningful design identity.

Describing a design direction as context did nudge the model to produce a completely different design than the default (as one might expect)

If I run an interative revision loop (generate -> critique -> revision x 2) the score goes up a bit but plateaus and can even see regressions. Individual details can improve but the global design lacks coherence or identity

The primary conclusion seems to be that the model cannot effectively create coherent functional designs *directly* with prompt engineering, but it can create coherent designs zero-shot because (loosely speaking) the model defaults to a generic and default design system (the typical AI design you have seen a million times by now)

So my assumption (not tested mainly because I was exhausted of running experiments) is that using AI to create "world-class" UI design would require a separate generation of a design system, and *then* this design system would be used to create coherent UI designs.

So to summarize:

- Zero shot UI design: the model defaults to the templatey design system that works, the output looks clean but generic
- Prompt engineering (as I run it in this experiment): the model stops using the default design system but then produces incoherent UI designs that imo tend to look worse (it is a bit subjective)

Of course I could just look for a prebaked design system and run the experiment, I might do it another day.

CONCLUSIONS

- If model is already an expert, trying to tell it how to operate outputs worse results (and wastes tokens) / If you are a (human) domain expert using AI, sometimes the best is for you to shut up
- Prompt architecture even if it benefits cheap models it might hurt frontier models
- Routing strategies (at least for landing copy) might beat universal optimization
- Good UI design (at least in the context of this experiment) requires (hypothetically) design-system-first pipeline, define design system once and then apply it to generate UI

I'm thinking about packaging the landing copy writer as a tool bc it seems to have potential. Would you pay $X to run your landing page brief through this pipeline and get a scored output with specific improvement guidance? To be clear, this would not be a generic AI writing tool (they already exist) but something that produces scored output and is based on real measurable data.

This is the link to a blogpost explaining the same with some images, but this post is self contained, only click there if you are curious or not yet asleep

https://www.webdevluis.com/blog/ai-output-world-class-experiment