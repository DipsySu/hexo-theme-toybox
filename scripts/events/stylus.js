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

// `include css` pastes the @imported plain stylesheets verbatim, so compress the theme's own
// stylesheets here as well: drop comments and collapse whitespace outside strings and url().
// /*! and /*# comments are kept; site files and the vendored font CSS are left untouched.
const CSS_TOKEN = /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\((?!\s*['"])[^)]*\)/g
const squeeze = text => text.replace(/\s+/g, ' ').replace(/ ?([{};]) ?/g, '$1').replace(/;}/g, '}')

hexo.extend.filter.register('after_render:css', (css, data) => {
  const file = (data && data.path) || ''
  const theme = hexo.theme_dir || ''
  if (!hexo.config.stylus.compress || !theme || !file.startsWith(theme)) return css
  if (!/^source[\\/]css[\\/]/.test(file.slice(theme.length)) || /fusion-pixel-fonts\.css$/.test(file)) return css
  let out = ''
  let plain = ''
  let last = 0
  for (const match of css.matchAll(CSS_TOKEN)) {
    plain += css.slice(last, match.index)
    last = match.index + match[0].length
    if (match[0].startsWith('/*') && !/^\/\*[!#]/.test(match[0])) { plain += ' '; continue }
    out += squeeze(plain) + match[0]
    plain = ''
  }
  return (out + squeeze(plain + css.slice(last))).trim()
})
