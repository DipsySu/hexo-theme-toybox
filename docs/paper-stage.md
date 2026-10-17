# Pixel Paper Stage (Preview)

This appearance combines the existing pixel artwork with cut-paper scenery,
standing article sheets, folded feet, numbered paper tabs, and a short page-turn
motion. It keeps the real article links, keyboard selection, AJAX pagination,
reading saves, search, and preferences from the cartridge theme.

## Appearance

The preview branch defaults to `paper`. To restore the original appearance in
your site's `_config.toybox.yml`, use:

```yaml
toybox:
  appearance: cartridge
```

Use `appearance: paper` to enable the preview again. The choice is rendered by
Hexo, including the body class and conditional stylesheet; there is no initial
JavaScript layout swap. Rebuild after changing the configuration.

The new skin is isolated in `source/css/paper-stage.css`. Paper styling also
applies to navigation, article covers, reading controls, tags, categories, and
search/preferences panels. Article body copy remains an ordinary readable font.
The scene is restricted to the homepage, with no scenery behind reading text.
Dark mode, localization and reduced-motion settings retain their existing logic.

## Asset

`source/img/paper-stage/meadow.jpg` was generated with the built-in ImageGen tool
on 2026-10-15 and encoded as JPEG for delivery. Existing cover art was preserved.
The backdrop contains no game characters or logos. Its CSS URL is relative so
the theme also works under a GitHub Pages project root.

Generation prompt:

> Use case: stylized-concept. Asset type: actual full-width website stage backdrop,
> NOT a website mockup, no UI, no text. Create a panoramic 3:2 papercraft diorama
> landscape combining crisp 8-bit pixel motifs printed on cut paper and charming
> handcrafted layered scenery, inspired by Paper Mario and Yoshi's Crafted World.
> Straight-on view into a little paper theater. Light powder-blue paper sky occupies
> upper 70 percent with just two small pixel-stepped white paper clouds high near
> left and right edges. At the very bottom, a shallow green paper meadow and pale
> aqua paper stream with layered thin white cut edges, small square pixel flowers
> and paper bushes only at extreme left/right. Crisp folded green hills stand along
> lower left and lower right edges. Center middle 70% of image must remain very
> empty pale blue sky for real article cards to be overlaid. Fine paper grain,
> clearly visible thin cut-paper edges, a few folded support tabs, short consistent
> natural contact shadows, physical flat sheets rather than voxel cubes. Bright
> cheerful green, cyan, white, small yellow/coral accents. No characters, no existing
> game logos, no typography, no interface controls, no border, no vignette, no blur,
> no sepia, no brown craft cardboard. The image should work as the scenery behind
> five real article paper cards, not replace them. Landscape composition, high
> quality polished handmade game art.

## Release Boundary

The previous published baseline is theme `40e09ad` / blog `24c5063` on `main`.
This trial lives on `dipsy/pixel-paper-stage`; it does not update production.
