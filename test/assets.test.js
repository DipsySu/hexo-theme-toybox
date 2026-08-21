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

test('supports deployment below a project site root', () => {
  const cssFiles = collectTextFiles(path.join(themeRoot, 'source/css')).filter(file => file.endsWith('.css'))
  const runtimeFiles = [
    'source/js/pixel-anim-toggle.js',
    'source/js/pixel-dino.js',
    'source/js/pixel-particles.js'
  ].map(file => fs.readFileSync(path.join(themeRoot, file), 'utf8'))

  cssFiles.forEach(file => {
    const css = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(css, /url\(["']?\/(?:img|fonts|cursors)\//, path.relative(themeRoot, file))
  })
  runtimeFiles.forEach(runtime => assert.match(runtime, /GLOBAL_CONFIG\.root/))

  const homeRuntime = runtimeFiles[0]
  assert.match(homeRuntime, /function relativePath\(path\)/)
  assert.match(homeRuntime, /relativePath\(location\.pathname\)/)

  const sidebar = fs.readFileSync(path.join(themeRoot, 'layout/includes/sidebar.pug'), 'utf8')
  assert.match(sidebar, /url_for\(theme\.error_img\.flink\)/)

  const notFound = fs.readFileSync(path.join(themeRoot, 'layout/includes/404.pug'), 'utf8')
  assert.match(notFound, /theme\.error_404\.background \|\| theme\.error_img\.post_page/)

  const runtimeConfig = fs.readFileSync(path.join(themeRoot, 'layout/includes/head/config.pug'), 'utf8')
  assert.match(runtimeConfig, /window\.GLOBAL_CONFIG\s*=\s*{/)
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
  const readMode = fs.readFileSync(path.join(themeRoot, 'source/css/_mode/readmode.styl'), 'utf8')
  const main = fs.readFileSync(path.join(themeRoot, 'source/js/main.js'), 'utf8')

  assert.match(css, /html\.hide-aside body\.toybox-post \.pixel-manual-index\s*{[^}]*display: none !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #post > \.pixel-manual-body\s*{[^}]*display: grid !important;/s)
  assert.match(css, /body\.toybox-post\.read-mode #page-header\s*{[^}]*display: none !important;/s)
  assert.match(readMode, /#post > \*:not\(#post-info\):not\(\.post-content\):not\(\.pixel-manual-body\),/)
  assert.match(main, /hideAsideBtn: button =>/)
  assert.match(main, /newEle\.dataset\.toyboxI18nAria = 'rightside\.exitReadMode'/)
})

test('keeps the homepage cartridge rack proportionate across desktop and mobile', () => {
  const css = fs.readFileSync(path.join(themeRoot, 'source/css/home-toybox.css'), 'utf8')

  assert.doesNotMatch(css, /body\.toybox-home #pixel-particles-canvas,[\s\S]*display: none !important;/)
  assert.match(css, /@media \(min-width: 1340px\)[\s\S]*--content-max: min\(1840px, calc\(100vw - 176px\)\);/)
  assert.match(css, /min-height: calc\(100vh - 142px\);/)
  assert.match(css, /flex-basis: clamp\(560px, 44%, 800px\);\s*width: clamp\(560px, 44%, 800px\) !important;/)
  assert.doesNotMatch(css, /flex: 0 0 620px/)
  assert.match(css, /@media \(min-width: 1600px\)/)
  assert.match(css, /\.toybox-featured::before\s*{\s*content: none !important;/)
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.toybox-selector-numbers button:not\(\.is-current\)/)
  assert.match(css, /flex-basis: 44px;\s*min-width: 44px;/)
})

test('drives the cartridge library with console gamepad keys', () => {
  const anim = fs.readFileSync(path.join(themeRoot, 'source/js/pixel-anim-toggle.js'), 'utf8')

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
  const config = fs.readFileSync(path.join(themeRoot, '_config.yml'), 'utf8')
  const runtimeConfig = fs.readFileSync(path.join(themeRoot, 'layout/includes/head/config.pug'), 'utf8')
  const postUi = fs.readFileSync(path.join(themeRoot, 'layout/includes/mixins/post-ui.pug'), 'utf8')
  const runtime = fs.readFileSync(path.join(themeRoot, 'source/js/pixel-anim-toggle.js'), 'utf8')
  const coverFilter = fs.readFileSync(path.join(themeRoot, 'scripts/filters/random_cover.js'), 'utf8')

  assert.match(config, /toybox:\n\s+home:\n\s+fallback_covers:/)
  assert.match(runtimeConfig, /fallbackCovers: Array\.isArray\(toyboxRuntimeHome\.fallback_covers\)/)
  assert.match(postUi, /data-toybox-cover-source=coverSource/)
  assert.match(coverFilter, /data\.toybox_cover_source = fallbackCover \? 'fallback' : 'none'/)
  assert.doesNotMatch(coverFilter, /Math\.random/)
  assert.match(runtime, /cover\.dataset\.toyboxCoverSource === 'fallback'/)
  assert.match(runtime, /function setCartridgeCardMode\(/)
  assert.match(runtime, /toybox-cartridge-card/)
  assert.doesNotMatch(runtime, /toybox-switch-card|setToyboxCardMode/)
})

test('shows taxonomy post totals instead of pagination page counts', () => {
  const header = fs.readFileSync(path.join(themeRoot, 'layout/includes/header/index.pug'), 'utf8')

  assert.match(header, /site\.tags\.findOne\(\{ name: page\.tag \}\)/)
  assert.match(header, /site\.categories\.findOne\(\{ name: page\.category \}\)/)
  assert.doesNotMatch(header, /page\.total \|\| page\.posts\.length/)
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
