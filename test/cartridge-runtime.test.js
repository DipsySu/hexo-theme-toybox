'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { CustomEvent, classList, evaluate, loadHexo, section, storage } = require('./helpers')
const ANIM = 'source/js/pixel-anim-toggle.js'

function guard(panels = []) {
  const ctx = { document: { querySelectorAll: () => panels }, getComputedStyle: panel => ({ visibility: panel.visibility || 'visible' }) }
  return evaluate(section(ANIM, '  function toyboxShortcutsBlocked', '  function setupToyboxCarousel'), ctx, 'toyboxShortcutsBlocked')
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
  const replacement = section(ANIM, 'recentPosts.replaceWith', 'function enhanceToyboxHome')
  assert.match(replacement, /enhancePixelUi\(\)[\s\S]*lazyLoadInstance\.update\(\)/)
})

test('successful pagination still settles and announces arrival when session storage is blocked', () => {
  const events = []
  const attributes = {}
  const classes = classList(['toybox-page-leaving'])
  const pagination = {
    dataset: { totalPages: '13', toyboxMotionReady: '1' },
    classList: { add() {}, remove() {} },
    setAttribute: (key, value) => { attributes[key] = value }
  }
  const body = {
    dataset: { toyboxPageDirection: 'next' },
    classList: classes,
    querySelector: () => ({ setAttribute() {} })
  }
  const context = {
    TOYBOX_PAGE_MOTION_KEY: 'direction',
    sessionStorage: { getItem() { throw new Error('Storage blocked') } },
    window: { setTimeout() {}, matchMedia: () => ({ matches: false }) },
    document: { dispatchEvent: event => events.push(event) },
    CustomEvent
  }
  evaluate(section(ANIM, '  function setupToyboxPageMotion', '  function enhanceToyboxHome'), context, 'setupToyboxPageMotion')(body, pagination, 2)
  assert.equal(classes.contains('toybox-page-leaving'), false)
  assert.equal(attributes['aria-busy'], 'false')
  assert.equal(events[0].type, 'toybox:page-arrived')
  assert.equal(events[0].detail.current, 2)
  assert.equal(events[0].detail.total, 13)
})

test('fallback artwork stays consistent across views and leaves explicit covers alone', () => {
  const { helpers: { toybox_cover: helper }, filters: { before_generate: reset } } = loadHexo('scripts/helpers/cartridge-cover.js')
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
  const { hexo } = loadHexo('scripts/events/demo-isolation.js', { theme_dir: '/site/themes/toybox/', theme: { ignore: [], options: { ignored: [] } } })
  const pattern = hexo.theme.options.ignored[0]
  assert.equal(pattern.test('/site/themes/toybox/demo/themes/toybox/layout/index.pug'), true)
  assert.equal(pattern.test('/site/themes/toybox/layout/index.pug'), false)
})

test('sidebar toggles even when browser storage is unavailable', () => {
  let hidden = false
  let pressed
  const ctx = {
    document: { documentElement: { classList: { contains: () => hidden, toggle: () => { hidden = !hidden } } } },
    window: { localStorage: { setItem: () => { throw new Error('Storage blocked') } } }
  }
  const actions = evaluate('', ctx, '({' + section('source/js/main.js', '    hideAsideBtn: button => {', '    runMobileToc:') + '})')
  const button = { setAttribute: (_, value) => { pressed = value } }
  actions.hideAsideBtn(button)
  assert.equal(hidden, true)
  assert.equal(pressed, 'true')
  actions.hideAsideBtn(button)
  assert.equal(hidden, false)
  assert.equal(pressed, 'false')
})

function motionToggle(localStorage) {
  const states = []
  const events = []
  let click
  const button = { dataset: {}, addEventListener: (_, handler) => { click = handler } }
  const context = {
    ANIMATION_KEY: 'pixelAnim',
    animationPreference: null,
    syncAnimButtonState: (_, off) => states.push(off),
    document: { getElementById: () => button },
    window: { localStorage, dispatchEvent: event => events.push(event.detail.enabled) },
    CustomEvent
  }
  evaluate(section(ANIM, '  function readAnimationOff()', '  // 把路径归一化'), context, 'syncBtn')()
  return { states, events, click: () => click() }
}

test('the motion toggle keeps working when browser storage is blocked', () => {
  const blocked = () => { throw new Error('Storage blocked') }
  for (const local of [storage({}, true), { getItem: () => null, setItem: blocked }]) {
    const toggle = motionToggle(local)
    toggle.click()
    toggle.click()
    toggle.click()
    assert.deepEqual(toggle.states, [false, true, false, true])
    assert.deepEqual(toggle.events, [false, true, false])
  }

  const local = storage({ pixelAnim: 'off' })
  const toggle = motionToggle(local)
  toggle.click()
  assert.deepEqual(toggle.states, [true, false])
  assert.equal(local.values.get('pixelAnim'), 'on')
})
