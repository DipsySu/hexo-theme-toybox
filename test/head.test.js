'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const head = fs.readFileSync(path.join(root, 'layout/includes/head.pug'), 'utf8')
const settingsScript = new vm.Script(fs.readFileSync(path.join(root, 'source/js/toybox-settings.js'), 'utf8'), { filename: 'toybox-settings.js' })

const defaultBlock = head.match(/^-\n((?: {2}.+\n)+)/m)[1]
const bootstrapSource = head.match(/^script\.\n((?: {2}.*\n)+)/m)[1].replace(/^ {2}/gm, '')

function createStorage (seed, throws) {
  const values = new Map(Object.entries(seed).filter(([, value]) => value !== null))
  const storage = {
    getItem (key) { return values.has(key) ? values.get(key) : null },
    setItem (key, value) { values.set(key, String(value)) },
    removeItem (key) { values.delete(key) }
  }
  return () => {
    if (throws) throw new Error('SecurityError')
    return storage
  }
}

function renderedDefault (configured) {
  const context = { theme: { toybox: { settings: { color_mode: { default: configured } } } } }
  vm.runInNewContext(defaultBlock + '\nresult = toyboxColorDefault', context)
  return context.result
}

function runBootstrap ({ storage = {}, prefersDark = false, configured = 'auto', hideAside = false, throws = false, matchMedia = true }) {
  const attributes = {}
  const classes = new Set(hideAside ? ['hide-aside'] : [])
  const rootElement = {
    setAttribute (key, value) { attributes[key] = String(value) },
    classList: { toggle (name, force) { if (force) classes.add(name); else classes.delete(name) } }
  }
  const context = { document: { documentElement: rootElement } }
  context.window = context
  Object.defineProperty(context, 'localStorage', { get: createStorage(storage, throws) })
  if (matchMedia) context.matchMedia = () => ({ matches: prefersDark })
  const source = bootstrapSource.replace("'!{toyboxColorDefault}'", JSON.stringify(renderedDefault(configured)))
  vm.runInNewContext(source, context)
  return { theme: attributes['data-theme'], mode: attributes['data-toybox-color-mode'], hideAside: classes.has('hide-aside') }
}

function runSettings ({ storage = {}, prefersDark = false, configured = 'auto' }) {
  const attributes = {}
  const rootElement = {
    nodeType: 1,
    dataset: {},
    lang: 'zh-CN',
    style: { setProperty () {} },
    matches () { return false },
    querySelectorAll () { return [] },
    setAttribute (key, value) { attributes[key] = String(value) },
    getAttribute (key) { return attributes[key] || null }
  }
  const context = {
    document: {
      nodeType: 9,
      readyState: 'complete',
      body: {},
      documentElement: rootElement,
      getElementById () { return null },
      querySelector () { return null },
      querySelectorAll () { return [] },
      addEventListener () {},
      dispatchEvent () {}
    },
    CustomEvent: class { constructor (type, init) { this.type = type; this.detail = init && init.detail } },
    MutationObserver: class { disconnect () {} observe () {} },
    requestAnimationFrame: callback => callback(),
    matchMedia: () => ({ matches: prefersDark, addEventListener () {} })
  }
  context.window = context
  Object.defineProperty(context, 'localStorage', { get: createStorage(storage, false) })
  // head/config.pug passes the configured default through unnormalized.
  context.GLOBAL_CONFIG = { toybox: { colorMode: configured || 'auto', locale: 'zh-CN' } }
  settingsScript.runInNewContext(context)
  return { theme: attributes['data-theme'], mode: rootElement.dataset.toyboxColorMode }
}

test('pre-paint color bootstrap resolves exactly what toybox-settings.js applies after load', () => {
  const stored = [null, '', 'light', 'dark', 'auto', 'sepia']
  const legacy = [null, 'light', '{"value":"dark","expiry":1}']
  const defaults = ['auto', 'dark', 'bogus', undefined]
  let cases = 0

  stored.forEach(mode => legacy.forEach(theme => defaults.forEach(configured => [false, true].forEach(prefersDark => {
    const options = { storage: { 'toybox-color-mode': mode, theme }, configured, prefersDark }
    assert.deepEqual(runBootstrap(options), Object.assign(runSettings(options), { hideAside: false }), JSON.stringify(options))
    cases++
  }))))
  assert.equal(cases, 144)
})

test('pre-paint bootstrap restores the saved reading layout like main.js and never throws', () => {
  assert.equal(runBootstrap({ storage: { 'toybox-aside': 'hide' } }).hideAside, true)
  assert.equal(runBootstrap({ storage: { 'toybox-aside': 'show' }, hideAside: true }).hideAside, false)
  assert.equal(runBootstrap({ hideAside: true }).hideAside, true)
  assert.equal(runBootstrap({}).hideAside, false)

  assert.deepEqual(runBootstrap({ throws: true, configured: 'dark' }), { theme: 'dark', mode: 'dark', hideAside: false })
  assert.deepEqual(runBootstrap({ matchMedia: false }), { theme: 'light', mode: 'auto', hideAside: false })
})

test('head renders the bootstrap before one bundled stylesheet and gates home-only assets', () => {
  const bootstrap = head.indexOf('script.')
  const firstStylesheet = head.indexOf("link(rel='stylesheet'")

  assert.ok(head.indexOf("classList.add('toybox-js')") < bootstrap)
  assert.ok(bootstrap < firstStylesheet)
  // The main bundle, the home bundle, and the opt-in paper skin, which must stay last.
  assert.equal((head.match(/link\(rel='stylesheet'/g) || []).length, 3)
  assert.match(head, /link\(rel='stylesheet' href=toybox_asset\(theme\.asset\.main_css\)\)\nif is_home\(\)\n {2}link\(rel='stylesheet' href=toybox_asset\('\/css\/toybox-home\.css'\)\)\nif toyboxPaper\n {2}link\(rel='stylesheet' href=toybox_asset\('\/css\/paper-stage\.css'\)\)\n/)
  assert.match(head, /if is_home\(\) \|\| toyboxCollectionView\n {2}link\(rel='preload' as='font'/)
  assert.doesNotMatch(head, /fusion-pixel-fonts\.css|fancybox_css|fontawesome/)

  const bundle = fs.readFileSync(path.join(root, 'source/css/index.styl'), 'utf8')
  assert.match(bundle, /@import 'pixel-icons\.css'\n@import 'cartridge-tokens\.css'\n@import 'toybox-theme\.css'\n@import 'toybox-settings\.css'\n$/)
  const homeBundle = fs.readFileSync(path.join(root, 'source/css/toybox-home.styl'), 'utf8')
  assert.match(homeBundle, /@import 'home-toybox\.css'\n@import 'cartridge-tilt\.css'\n@import 'sprite-lab\.css'\n$/)
})
