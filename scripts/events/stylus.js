/**
 * stylus
 */

'use strict'

// Ship index.css minified unless the site sets `stylus.compress` itself.
// hexo-renderer-stylus reads this option from the site config on every render.
hexo.config.stylus = Object.assign({ compress: true }, hexo.config.stylus)

hexo.extend.filter.register('stylus:renderer', function (style) {
  const { highlight, prismjs } = hexo.config
  style
    .define('$highlight_enable', highlight && highlight.enable)
    .define('$highlight_line_number', highlight && highlight.line_number)
    .define('$prismjs_enable', prismjs && prismjs.enable)
    .define('$prismjs_line_number', prismjs && prismjs.line_number)
})
