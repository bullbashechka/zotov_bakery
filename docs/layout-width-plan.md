# Maximum layout width

## Intended behavior

Preserve the existing composition through a 1920 CSS-pixel viewport. Above that
width, keep content centered at its existing maximum size and let side margins
grow. Section backgrounds remain full width. Browser zoom remains native: zooming
out shrinks text and images; zooming in continues to activate responsive layouts.

## Implementation

1. Cap the viewport used for root font scaling at 1920px.
2. Retain the existing centered 77.5rem content containers (about 1701px at the cap).
3. Use the capped viewport for the hero cake and honey-cake tooltip widths.
4. Center and cap decorative line containers and their viewport-based sizes.
5. Run typecheck and build; inspect mobile, desktop and wider viewport screenshots.

## Edge cases

- A wide monitor at 100% gets the same side margins as an equivalently wide CSS
  viewport produced by zooming out. No zoom detection or JavaScript compensation.
- Below the cap, existing fluid scaling and responsive breakpoints remain active.
- At 1920 physical pixels, browser chrome, scrollbars and OS scaling can make the
  CSS viewport slightly narrower than 1920px.
