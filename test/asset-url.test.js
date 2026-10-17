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
    // Stand-in for hexo.render: the "rendered" CSS is the entry's own text.
    render: { render: async ({ path: file }) => fs.readFileSync(file, 'utf8') },
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

test('unchanged files keep the same version across builds', async () => {
  const dirs = site()
  const first = fixture(dirs)
  await first.regenerate()
  const urls = ['/css/index.css', '/css/toybox-theme.css', '/js/main.js', '/js/utils.js'].map(first.url)
  urls.forEach(url => assert.match(url, /\?v=[a-f0-9]{10}$/))
  assert.notEqual(version(urls[2]), version(urls[3]))
  await first.regenerate()
  assert.deepEqual(urls.map(url => first.url(url.split('?')[0])), urls)
  const second = fixture(dirs)
  await second.regenerate()
  assert.deepEqual(urls.map(url => second.url(url.split('?')[0])), urls)
})

test('editing one script changes only that script version', async () => {
  const dirs = site()
  const assets = fixture(dirs)
  await assets.regenerate()
  const names = ['/css/index.css', '/css/toybox-theme.css', '/js/main.js', '/js/utils.js']
  const before = names.map(assets.url)
  write(dirs.file('js/main.js'), 'main(2)')
  assert.deepEqual(names.map(assets.url), before, 'versions are memoized within one generate')
  await assets.regenerate()
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

test('assets that resolve nowhere share one per-build version', () => {
  const dirs = site()
  const assets = fixture(dirs)
  const missing = assets.url('/fonts/missing.woff2')
  assert.match(missing, /^\/fonts\/missing\.woff2\?v=[a-f0-9]{10}$/)
  assert.equal(version(assets.url('/img/missing.png')), version(missing))
  assert.equal(version(assets.url('/css/generated.css')), version(missing), 'a stylesheet with no source or rendered entry')
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

test('rendered Stylus entries are versioned by their output and stale copies are dropped', async () => {
  const dirs = site()
  const assets = fixture(dirs)
  const md5 = text => require('node:crypto').createHash('md5').update(text).digest('hex').slice(0, 10)
  let output = 'body{color:red}'
  assets.hexo.render = { render: async () => output }
  assets.hexo.public_dir = path.join(dirs.source_dir, '../public')
  const published = path.join(assets.hexo.public_dir, 'css/index.css')
  write(published, 'body{color:blue}')
  await assets.regenerate()
  assert.equal(version(assets.url('/css/index.css')), md5(output))
  assert.equal(fs.existsSync(published), false, 'a stale render is removed so Hexo rewrites it')

  output = 'body{color:green}'
  write(published, output)
  await assets.regenerate()
  assert.equal(version(assets.url('/css/index.css')), md5(output))
  assert.equal(fs.readFileSync(published, 'utf8'), output, 'an up-to-date render is left alone')
})

test('symlinked theme source files are versioned by their target and dangling links do not crash', { skip: process.platform === 'win32' }, () => {
  const dirs = site()
  const vendor = path.join(dirs.source_dir, '../vendor')
  write(path.join(vendor, 'x.css'), 'a{}')
  fs.symlinkSync(vendor, dirs.file('css/vendor'))
  fs.symlinkSync(path.join(vendor, 'missing'), dirs.file('css/dangling.css'))
  const assets = fixture(dirs)
  assert.equal(version(assets.url('/css/vendor/x.css')), require('node:crypto').createHash('md5').update('a{}').digest('hex').slice(0, 10))
  assert.equal(version(assets.url('/css/dangling.css')), version(assets.url('/fonts/missing.woff2')))
})
