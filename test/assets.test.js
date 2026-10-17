'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const { evaluate, file, read, section, walk } = require('./helpers')

const TEXT = /\.(css|js|pug|styl|yml)$/
const files = ['_config.yml', ...walk('layout', TEXT), ...walk('source', TEXT)]

test('keeps static custom asset references inside the theme package', () => {
  const missing = new Set()

  files.forEach(source => {
    read(source).split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /(?:https?:)?\/\//.test(line)) return

      for (const match of line.matchAll(/\/(css|js|img|fonts|cursors)\/[^'"`)\s?]+/g)) {
        const relative = match[0].slice(1).split('?')[0]
        if (relative.endsWith('/') || relative.includes("' +") || relative.includes('${')) continue
        const exists = name => fs.existsSync(file('source/' + name))
        if (!exists(relative) && !(relative.endsWith('.css') && exists(relative.replace(/\.css$/, '.styl')))) missing.add(relative)
      }
    })
  })

  assert.deepEqual([...missing], [])
})

test('supports deployment below a project site root', () => {
  walk('source/css', /\.css$/).forEach(file => assert.doesNotMatch(read(file), /url\(["']?\/(?:img|fonts|cursors)\//, file))
  for (const file of ['source/js/pixel-anim-toggle.js', 'source/js/pixel-particles.js']) assert.match(read(file), /GLOBAL_CONFIG\.root/, file)
  const rootPath = evaluate(section('source/js/pixel-anim-toggle.js', '  function rootPath(', '  function toyboxText('), { window: { GLOBAL_CONFIG: { root: '/blog' } } }, 'rootPath')
  assert.equal(rootPath('archives/'), '/blog/archives/')
  assert.equal(rootPath(''), '/blog/')
  assert.match(read('source/js/pixel-anim-toggle.js'), /posts\.querySelector\('\.toybox-stage'\)/)
  assert.match(read('layout/includes/sidebar.pug'), /url_for\(theme\.error_img\.flink\)/)
  assert.match(read('layout/includes/404.pug'), /theme\.error_404\.background \|\| theme\.error_img\.post_page/)
})

test('exposes one persistent preferences trigger in the main navigation', () => {
  const nav = read('layout/includes/header/nav.pug')
  const rightside = read('layout/includes/rightside.pug')

  assert.match(nav, /#nav-utilities[\s\S]*#search-button[\s\S]*#preferences-button/)
  assert.match(nav, /button#toybox-preferences-btn\.site-page\.preferences/)
  assert.equal(((nav + '\n' + rightside).match(/#toybox-preferences-btn/g) || []).length, 1)
  assert.match(rightside, /aside#toybox-preferences-panel/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-anim-btn/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-sprite-test-btn/)
  const home = read('layout/index.pug')
  assert.match(home, /section\.toybox-stage/)
  assert.match(home, /\.toybox-card-track\(role='list'\)/)
  assert.doesNotMatch(read('layout/includes/additional-js.pug'), /pjax/i)
})

test('maps layout and reading controls to the Toybox article manual', () => {
  const css = read('source/css/toybox-theme.css')
  const readMode = read('source/css/_mode/readmode.styl')

  assert.match(css, /html\.hide-aside body\.toybox-post \.pixel-manual-index\s*{[^}]*display: none !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #post > \.pixel-manual-body\s*{[^}]*display: grid !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #page-header\s*{[^}]*display: none !important;/s)
  assert.match(readMode, /#post > \*:not\(#post-info\):not\(\.post-content\):not\(\.pixel-manual-body\),/)
  assert.match(read('source/js/main.js'), /newEle\.dataset\.toyboxI18nAria = 'rightside\.exitReadMode'/)
})

test('home reading save starts hidden', () => {
  const home = read('layout/index.pug')
  assert.match(home, /\.toybox-resume\(hidden\)/)
  assert.match(home, /img\.toybox-resume-cover\(hidden alt='' width='36' height='36'\)/)
  assert.match(home, /button\.toybox-resume-clear\(type='button'/)
})

test('keeps the homepage cartridge rack proportionate across desktop and mobile', () => {
  const css = read('source/css/home-toybox.css')
  assert.match(css, /--rack-height: clamp\(480px, calc\(100svh - 400px\), 580px\)/)
  assert.match(css, /flex-grow: 1\.45/)
  assert.match(css, /flex-basis: min\(290px, calc\(100vw - 66px\)\)/)
  assert.match(css, /@media \(min-width: 1600px\)/)
  assert.match(css, /@media \(max-width: 680px\)/)
  assert.match(css, /flex-basis: 44px;\s*min-width: 44px;/)
})

test('drives the cartridge library with console gamepad keys', () => {
  const anim = read('source/js/pixel-anim-toggle.js')

  // Arrows work anywhere on the page, not only while the deck has focus.
  assert.match(anim, /document\.addEventListener\('keydown', onKeydown\)/)
  assert.match(anim, /document\.removeEventListener\('keydown', onKeydown\)/)
  assert.doesNotMatch(anim, /deck\.addEventListener\('keydown'/)
  // "A" opens the selected cartridge, mirroring its on-card Ⓐ button.
  assert.match(anim, /event\.key === 'a' \|\| event\.key === 'A'/)
  assert.match(anim, /\.toybox-open-button, a\.article-title, \.toybox-card-arrow/)
  // "B" exits read mode first, backs out of non-home pages, stays quiet on home.
  assert.match(anim, /function onToyboxGamepadBack/)
  assert.match(anim, /document\.addEventListener\('keydown', onToyboxGamepadBack\)/)
  assert.match(anim, /event\.key !== 'b' && event\.key !== 'B'/)
  assert.match(anim, /\.exit-readmode/)
  assert.match(anim, /toybox-home'\)\) return/)
})

test('keeps cartridge fallbacks configurable and scoped to fallback covers', () => {
  const postUi = read('layout/includes/mixins/post-ui.pug')
  assert.match(read('_config.yml'), /toybox:\n\s+home:\n\s+fallback_covers:/)
  assert.match(postUi, /data-toybox-cover-source=coverSource/)
  assert.match(postUi, /toybox_cover\(article\)/)
  assert.match(read('scripts/filters/random_cover.js'), /data\.toybox_cover_source = fallbackCover \? 'fallback' : 'none'/)
})

test('shows taxonomy post totals instead of pagination page counts', () => {
  assert.match(read('layout/includes/header/index.pug'), /include \.\.\/collection\/heading\.pug/)
  assert.match(read('scripts/helpers/collections.js'), /total: category \? category\.length/)
})

test('ships as a focused standalone Toybox theme', () => {
  const config = read('_config.yml')
  const retired = [
    'layout/includes/third-party/comments',
    'layout/includes/third-party/chat',
    'layout/includes/third-party/math',
    'layout/includes/third-party/pjax.pug',
    'scripts/tag',
    'plugins.yml'
  ]

  assert.match(config, /^asset:\n/m)
  assert.doesNotMatch(config, /^inject:/m)
  assert.doesNotMatch(config, /^CDN:/m)
  retired.forEach(relative => assert.equal(fs.existsSync(file(relative)), false, relative))
})
