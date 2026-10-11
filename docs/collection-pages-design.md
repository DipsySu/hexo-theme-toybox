# Toybox Collection Pages: Design And Coding Handoff

Date: 2026-10-11.
Status: implemented by Claude Code Opus, reviewed and verified locally. Not published.
Baseline: theme `005a68c`, site `2d68535`; both deployed and verified.
Implementation branch: `codex/collection-pages` in the theme repository.

## Intent And Boundaries

Extend the accepted Cartridge Library direction to tags, categories, and
archives. Make each view feel like another useful part of the same console,
not another visual theme. The core flow is find a collection, choose an
article, read it, and return to the collection.

Keep the current homepage, article reader, search/settings placement, covers,
sprite assets, URLs, and content. Do not redesign these surfaces. Do not add
a hero, new game, random taxonomy ordering, fake metrics, or another global
page switcher. No commit, push, or deployment without a separate request.

The implementation belongs to `themes/toybox`, not the blog or Switch theme.
The dirty `themes/switch` worktree is unrelated and must remain untouched.

## Current Evidence

Live routes inspected on 2026-10-11:

- `/tags/`: 21 tags rendered as small buttons; no individual article counts.
- `/categories/`: 6 categories, including 5 roots and one nested category.
- `/categories/software-development/` is NOT a real route. Preserve actual
  Hexo paths, including the existing encoded Chinese category paths.
- The software-development category contains 19 posts and spans two pages.
- `/archives/`: 63 posts, seven pages, repeated page heading/count, no direct
  year navigation, two-column article cards.
- Tag names are interpolated into raw HTML in `scripts/helpers/page.js`.
  Replaced taxonomy markup must use escaped Pug interpolation.
- Secondary pages retain a wide bottom animation strip and sparse content.

Local before captures are in the blog's `.local/collection-design/`:
`tags-before.jpg`, `categories-before.jpg`, and `archives-before.jpg`.
The accepted homepage is in `.local/blog-deployment-2026-10-11/home-desktop.jpg`.
These are local evidence, not new distributable theme assets.

## Shared Visual Contract

- Reuse `cartridge-tokens.css`: neutral desk/surface, ink/muted text, and
  coral, cyan, yellow, green accents. Preserve resolved dark-mode tokens.
- Use the existing compact page content width, max 1120px, with 40px desktop
  outer gutters and 16px mobile gutters. Do not alter the global header.
- Replace the tall generic collection introduction with a compact heading
  band: breadcrumb, 28px H1, true count, and optional local collection nav.
  No duplicated H1/category name inside the main content.
- Use normal Chinese/system typography: body 15-16px, item title 17-20px,
  metadata 12-13px. Pixel type is restricted to year/count accents.
- Sections remain unframed. Use separators and spacing before shadows.
  Repeated category objects may have shallow cartridge depth, radius <= 8px.
- Reuse existing raster artwork through `toybox_cover`; do not invent remote
  images, generate a different illustration family, or repurpose whole-page
  screenshots as UI backgrounds. No new asset generation is required.
- Add local navigation links for Archives / Tags / Categories below the
  collection heading. They are links, not fake client-side tabs. Expose the
  active destination with `aria-current` and a visible accent indicator.
- All interactive targets are at least 44px; keyboard focus is explicit.
  Hover/focus must not change layout dimensions.
- Keep existing occasional margin sprites. Suppress the bottom animation
  strip only on collection indexes and collection result pages; do not
  alter sprite generation, homepage effects, or unrelated custom pages.

## Tags Index: Index Labels

Purpose: find a known topic or discover a topic with useful article volume.

1. Heading contains the real total and the local collection navigation.
2. One compact toolbar contains a labeled tag-name filter and a native sort
   menu: article count descending (default), or name ascending.
3. Render all tags on the server as a stable grid of repeated index labels.
   Each label is one link containing a small tag icon, name, and post count.
   No variable font-size cloud and no random sort or color assignment.
4. Use a deterministic name tie-break and accent derived from stable
   taxonomy identity. Counts are real Hexo taxonomy counts, not page totals.
5. Desktop: four columns; tablet: three or two; <= 680px: two columns; at
   320px or for exceptionally long labels, allow one column. Label content
   wraps without overlapping the count. No fixed height that clips names.
6. Filtering and sorting operate over the full rendered tag index only.
   Show a polite result count and a clear-filter icon when applicable.
   A no-results message retains the input and a reset action.
7. With JS disabled, every tag link and count remains visible and usable;
   hide inactive enhancement controls until their handler is ready.

Use light label rails and a small colored edge, not 21 large illustrations.
The label name remains the primary visual signal, with count secondary.

## Categories Index: Cartridge Boxes

Purpose: show the site's broader subjects and their real hierarchy.

1. Use a three-column shelf of root categories, two columns at <= 1024px,
   and one column at <= 680px. Do not stretch five roots to fill a sixth slot.
2. Each root is one repeated category object with a small cartridge-cover
   image (roughly 80 x 104px), category name, article count, and a subtle
   arrow affordance. Keep the cover at a stable aspect ratio.
3. Pick the cover deterministically from the latest eligible post in that
   category, with the existing configured fallback when no cover is usable.
   Respect explicit `cover: false`; use the existing folder icon instead.
4. A latest-article title can appear as one muted secondary line, derived
   from real data. No invented description for personal category names.
5. Child categories are indented, separated text links beneath the parent
   summary. No nested cards or nested anchors. Support more than one level.
6. Preserve Hexo's category membership/count semantics. Parent and child
   totals must not be added together as a unique-article count.
7. Empty data renders a concise, localized empty state and a library link.

Prefer proper escaped template markup over styling `list_categories()`
output with increasingly specific global selectors.

## Results And Archives: Collection Ledger

Applies to a single tag, a single category, all archives, year archives, and
month archives. Reuse one result-row component and one collection pager.

### Layout

- Desktop: a 192px navigation rail, 32px gap, and flexible article column
  inside the 1120px content width. The rail is unframed, not a floating card.
- Archives rail: All posts and real year routes with counts; mark current
  year. Month routes show their year in the breadcrumb. Generate paths from
  Hexo configuration; never assume `/archives/` or root `/`.
- Tag/category results rail: return-to-index plus sibling collection links
  and counts. Show current selection and real category ancestry.
- At <= 900px, rail navigation becomes a compact native destination select
  above the list. Keep ordinary links as a no-JS fallback.
- The article column is one chronological list with lightweight separators,
  not a wall of independent raised cards. Archive year headings may group
  rows; do not repeat the same page title at the top of the list.

### Result Row

- Thumbnail reuses `toybox_cover(article)` and the same fallback identity as
  the homepage/article. Desktop width about 72px, mobile about 56px.
- Primary title, publication date, optional primary category. Avoid excerpts
  in this compact discovery view. Long titles wrap to two desktop lines and
  up to three mobile lines. Accessible link name remains the complete title.
- Use one main article link without nested links or duplicate image tab stops.
  An arrow is decorative when the row already has a link.
- A no-cover row stays aligned using a folder/document icon; no broken image.
- Hover/focus gets a light surface tint and accent, not scale or translation.

### Pagination And Totals

- Use one pager at the bottom: current visible range, previous/next icon
  links, and a native page select. Reuse homepage pager visual tokens, not
  its article-selection dots or its AJAX state machine.
- Total is the selected collection's entire post count. The current result
  page length is not the total. Year/month archives use scoped counts.
- Every destination is a real generated route and preserves archive scope,
  tag/category path, custom root, and configured archive directory.
- Normal document navigation is acceptable in this phase. Do not add an
  incomplete AJAX cache or client filtering of only the current post page.
- Disabled boundary controls are real disabled buttons or noninteractive
  elements, never links to an invalid page. Empty and one-page collections
  omit unnecessary navigation.

## Component And Code Ownership

Keep this change confined to collection views, extracting only shared
behavior that removes real duplication:

| Surface | Existing or proposed file |
| --- | --- |
| Compact title and breadcrumbs | `layout/includes/header/index.pug` |
| Tags index | `layout/includes/page/tags.pug` |
| Categories index | `layout/includes/page/categories.pug` |
| Result shell | `layout/tag.pug`, `layout/category.pug`, `layout/archive.pug` |
| Reusable result rows | `layout/includes/mixins/article-sort.pug` |
| Shared collection rail/pager | focused partials in `layout/includes/collection/` |
| Taxonomy view models | focused helper in `scripts/helpers/` only if needed |
| Collection styles | replace the collection block of `source/css/toybox-theme.css` |
| Tag filter/sort and destination select | `source/js/collection-ui.js` |
| Asset registration | `layout/includes/additional-js.pug` via `toybox_asset` |
| UI locale strings | `source/js/toybox-settings.js` and language files as needed |
| Focused tests | `test/collections.test.js` |

Do not leave obsolete collection selectors underneath another override
layer. Do not change post-reader rules or the homepage carousel. Preserve
the asset-version helper added in `005a68c`.

Honor the existing `tag_ui` and `category_ui` configuration. The default
collection view gets the new ledger; explicit index-style configurations
must remain supported or be deliberately adapted with coverage, not ignored.

## Runtime, Locale, And Accessibility Contract

- Use the project's current i18n API, not a new locale store. Add every new
  key in English, Simplified Chinese, and Traditional Chinese. Localize
  counts, sorting, filter labels, empty states, aria labels, and pager copy.
- User-authored tag/category names are content; do not translate them.
- SSR text is meaningful before JS, with no exposed localization keys.
- A route change never steals focus on load. Filtering retains input focus.
  Reset returns focus to the filter, and status messages use `aria-live=polite`.
- Collection navigation is ordinary links. Do not attach global arrow-key
  navigation to tag inputs or selects; preserve overlay-aware gamepad guards.
- Optional transitions are 120-180ms color/opacity only. Respect reduced
  motion. Do not delay navigation for an exit animation.
- Initial layout and enhanced layout use the same DOM structure. No runtime
  relocation of content, duplicate headers, hidden first paint, or new fonts.

## Delivery Sequence

1. Implement escaped data helpers and SSR collection markup with fixtures.
2. Implement compact header, tag labels, category boxes, ledger/rail/pager.
3. Add progressive enhancement and all locale/state treatments.
4. Run automated checks and a real-site local build.
5. Parent reviewer checks rendered desktop/mobile views and key interactions.
6. Return changed file paths, checks, screenshots, and any remaining issues.
   Do not claim deployment. Commit/push/publish is a separate user decision.

## Acceptance Checklist

- 1440x900, 1024x768, 390x844, and 320x740: no document horizontal overflow;
  long Chinese/English labels do not collide with counts, arrows, or controls.
- Tags: counts accurate, stable order, sort works, case-insensitive filtering,
  empty result/reset works, focus retained, all links usable without JS.
- Categories: actual nested hierarchy, unique valid anchors, empty cover and
  deep hierarchy cases, deterministic artwork, no category-name HTML injection.
- Results: multi-page tag/category, archive all/year/month, correct totals,
  last-page range and boundaries, correct active rail and breadcrumbs.
- Compatibility: root `/` and demo `/hexo-theme-toybox/`; custom archive path;
  explicit index-style tag/category config; no external asset dependency added.
- All three locales, light/dark/auto, reduced motion, keyboard-only use.
- Existing home pagination, article reader, search, and settings still work.
- `npm test`, `npm run build --prefix demo`, `npm run verify --prefix demo`,
  site `npm run build`, and `git diff --check` pass after the final patch.
- Screenshots are actual browser captures, not concept renders. The parent
  reviewer verifies them before presenting the coding work as complete.

## Coding Agent Brief

Implement this specification against theme `005a68c` on
`codex/collection-pages`. Work only inside the theme and preserve unrelated
changes. Start with the existing tokens, templates, settings runtime, and
tests. Keep SSR usable and treat filtering as progressive enhancement. Do not
change homepage/reader behavior, add dependencies unnecessarily, invent
content, or publish anything. Return a patch and test results for review.

Requested model: `opus5.5`. Local Claude Code rejected that exact identifier
as unavailable on 2026-10-11. The user then explicitly approved the `opus`
alias for this implementation. The availability check resolved it to
`claude-opus-5-5`. Coding session: `21798ae7-7dd9-42fb-a1af-e2d1ebc838c3`.
Use that alias without automatic fallback and review its changes before
acceptance. The parent agent owns browser verification and publication.

## Local Acceptance

Implementation follows the existing cartridge-library tokens and artwork.
`tag_ui: index` and `category_ui: index` now add excerpts to the shared ledger;
the default remains compact rows. Taxonomy names and custom index titles stay
user-authored; standard index titles translate with the interface locale.

Parent review corrected inherited collection-card styling, localized standard
index headings, used locale-neutral year/month headings, reserved space below
the fixed navigation for the rail, and removed timing-dependent keyboard
jumps. Month/day archives expose their exact scope as the current rail item.

Verified locally on 2026-10-11:

- Unit and Pug regression tests, isolated theme demo build/verification, site
  generation, and whitespace checks pass.
- Chrome at 1440x900, 1024x768, 390x844, and 320x740: tags, categories,
  archives, and tag results have zero document horizontal overflow.
- Filter, empty-state reset, case-insensitive matching, name/count sorting,
  nested-category links, real collection totals, and scoped paging work.
- Software Development page 2: 11-19 of 19 posts. All-archive last page:
  61-63 of 63 posts. April 2018: 22 posts across three pages.
- Keyboard arrows select a destination without navigation; Enter commits.
  Pointer selection retains native navigation. Header and sticky rail do not overlap.
- English/dark, Traditional Chinese/light, and Simplified Chinese/auto modes
  were checked. Existing reduced-motion rules cover the new transitions.
- SSR markup contains real links, escaped names, counts, and article rows.
  A script-disabled tag-index snapshot confirms enhancement controls are hidden.
- Homepage selection and article reading mode remain functional; both have no
  document overflow at desktop and phone widths.

Screenshots and measured viewport data are local review artifacts in the blog's
ignored `.local/collection-design/` directory. This change is uncommitted on
`codex/collection-pages`; commit, push, and deployment remain separate steps.
