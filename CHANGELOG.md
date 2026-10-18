# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Font Awesome is no longer loaded; every icon is a pixel mask inlined in the
  stylesheet. Only the icon names drawn in `source/css/pixel-icons.css` render.
- Shared stylesheets are bundled into `index.css` (one render-blocking request);
  home-only styles load from `toybox-home.css` on the home page only.
- Only the Basic Latin Fusion Pixel subset is loaded instead of the 177 KB
  font stylesheet.
- Theme assets are versioned by content, so unchanged files keep their URL and
  cache across deploys, and identical builds produce identical HTML.
- Fancybox loads on demand on pages with article images; vanilla-lazyload no
  longer blocks theme start-up and falls back to native lazy loading.
- The search index preloads when the browser is idle after page load.
- Related posts are ranked deterministically; social preview images match the
  cover shown on the page.
- Dead and duplicated CSS, JavaScript, template code and tests were trimmed,
  with no change in behaviour.

### Fixed

- Remote friend lists configured with `flink_url` render again, including
  subdirectory deployments, safe text rendering, and avatar fallbacks.
- Pages no longer stop initialising when jsDelivr is unreachable.
- Saved color mode and reading layout apply before first paint.
- Pages with headings but no article TOC no longer throw.
- The page select in paged collection views is visible and readable.
- The motion toggle and Sprite Lab work when browser storage is blocked.

### Removed

- Unused stylesheets, cursors, images and Butterfly runtime code, plus the
  config keys listed in the README upgrade notes.

## [1.0.0] - 2026-07-15

### Added

- Independent Toybox theme package with self-contained layouts and assets.
- Cartridge-style home page, pagination transitions, and keyboard navigation.
- Light, dark, and automatic color modes.
- English, Simplified Chinese, and Traditional Chinese interfaces.
- Local search, article table of contents, reading mode, and pixel sprites.

[Unreleased]: https://github.com/DipsySu/hexo-theme-toybox/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/DipsySu/hexo-theme-toybox/releases/tag/v1.0.0
