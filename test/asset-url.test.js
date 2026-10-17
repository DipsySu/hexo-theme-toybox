'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '../scripts/helpers/asset-url.js'), 'utf8')

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

// A throwaway site with a theme: theme/source holds the theme assets and
// site/source can override any of them, as in a real Hexo site.
const roots = []
test.after(() => roots.forEach(root => fs.rmSync(root, { recursive: true, force: true })))

function site() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toybox-asset-'))
  roots.push(root)
  const dirs = { source_dir: path.join(root, 'site/source') + path.sep, theme_dir: path.join(root, 'theme') + path.sep }
  write(path.join(dirs.theme_dir, 'source/css/index.styl'), '@import "_global"')
  write(path.join(dirs.theme_dir, 'source/css/_global/index.styl'), 'body\n  color: red')
  write(path.join(dirs.theme_dir, 'source/css/toybox-theme.css'), 'body{}')
  write(path.join(dirs.theme_dir, 'source/js/main.js'), 'main()')
  write(path.join(dirs.theme_dir, 'source/js/utils.js'), 'utils()')
  write(path.join(dirs.theme_dir, 'source/img/logo.png'), 'png')
  fs.mkdirSync(dirs.source_dir, { recursive: true })
  return Object.assign(dirs, { file: relative => path.join(dirs.theme_dir, 'source', relative), siteFile: relative => path.join(dirs.source_dir, relative) })
}

// One "process": every fixture() call loads the helper fresh, like a new
// `hexo generate` run on the same files.
function fixture(dirs, { root = '/', theme = { lazyload: { enable: true } } } = {}) {
  let helper
  let regenerate
  const hexo = {
    source_dir: dirs.source_dir,
    theme_dir: dirs.theme_dir,
    theme: { config: theme },
    config: { highlight: { enable: true } },
    extend: {
      filter: { register: (name, callback) => { assert.equal(name, 'before_generate'); regenerate = callback } },
      helper: { register: (name, callback) => { assert.equal(name, 'toybox_asset'); helper = callback } }
    }
  }
  vm.runInNewContext(source, { require, hexo })
  const context = { url_for: value => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value) ? value : root + value.replace(/^\//, '') }
  return { hexo, url: value => helper.call(context, value), regenerate: () => regenerate() }
}

const version = url => new URL(url, 'https://example.com').searchParams.get('v')

test('unchanged files keep the same version across builds', () => {
  const dirs = site()
  const first = fixture(dirs)
  const urls = ['/css/index.css', '/css/toybox-theme.css', '/js/main.js', '/js/utils.js'].map(first.url)
  urls.forEach(url => assert.match(url, /\?v=[a-f0-9]{10}$/))
  assert.notEqual(version(urls[2]), version(urls[3]))
  first.regenerate()
  assert.deepEqual(urls.map(url => first.url(url.split('?')[0])), urls)
  const second = fixture(dirs)
  assert.deepEqual(urls.map(url => second.url(url.split('?')[0])), urls)
})

test('editing one script changes only that script version', () => {
  const dirs = site()
  const assets = fixture(dirs)
  const names = ['/css/index.css', '/css/toybox-theme.css', '/js/main.js', '/js/utils.js']
  const before = names.map(assets.url)
  write(dirs.file('js/main.js'), 'main(2)')
  assert.deepEqual(names.map(assets.url), before, 'versions are memoized within one generate')
  assets.regenerate()
  const after = names.map(assets.url)
  assert.notEqual(after[2], before[2])
  assert.deepEqual([after[0], after[1], after[3]], [before[0], before[1], before[3]])
})

test('a site source file overrides the theme file it replaces', () => {
  const dirs = site()
  const themeVersion = version(fixture(dirs).url('/js/main.js'))
  write(dirs.siteFile('js/main.js'), 'site main()')
  const siteVersion = version(fixture(dirs).url('/js/main.js'))
  assert.notEqual(siteVersion, themeVersion)
  write(dirs.file('js/main.js'), 'theme main changed')
  assert.equal(version(fixture(dirs).url('/js/main.js')), siteVersion)
})

test('generated Stylus output follows its sources and the merged theme config', () => {
  const dirs = site()
  const css = version(fixture(dirs).url('/css/index.css'))
  write(dirs.file('js/main.js'), 'main(3)')
  assert.equal(version(fixture(dirs).url('/css/index.css')), css, 'scripts do not affect stylesheets')
  write(dirs.file('css/.DS_Store'), 'finder')
  assert.equal(version(fixture(dirs).url('/css/index.css')), css, 'hidden files are ignored')
  assert.notEqual(version(fixture(dirs, { theme: { lazyload: { enable: false } } }).url('/css/index.css')), css)
  write(dirs.file('css/_global/index.styl'), 'body\n  color: blue')
  assert.notEqual(version(fixture(dirs).url('/css/index.css')), css)
})

test('assets that resolve nowhere share one per-build version', () => {
  const dirs = site()
  const assets = fixture(dirs)
  const missing = assets.url('/fonts/missing.woff2')
  assert.match(missing, /^\/fonts\/missing\.woff2\?v=[a-f0-9]{10}$/)
  assert.equal(version(assets.url('/img/missing.png')), version(missing))
  assert.notEqual(version(assets.url('/img/logo.png')), version(missing))
})

test('versioned assets respect subdirectory deployments and existing URL parameters', () => {
  const dirs = site()
  const assets = fixture(dirs, { root: '/hexo-theme-toybox/' })
  const url = new URL(assets.url('/js/main.js?mode=test&v=old#section'), 'https://example.com')
  assert.equal(url.pathname, '/hexo-theme-toybox/js/main.js')
  assert.equal(url.searchParams.get('mode'), 'test')
  assert.equal(url.searchParams.get('v'), version(fixture(dirs).url('/js/main.js')))
  assert.equal(url.searchParams.getAll('v').length, 1)
  assert.equal(url.hash, '#section')
})

test('external CDN and data URLs are not rewritten', () => {
  const assets = fixture(site())
  for (const url of ['https://cdn.example.com/main.js?v=1', '//cdn.example.com/main.css', 'data:text/css,body{}']) {
    assert.equal(assets.url(url), url)
  }
})
