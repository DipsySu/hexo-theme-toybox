# Cartridge Library

This iteration follows the selected Cartridge Library direction: real-looking
colored plastic sleeves and tactile controls, with quiet surfaces around content.
Existing raster artwork is reused without altering the original assets.

## Page Hierarchy

- Home: one chronological rack. Selection grows in place; slot indicator lights,
  arrows, keyboard arrows, and touch select the cartridge. A opens the current article.
- Archives and taxonomy detail: two-column dated article list on desktop,
  single column on phones. Small sleeves reuse each article's cover.
- Categories: colored top-edge items, counts, and flat nested category links.
- Tags: compact tactile labels, consistent sizes regardless of popularity.
- Article: cover and title above metadata; sticky desktop contents beside a
  constrained reading column. Single-column and focused reading modes remain.

## Shared Components

- Navigation: red active underline; independent search and settings controls.
- Search: centered modal, immediate input, asynchronous status, retry on failure,
  escaped results, Escape dismissal, focus return, and a keyboard focus loop.
- Settings: one top-right entry, three-way color and locale controls, reading
  actions only on article pages, and a home-only sprite preview tool.
- Pagination: the lower library control shows the visible article range, a
  pixel numeric display over a native page picker, and previous/next page actions. It is visually distinct
  from the upper rack's slot lights. Home transitions preserve vertical scroll
  and return keyboard focus to the corresponding control after replacement.
- Progress: one reading meter; the TOC does not repeat a second percentage.
- Continue reading: one root-scoped local save, with the real title and progress.
  It appears only while a save exists. Only its explicit resume link restores
  position; ordinary article navigation is untouched. Completion or clearing
  removes this entry without resetting preferences or read badges.
- Decorative sprites: short home encounters after successful page changes or
  reading completion, with occasional quiet idle encounters. Motion preference
  and page visibility control their lifecycle. Non-home decorations stay behind
  content and covers, never an interactive obstacle.

## Tokens and Ownership

`source/css/cartridge-tokens.css` owns neutral surfaces, text, borders, depths,
and red/cyan/yellow/green accents for light and dark modes.
`toybox-theme.css` owns shared chrome and secondary pages; `home-toybox.css`
owns the rack; `toybox-settings.css` owns the preferences popover.
The three old pixel layout sheets have been removed, so there are no
conflicting layers of overrides.

Body text uses system Chinese/Latin fonts; Fusion Pixel is reserved for the
brand, slot numbers, and compact console counters. Text sizes are fixed at
breakpoints, not scaled continuously with width.
Controls use visible focus rings, fixed dimensions, and reduced-motion support.
The main card track scrolls horizontally below 1180px; it does not compress
five cartridges into illegible phone-width columns.

## Rendering Contract

The initial rack and links are Pug output. Runtime code only binds selection,
page replacement, reading state, and optional decoration; it does not assemble
the initial layout. Cover assignment happens during generation and is shared
by home, archives, article headers, and recommendations.

Default installation needs no personal site configuration or copied artwork.
The existing demo remains an isolated test fixture, not an alternative source
of installed theme templates.
