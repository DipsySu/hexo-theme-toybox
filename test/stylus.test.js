'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const themeRoot = path.resolve(__dirname, '..')
const cssRoot = path.join(themeRoot, 'source/css')

function stylusSources(directory = cssRoot) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return stylusSources(absolute)
    return entry.name.endsWith('.styl') ? [absolute] : []
  })
}

function loadStylusEvent(config) {
  const hexo = { config, extend: { filter: { register: () => {} } } }
  vm.runInNewContext(fs.readFileSync(path.join(themeRoot, 'scripts/events/stylus.js'), 'utf8'), { hexo })
  return hexo.config
}

test('compresses index.css unless the site configures Stylus compression', () => {
  assert.equal(loadStylusEvent({}).stylus.compress, true)
  assert.deepEqual({ ...loadStylusEvent({ stylus: { compress: false, sourcemaps: true } }).stylus }, { compress: false, sourcemaps: true })
  assert.equal(loadStylusEvent({ stylus: null }).stylus.compress, true)
})

function loadCssFilter(config) {
  const filters = {}
  const hexo = { config, theme_dir: '/blog/themes/toybox/', extend: { filter: { register: (type, fn) => { filters[type] = fn } } } }
  vm.runInNewContext(fs.readFileSync(path.join(themeRoot, 'scripts/events/stylus.js'), 'utf8'), { hexo })
  return filters['after_render:css']
}

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
  const index = fs.readFileSync(path.join(cssRoot, 'index.styl'), 'utf8')
  assert.doesNotMatch(index, /@import 'nib'/)
  assert.match(index, /^vendors = official$/m)

  stylusSources().forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (/^\s*user-select:/.test(line)) assert.match(lines[i - 1], /^\s*-webkit-user-select:/, `${path.relative(themeRoot, file)}:${i + 1}`)
    })
  })
})

test('draws Stylus pseudo-element icons as pixel masks instead of Font Awesome glyphs', () => {
  stylusSources().forEach(file => {
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /Font Awesome|fontawesomeIcon|content: '\\f[0-9a-f]{3}'/, path.relative(themeRoot, file))
  })

  const post = fs.readFileSync(path.join(cssRoot, '_layout/post.styl'), 'utf8')
  assert.match(post, /\.post-copyright\n[\s\S]*?&:before\n\s+pixelIcon\(\$pixel-icon-copyright\)/)
})
