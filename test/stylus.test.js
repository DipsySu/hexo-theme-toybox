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
