---
Build a single mobile screen mockup for Menu Decoder.
Mobile web dimensions: 375px wide, 812px tall.

Screen elements:
- Camera viewfinder area taking up the top 60% of the screen.
  Show it as a dark rectangle with a subtle corner-bracket overlay
  (like a camera focus frame). A small label "Point at menu" centered
  inside it.
- Below the viewfinder: a scrollable list of 4 detected dishes.
  Each dish row shows:
    - Dish name (left aligned)
    - A safety badge on the right: one of "Safe" (green),
      "Warning" (amber), or "Unsafe" (red)
  Use these four example dishes:
    1. Pad Thai Noodles — Warning
    2. Green Papaya Salad — Safe
    3. Tom Yum Soup — Unsafe
    4. Mango Sticky Rice — Safe
- A floating action button (FAB) centered at the bottom of the screen,
  above the dish list. Label: "Scan Menu". This is the primary action.
- A bottom bar with three minimal icons: Home, History, Settings.
  No labels needed.

Stack: Astro component (.astro file) + Tailwind CSS utility classes.
Do not use any external component libraries.
Do not import any JavaScript frameworks.
Pure HTML structure with Tailwind classes only.
The component should be a complete self-contained .astro file.
---
