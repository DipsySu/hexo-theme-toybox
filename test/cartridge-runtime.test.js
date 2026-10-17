'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const root = path.join(__dirname, '..')
const runtime = fs.readFileSync(path.join(root, 'source/js/pixel-anim-toggle.js'), 'utf8')

function guard(panels = []) {
  const source = runtime.slice(runtime.indexOf('  function toyboxShortcutsBlocked'), runtime.indexOf('  function setupToyboxCarousel'))
  const ctx = { document: { querySelectorAll: () => panels }, getComputedStyle: panel => ({ visibility: panel.visibility || 'visible' }) }
  vm.runInNewContext(source + '\nthis.blocked = toyboxShortcutsBlocked', ctx)
  return ctx.blocked
}

test('page shortcuts stay active on the rack but suspend in overlays and controls', () => {
  assert.equal(guard()({}), false)
  for (const event of [{ isComposing: true }, { ctrlKey: true }, { defaultPrevented: true }, { target: { closest: () => ({}) } }, { target: { isContentEditable: true } }]) assert.equal(guard()(event), true)
  const panel = { hidden: false, getAttribute: () => 'false', getClientRects: () => [{}] }
  assert.equal(guard([panel])({}), true)
  assert.equal(guard([{ ...panel, hidden: true }])({}), false)
  assert.equal(guard([{ ...panel, getAttribute: () => 'true' }])({}), false)
  assert.equal(guard([{ ...panel, getClientRects: () => [] }])({}), false)
  const rackButton = { closest: () => ({}) }
  assert.equal(guard()({ key: 'ArrowRight', target: rackButton }), false)
  assert.equal(guard()({ key: 'a', target: rackButton }), true)
  assert.equal(guard([panel])({ key: 'ArrowRight', target: rackButton }), true)
})

test('AJAX pagination refreshes lazy images after inserting the new rack', () => {
  const replacement = runtime.slice(runtime.indexOf('recentPosts.replaceWith'), runtime.indexOf('function enhanceToyboxHome'))
  assert.match(replacement, /enhancePixelUi\(\)[\s\S]*lazyLoadInstance\.update\(\)/)
})

test('successful pagination still settles and announces arrival when session storage is blocked', () => {
  const source = runtime.slice(runtime.indexOf('  function setupToyboxPageMotion'), runtime.indexOf('  function enhanceToyboxHome'))
  const events = []
  const attributes = {}
  const classes = new Set(['toybox-page-leaving'])
  const pagination = {
    dataset: { totalPages: '13', toyboxMotionReady: '1' },
    classList: { add() {}, remove() {} },
    setAttribute: (key, value) => { attributes[key] = value }
  }
  const body = {
    dataset: { toyboxPageDirection: 'next' },
    classList: { contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name) },
    querySelector: () => ({ setAttribute() {} })
  }
  const context = {
    TOYBOX_PAGE_MOTION_KEY: 'direction',
    sessionStorage: { getItem() { throw new Error('Storage blocked') } },
    window: { setTimeout() {}, matchMedia: () => ({ matches: false }) },
    document: { dispatchEvent: event => events.push(event) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail } }
  }
  vm.runInNewContext(source + '\nthis.setup = setupToyboxPageMotion', context)
  context.setup(body, pagination, 2)
  assert.equal(classes.has('toybox-page-leaving'), false)
  assert.equal(attributes['aria-busy'], 'false')
  assert.equal(events[0].type, 'toybox:page-arrived')
  assert.equal(events[0].detail.current, 2)
  assert.equal(events[0].detail.total, 13)
})

test('fallback artwork stays consistent across views and leaves explicit covers alone', () => {
  let helper
  let reset
  const hexo = { extend: { helper: { register: (_, fn) => { helper = fn } }, filter: { register: (_, fn) => { reset = fn } } } }
  const helperPath = path.join(root, 'scripts/helpers/cartridge-cover.js')
  vm.runInNewContext(fs.readFileSync(helperPath, 'utf8'), { hexo, Map, require: require('node:module').createRequire(helperPath) })
  const posts = ['a', 'b', 'c'].map(path => ({ path, cover: 'old', toybox_cover_source: 'fallback' }))
  const context = { theme: { cover: { default_cover: ['red.jpg', 'blue.jpg', 'green.jpg'] } }, site: { posts: { sort: () => posts } } }
  assert.deepEqual(posts.map(post => helper.call(context, post)), ['red.jpg', 'blue.jpg', 'green.jpg'])
  assert.equal(helper.call(context, posts[1]), 'blue.jpg')
  assert.equal(helper.call(context, { path: 'b', cover: 'custom.jpg', toybox_cover_source: 'explicit' }), 'custom.jpg')
  assert.equal(helper.call(context, { path: 'a', cover: false, toybox_cover_source: 'disabled' }), false)
  reset()
  assert.equal(helper.call(context, posts[2]), 'green.jpg')
})

test('demo isolation excludes generated copies but not real theme layouts', () => {
  const hexo = { theme_dir: '/site/themes/toybox/', theme: { ignore: [], options: { ignored: [] } } }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/events/demo-isolation.js'), 'utf8'), { hexo, require })
  const pattern = hexo.theme.options.ignored[0]
  assert.equal(pattern.test('/site/themes/toybox/demo/themes/toybox/layout/index.pug'), true)
  assert.equal(pattern.test('/site/themes/toybox/layout/index.pug'), false)
})

test('sidebar toggles even when browser storage is unavailable', () => {
  const main = fs.readFileSync(path.join(root, 'source/js/main.js'), 'utf8')
  const body = main.slice(main.indexOf('    hideAsideBtn: button => {'), main.indexOf('    runMobileToc:'))
  let hidden = false
  let pressed
  const ctx = {
    document: { documentElement: { classList: { contains: () => hidden, toggle: () => { hidden = !hidden } } } },
    window: { localStorage: { setItem: () => { throw new Error('Storage blocked') } } }
  }
  vm.runInNewContext('this.actions = ({' + body + '})', ctx)
  const button = { setAttribute: (_, value) => { pressed = value } }
  ctx.actions.hideAsideBtn(button)
  assert.equal(hidden, true)
  assert.equal(pressed, 'true')
  ctx.actions.hideAsideBtn(button)
  assert.equal(hidden, false)
  assert.equal(pressed, 'false')
})
