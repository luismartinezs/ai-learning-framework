[PRODUCT CONTEXT]
Menu Decoder is for travelers with dietary restrictions — anxious,
abroad, at a restaurant table. Safety status is the most important
information. The visual hierarchy must make safe/unsafe instantly
scannable without reading any text. The user is relieved by green,
anxious by red. The UI should feel like a calm, trustworthy tool
built by someone who took the risk seriously.

[VISUAL DIRECTION]
Dark background. Tight, precise typography.
Color used exclusively to signal safety status — green, amber, red —
nowhere else on the screen. The safety badges are the only thing
with chromatic color. Everything else is achromatic.

The camera viewfinder should feel like a real viewfinder — dark,
with subtle corner bracket overlays, not a rounded card with a
placeholder icon.

The dish list should feel dense and scannable — the safety badge
should be the dominant visual element in each row, not secondary
to the dish name.

The FAB should feel like a primary action, not a floating decoration.

[ANTI-PATTERNS TO AVOID]
- Default Tailwind card pattern (white bg, shadow, rounded-xl)
- Blue (#3b82f6) as accent color anywhere
- Gradient backgrounds
- Decorative shadows that don't serve a functional purpose
- Rounded corners on the viewfinder (it's a camera, not a card)
- Any element that could be copy-pasted from a Tailwind UI template
  unchanged

[TASK]
Build the UI component described in the functional spec below,
following the product context and visual direction above.
Before writing any code, decide: what is the single most important
visual decision this screen needs to make? State it in one sentence
as a comment at the top of the file, then build to that decision.

[FUNCTIONAL SPEC]
{{FUNCTIONAL_SPEC}}
