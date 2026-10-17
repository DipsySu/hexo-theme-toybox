'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const { file, read, walk } = require('./helpers')

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
  const runtimeFiles = ['source/js/pixel-anim-toggle.js', 'source/js/pixel-particles.js'].map(read)

  walk('source/css', /\.css$/).forEach(file => assert.doesNotMatch(read(file), /url\(["']?\/(?:img|fonts|cursors)\//, file))
  runtimeFiles.forEach(runtime => assert.match(runtime, /GLOBAL_CONFIG\.root/))

  const homeRuntime = runtimeFiles[0]
  assert.match(homeRuntime, /function rootPath\(path\)/)
  assert.match(homeRuntime, /posts\.querySelector\('\.toybox-stage'\)/)

  const sidebar = read('layout/includes/sidebar.pug')
  assert.match(sidebar, /url_for\(theme\.error_img\.flink\)/)

  const notFound = read('layout/includes/404.pug')
  assert.match(notFound, /theme\.error_404\.background \|\| theme\.error_img\.post_page/)

  const runtimeConfig = read('layout/includes/head/config.pug')
  assert.match(runtimeConfig, /window\.GLOBAL_CONFIG\s*=\s*{/)
})

test('exposes one persistent preferences trigger in the main navigation', () => {
  const nav = read('layout/includes/header/nav.pug')
  const rightside = read('layout/includes/rightside.pug')
  const layout = read('layout/includes/layout.pug')
  const scripts = read('layout/includes/additional-js.pug')
  const pixelUi = read('source/js/pixel-anim-toggle.js')
  const templates = nav + '\n' + rightside

  assert.match(nav, /#nav-utilities[\s\S]*#search-button[\s\S]*#preferences-button/)
  assert.match(nav, /button#toybox-preferences-btn\.site-page\.preferences/)
  assert.equal((templates.match(/#toybox-preferences-btn/g) || []).length, 1)
  assert.match(rightside, /aside#toybox-preferences-panel/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-anim-btn/)
  assert.match(rightside, /aside#toybox-preferences-panel[\s\S]*button#pixel-sprite-test-btn/)
  assert.doesNotMatch(rightside, /button#rightside_config/)
  assert.doesNotMatch(layout, /toybox-ui-pending/)
  const home = read('layout/index.pug')
  assert.match(home, /section\.toybox-stage/)
  assert.match(home, /\.toybox-card-track\(role='list'\)/)
  assert.doesNotMatch(pixelUi, /toybox-ui-pending|revealToyboxUi/)
  assert.match(scripts, /toybox-settings\.js/)
  assert.doesNotMatch(scripts, /pjax/i)
})

test('maps layout and reading controls to the Toybox article manual', () => {
  const css = read('source/css/toybox-theme.css')
  const readMode = read('source/css/_mode/readmode.styl')
  const main = read('source/js/main.js')

  assert.match(css, /html\.hide-aside body\.toybox-post \.pixel-manual-index\s*{[^}]*display: none !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #post > \.pixel-manual-body\s*{[^}]*display: grid !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #page-header\s*{[^}]*display: none !important;/s)
  assert.match(readMode, /#post > \*:not\(#post-info\):not\(\.post-content\):not\(\.pixel-manual-body\),/)
  assert.match(main, /hideAsideBtn: button =>/)
  assert.match(main, /newEle\.dataset\.toyboxI18nAria = 'rightside\.exitReadMode'/)
})

test('home reading save starts hidden and its runtime loads before reading and sprite hooks', () => {
  const home = read('layout/index.pug')
  const scripts = read('layout/includes/additional-js.pug')
  assert.match(home, /\.toybox-resume\(hidden\)/)
  assert.match(home, /img\.toybox-resume-cover\(hidden alt='' width='36' height='36'\)/)
  assert.match(home, /button\.toybox-resume-clear\(type='button'/)
  assert.match(scripts, /toybox-settings\.js[\s\S]*toybox-save\.js[\s\S]*pixel-particles\.js[\s\S]*pixel-anim-toggle\.js/)
})

test('keeps the homepage cartridge rack proportionate across desktop and mobile', () => {
  const css = read('source/css/home-toybox.css')

  assert.doesNotMatch(css, /body\.toybox-home #pixel-particles-canvas,[\s\S]*display: none !important;/)
  assert.match(css, /--rack-height: clamp\(480px, calc\(100svh - 400px\), 580px\)/)
  assert.match(css, /flex-grow: 1\.45/)
  assert.match(css, /flex-basis: min\(290px, calc\(100vw - 66px\)\)/)
  assert.doesNotMatch(css, /flex: 0 0 620px/)
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
  const config = read('_config.yml')
  const runtimeConfig = read('layout/includes/head/config.pug')
  const postUi = read('layout/includes/mixins/post-ui.pug')
  const runtime = read('source/js/pixel-anim-toggle.js')
  const coverFilter = read('scripts/filters/random_cover.js')

  assert.match(config, /toybox:\n\s+home:\n\s+fallback_covers:/)
  assert.match(postUi, /data-toybox-cover-source=coverSource/)
  assert.match(coverFilter, /data\.toybox_cover_source = fallbackCover \? 'fallback' : 'none'/)
  assert.doesNotMatch(coverFilter, /Math\.random/)
  assert.match(postUi, /toybox_cover\(article\)/)
  assert.match(runtime, /function setCartridgeCardMode\(/)
  assert.match(runtime, /toybox-cartridge-card/)
  assert.doesNotMatch(runtime, /toybox-switch-card|setToyboxCardMode/)
})

test('shows taxonomy post totals instead of pagination page counts', () => {
  const header = read('layout/includes/header/index.pug')
  const helper = read('scripts/helpers/collections.js')

  assert.match(header, /include \.\.\/collection\/heading\.pug/)
  assert.match(helper, /total: tag \? tag\.length/)
  assert.match(helper, /total: category \? category\.length/)
  assert.doesNotMatch(header, /page\.total \|\| page\.posts\.length/)
})

test('ships as a focused standalone Toybox theme', () => {
  const config = read('_config.yml')
  const packageJson = JSON.parse(read('package.json'))
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
  retired.forEach(relative => assert.equal(fs.existsSync(file(relative)), false, relative))
})
