'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const source = fs.readFileSync(path.join(__dirname, '../source/js/cartridge-tilt.js'), 'utf8')

function target() {
  const events = new Map()
  return {
    events,
    addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]) },
    emit(name, event = {}) { for (const fn of events.get(name) || []) fn(event) }
  }
}

function classes(initial = []) {
  const values = new Set(initial)
  return { add: (...names) => names.forEach(n => values.add(n)), remove: (...names) => names.forEach(n => values.delete(n)), contains: n => values.has(n) }
}

function cartridge() {
  const styles = new Map()
  const card = {
    classList: classes(), styles, isConnected: true,
    style: { setProperty: (key, value) => styles.set(key, value), removeProperty: key => styles.delete(key) },
    offsetParent: { getBoundingClientRect: () => ({ left: 20, top: 100 }) },
    offsetLeft: 10, offsetTop: 30, offsetWidth: 200, offsetHeight: 400,
    closest: () => card, contains: node => node === card || node === card.child
  }
  card.child = { closest: () => card }
  return card
}

function setup(options = {}) {
  const pointer = Object.assign(target(), { matches: options.fine !== false })
  const motion = Object.assign(target(), { matches: !!options.reduced })
  const document = Object.assign(target(), { hidden: false, body: { classList: classes(['toybox-home']) } })
  const frames = new Map()
  let next = 0
  const window = Object.assign(target(), {
    matchMedia: query => query.includes('reduced') ? motion : pointer,
    localStorage: { getItem() { if (options.storageBlocked) throw Error('blocked'); return options.off ? 'off' : null } },
    requestAnimationFrame(fn) { frames.set(++next, fn); return next },
    cancelAnimationFrame: id => frames.delete(id)
  })
  const context = vm.createContext({ window, document })
  vm.runInContext(source, context)
  return { document, window, pointer, motion, frames, context,
    tick() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) },
    move(card, x = 130, y = 330, pointerType = 'mouse') { document.emit('pointermove', { target: card, clientX: x, clientY: y, pointerType }) }
  }
}

test('tilt is bounded and uses stable layout coordinates', () => {
  const env = setup()
  const card = cartridge()
  env.move(card, 230, 130)
  env.tick()
  assert.equal(card.styles.get('--tilt-x'), '7.00deg')
  assert.equal(card.styles.get('--tilt-y'), '9.00deg')
  assert.equal(card.styles.get('--foil-x'), '100.00%')
  env.move(card, -500, 5000)
  env.tick()
  assert.equal(card.styles.get('--tilt-x'), '-7.00deg')
  assert.equal(card.styles.get('--tilt-y'), '-9.00deg')
  env.move(card)
  env.tick()
  assert.equal(card.styles.get('--tilt-x'), '0.00deg')
  assert.equal(card.styles.get('--tilt-y'), '0.00deg')
})

test('pointer movement is batched once per frame and does not run an idle loop', () => {
  const env = setup()
  const card = cartridge()
  for (let i = 0; i < 20; i++) env.move(card, 30 + i)
  assert.equal(env.frames.size, 1)
  env.tick()
  assert.equal(env.frames.size, 0)
  assert.equal(card.styles.get('--foil-x'), '9.50%')
})

test('moving between children keeps tilt; leaving cancels queued work and returns to rest', () => {
  const env = setup()
  const card = cartridge()
  env.move(card)
  env.document.emit('pointerout', { relatedTarget: card.child })
  assert.equal(card.classList.contains('is-tilting'), true)
  env.document.emit('pointerout', { relatedTarget: null })
  assert.equal(env.frames.size, 0)
  assert.equal(card.classList.contains('is-tilting'), false)
  assert.equal(card.styles.size, 0)
})

test('touch, reduced motion, coarse pointers, and disabled animation remain still', () => {
  for (const option of [{ reduced: true }, { fine: false }, { off: true }, { touch: true }]) {
    const env = setup(option)
    const card = cartridge()
    env.move(card, 230, 130, option.touch ? 'touch' : 'mouse')
    env.tick()
    assert.equal(card.classList.contains('is-tilting'), false)
    assert.equal(card.styles.size, 0)
  }
})

test('clicking a card link keeps its hit target still until navigation', () => {
  const env = setup()
  const card = cartridge()
  env.move(card)
  env.tick()
  env.document.emit('pointerdown', { target: card.child, pointerType: 'mouse' })
  assert.equal(card.classList.contains('is-tilting'), true)
  env.document.emit('pointerdown', { target: {}, pointerType: 'mouse' })
  assert.equal(card.classList.contains('is-tilting'), false)
})

test('live motion preference changes and animation controls immediately clear tilt', () => {
  const env = setup()
  const card = cartridge()
  env.move(card)
  env.tick()
  env.motion.matches = true
  env.motion.emit('change')
  assert.equal(card.classList.contains('toybox-tilt-ready'), false)
  env.motion.matches = false
  env.move(card)
  env.window.emit('pixel-animation-toggle', { detail: { enabled: false } })
  env.move(card)
  assert.equal(card.classList.contains('is-tilting'), false)
  env.window.emit('pixel-animation-toggle', { detail: { enabled: true } })
  env.move(card)
  assert.equal(card.classList.contains('is-tilting'), true)
})

test('delegation supports AJAX card replacement without duplicating listeners', () => {
  const env = setup()
  const old = cartridge()
  env.move(old)
  old.isConnected = false
  env.tick()
  assert.equal(old.classList.contains('is-tilting'), false)
  env.document.emit('toybox:page-arrived')
  const next = cartridge()
  env.move(next)
  env.tick()
  assert.equal(next.classList.contains('is-tilting'), true)
  vm.runInContext(source, env.context)
  assert.equal(env.document.events.get('pointermove').length, 1)
})

test('scroll, resize, tab hiding, and keyboard interaction clear stale tilt', () => {
  for (const [scope, event] of [['document', 'scroll'], ['window', 'resize'], ['window', 'blur'], ['document', 'visibilitychange'], ['document', 'keydown']]) {
    const env = setup()
    const card = cartridge()
    env.move(card)
    env.tick()
    env[scope].emit(event)
    assert.equal(card.classList.contains('is-tilting'), false, event)
    assert.equal(card.styles.size, 0, event)
  }
})

test('storage failures are harmless and paper/other views do not enable the effect', () => {
  const env = setup({ storageBlocked: true })
  const card = cartridge()
  env.move(card)
  env.tick()
  assert.equal(card.classList.contains('is-tilting'), true)
  env.document.body.classList.add('toybox-paper')
  env.move(card)
  assert.equal(card.classList.contains('is-tilting'), false)
  env.document.body.classList.remove('toybox-paper', 'toybox-home')
  env.move(card)
  assert.equal(card.classList.contains('is-tilting'), false)
})
