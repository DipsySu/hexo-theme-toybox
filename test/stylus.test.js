'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { loadHexo, read, walk } = require('./helpers')

const stylusSources = walk('source/css', /\.styl$/)
const loadStylusEvent = config => loadHexo('scripts/events/stylus.js', { config, theme_dir: '/blog/themes/toybox/' })

test('compresses index.css unless the site configures Stylus compression', () => {
  const stylus = config => loadStylusEvent(config).hexo.config.stylus
  assert.equal(stylus({}).compress, true)
  assert.deepEqual({ ...stylus({ stylus: { compress: false, sourcemaps: true } }) }, { compress: false, sourcemaps: true })
  assert.equal(stylus({ stylus: null }).compress, true)
})

const loadCssFilter = config => loadStylusEvent(config).filters['after_render:css']

test('minifies the theme stylesheets without touching strings, url() or kept comments', () => {
  const minify = loadCssFilter({})
  const themeCss = { path: '/blog/themes/toybox/source/css/toybox-theme.css' }
  const input = [
    '/*! Toybox | MIT */',
    '/* layout notes */',
    '.a  ,  .b > .c {',
    '  content: "x ;  { } /* y */";',
    '  background: url(data:image/png;base64,AA==) no-repeat ;',
    '  margin: var(--x, 0)  calc(100% - 8px) ;',
    '}',
    '',
    '@media (max-width: 680px) {',
    '  .d { color: red !important; }',
    '}',
    '/*# sourceMappingURL=index.css.map */',
    ''
  ].join('\n')
  assert.equal(minify(input, themeCss), '/*! Toybox | MIT */ .a , .b > .c{content: "x ;  { } /* y */";background: url(data:image/png;base64,AA==) no-repeat;margin: var(--x, 0) calc(100% - 8px)}@media (max-width: 680px){.d{color: red !important}}/*# sourceMappingURL=index.css.map */')

  const sample = '/* note */\n.a {\n  color: red;\n}\n'
  assert.equal(minify(sample, { path: '/blog/source/custom/user.css' }), sample)
  assert.equal(minify(sample, { path: '/blog/themes/toybox/source/css/fusion-pixel-fonts.css' }), sample)
  assert.equal(minify(sample, { path: '/blog/themes/toybox/layout/includes/inline.css' }), sample)
  assert.equal(minify(sample, {}), sample)
  assert.equal(loadCssFilter({ stylus: { compress: false } })(sample, themeCss), sample)
})

test('emits only unprefixed CSS that current browsers need', () => {
  const index = read('source/css/index.styl')
  assert.doesNotMatch(index, /@import 'nib'/)
  assert.match(index, /^vendors = official$/m)

  stylusSources.forEach(file => {
    const lines = read(file).split('\n')
    lines.forEach((line, i) => {
      if (/^\s*user-select:/.test(line)) assert.match(lines[i - 1], /^\s*-webkit-user-select:/, `${file}:${i + 1}`)
    })
  })
})

test('draws Stylus pseudo-element icons as pixel masks instead of Font Awesome glyphs', () => {
  stylusSources.forEach(file => assert.doesNotMatch(read(file), /Font Awesome|fontawesomeIcon|content: '\\f[0-9a-f]{3}'/, file))

  const post = read('source/css/_layout/post.styl')
  assert.match(post, /\.post-copyright\n[\s\S]*?&:before\n\s+pixelIcon\(\$pixel-icon-copyright\)/)
})
