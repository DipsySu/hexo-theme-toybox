'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const themeRoot = path.resolve(__dirname, '..')

function collectTextFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectTextFiles(absolute)
    return /\.(css|js|pug|styl|yml)$/.test(entry.name) ? [absolute] : []
  })
}

const files = [path.join(themeRoot, '_config.yml'), ...collectTextFiles(path.join(themeRoot, 'layout')), ...collectTextFiles(path.join(themeRoot, 'source'))]

test('keeps static custom asset references inside the theme package', () => {
  const missing = new Set()

  files.forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /(?:https?:)?\/\//.test(line)) return

      for (const match of line.matchAll(/\/(css|js|img|fonts|cursors)\/[^'"`)\s?]+/g)) {
        const relative = match[0].slice(1).split('?')[0]
        if (relative.endsWith('/') || relative.includes("' +") || relative.includes('${')) continue
        const sourceAsset = path.join(themeRoot, 'source', relative)
        const stylusSource = relative.endsWith('.css')
          ? path.join(themeRoot, 'source', relative.replace(/\.css$/, '.styl'))
          : ''
        if (!fs.existsSync(sourceAsset) && !fs.existsSync(stylusSource)) missing.add(relative)
      }
    })
  })

  assert.deepEqual([...missing], [])
})

test('exposes one persistent preferences trigger in the main navigation', () => {
  const nav = fs.readFileSync(path.join(themeRoot, 'layout/includes/header/nav.pug'), 'utf8')
  const rightside = fs.readFileSync(path.join(themeRoot, 'layout/includes/rightside.pug'), 'utf8')
  const layout = fs.readFileSync(path.join(themeRoot, 'layout/includes/layout.pug'), 'utf8')
  const scripts = fs.readFileSync(path.join(themeRoot, 'layout/includes/additional-js.pug'), 'utf8')
  const pixelUi = fs.readFileSync(path.join(themeRoot, 'source/js/pixel-anim-toggle.js'), 'utf8')
  const templates = nav + '\n' + rightside

  assert.match(nav, /#nav-utilities[\s\S]*#search-button[\s\S]*#preferences-button/)
  assert.match(nav, /button#toybox-preferences-btn\.site-page\.preferences/)
  assert.equal((templates.match(/#toybox-preferences-btn/g) || []).length, 1)
  assert.match(rightside, /aside#toybox-preferences-panel/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-anim-btn/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-sprite-test-btn/)
  assert.doesNotMatch(rightside, /button#rightside_config/)
  assert.match(layout, /toybox-ui-pending/)
  assert.match(pixelUi, /classList\.remove\('toybox-ui-pending'\)/)
  assert.match(pixelUi, /finally\s*{\s*revealToyboxUi\(\)/)
  assert.match(scripts, /toybox-settings\.js/)
  assert.doesNotMatch(scripts, /pjax/i)
})

test('maps layout and reading controls to the Toybox article manual', () => {
  const css = fs.readFileSync(path.join(themeRoot, 'source/css/toybox-theme.css'), 'utf8')
  const main = fs.readFileSync(path.join(themeRoot, 'source/js/main.js'), 'utf8')

  assert.match(css, /html\.hide-aside body\.toybox-post \.pixel-manual-index\s*{[^}]*display: none !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #post > \.pixel-manual-body\s*{[^}]*display: grid !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #page-header\s*{[^}]*display: none !important;/s)
  assert.match(main, /hideAsideBtn: button =>/)
  assert.match(main, /newEle\.dataset\.toyboxI18nAria = 'rightside\.exitReadMode'/)
})

test('ships as a focused standalone Toybox theme', () => {
  const config = fs.readFileSync(path.join(themeRoot, '_config.yml'), 'utf8')
  const packageJson = JSON.parse(fs.readFileSync(path.join(themeRoot, 'package.json'), 'utf8'))
  const retired = [
    'layout/includes/third-party/comments',
    'layout/includes/third-party/chat',
    'layout/includes/third-party/math',
    'layout/includes/third-party/pjax.pug',
    'scripts/tag',
    'plugins.yml'
  ]

  assert.equal(packageJson.name, 'hexo-theme-toybox')
  assert.equal(packageJson.author, 'DipsySu')
  assert.match(config, /^asset:\n/m)
  assert.doesNotMatch(config, /^inject:/m)
  assert.doesNotMatch(config, /^CDN:/m)
  retired.forEach(relative => assert.equal(fs.existsSync(path.join(themeRoot, relative)), false, relative))
})
