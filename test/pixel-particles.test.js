'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const vm = require('node:vm')
const { clock, eventTarget, read, storage } = require('./helpers')

const particleSource = read('source/js/pixel-particles.js')

function createRuntime(settings = {}) {
  const width = settings.width || 1440
  const height = settings.height || 900
  const time = clock()
  const appended = []
  const styleProperties = new Map()
  let image
  let drawCount = 0

  const media = eventTarget({ matches: Boolean(settings.reducedMotion) }, true)
  const context2d = { globalAlpha: 1, imageSmoothingEnabled: true, clearRect() {}, drawImage() { drawCount += 1 }, setTransform() {} }
  const canvas = {
    dataset: {},
    id: '',
    style: {
      cssText: '',
      setProperty(name, value, priority) { styleProperties.set(name, { value: String(value), priority: priority || '' }) },
      removeProperty(name) { styleProperties.delete(name) }
    },
    getContext(type) {
      assert.equal(type, '2d')
      return context2d
    },
    setAttribute() {}
  }
  const content = { getBoundingClientRect: () => settings.contentRect || { left: 40, right: width - 40 } }
  const document = eventTarget({
    body: { appendChild: element => appended.push(element) },
    documentElement: { clientHeight: height, clientWidth: width },
    hidden: false,
    readyState: 'complete',
    createElement(tag) {
      assert.equal(tag, 'canvas')
      return canvas
    },
    getElementById: id => id === 'recent-posts' ? {} : id === 'content-inner' ? content : null,
    querySelector: selector => settings.post && selector === '#body-wrap.post #post' ? {} : null
  }, true)

  const context = eventTarget({
    Image: function Image() { image = this },
    console,
    devicePixelRatio: 1,
    document,
    innerHeight: height,
    innerWidth: width,
    localStorage: storage(settings.storage),
    location: { pathname: settings.pathname || '/' },
    GLOBAL_CONFIG: { root: settings.root || '/' },
    matchMedia: () => media,
    ...time.globals
  }, true)
  context.window = context

  vm.runInNewContext(particleSource, context, { filename: 'pixel-particles.js' })

  return {
    activeFrames: time.frames,
    advance: time.advance,
    timers: time.timers,
    appended,
    canvas,
    document,
    get drawCount() { return drawCount },
    image,
    media,
    storage: context.localStorage,
    styleProperties,
    window: context,
    dispatch: type => document.emit(type, { type }),
    runFrame: time.frame
  }
}

function createPostRuntime(options) {
  return createRuntime(Object.assign({
    pathname: '/posts/a/',
    post: true,
    contentRect: { left: 300, right: 1140 }
  }, options))
}

test('loads the particle runtime before the animation controls', () => {
  const scripts = read('layout/includes/additional-js.pug')
  const particles = scripts.indexOf('/js/pixel-particles.js')
  const controls = scripts.indexOf('/js/pixel-anim-toggle.js')
  assert.ok(particles >= 0)
  assert.ok(controls > particles)
})

test('keeps a visible but quiet homepage canvas ready for brief encounters', () => {
  const runtime = createRuntime()

  assert.equal(runtime.appended.length, 1)
  assert.equal(runtime.canvas.id, 'pixel-particles-canvas')
  assert.equal(runtime.canvas.dataset.pageKind, 'home')
  assert.equal(runtime.canvas.dataset.spriteCount, '0')
  assert.equal(runtime.canvas.dataset.encounterSlots, '3')
  assert.deepEqual(runtime.styleProperties.get('display'), {
    value: 'block',
    priority: 'important'
  })

  runtime.image.onload()
  assert.equal(runtime.drawCount, 0)
  assert.equal(runtime.activeFrames.size, 0)
  assert.equal(runtime.timers.size, 1)
})

test('keeps one unobtrusive homepage encounter slot on compact viewports', () => {
  const runtime = createRuntime({
    width: 390,
    height: 844,
    contentRect: { left: 0, right: 379, top: 226 }
  })

  assert.equal(runtime.canvas.dataset.pageKind, 'home')
  assert.equal(runtime.canvas.dataset.encounterSlots, '1')
  runtime.image.onload()
  runtime.dispatch('toybox:page-arrived')
  assert.equal(runtime.canvas.dataset.spriteCount, '1')
  assert.equal(runtime.activeFrames.size, 1)
})

test('renders a static scene for reduced motion and honors an explicit animation toggle', () => {
  const runtime = createPostRuntime({ reducedMotion: true })

  runtime.image.onload()
  assert.ok(runtime.drawCount >= 2)
  assert.equal(runtime.activeFrames.size, 0)

  runtime.storage.setItem('pixelAnim', 'on')
  runtime.window.emit('pixel-animation-toggle')
  assert.equal(runtime.activeFrames.size, 1)

  runtime.storage.setItem('pixelAnim', 'off')
  runtime.window.emit('pixel-animation-toggle')
  assert.equal(runtime.activeFrames.size, 0)
})

test('keeps one canvas alive across color-mode changes', () => {
  const runtime = createRuntime()
  const canvas = runtime.canvas

  runtime.image.onload()
  runtime.dispatch('toybox:page-arrived')
  runtime.dispatch('toybox:color-mode-change')

  assert.equal(runtime.appended.length, 1)
  assert.equal(runtime.canvas, canvas)
  assert.equal(runtime.canvas.dataset.encounter, 'page')
  assert.equal(runtime.canvas.dataset.spriteCount, '1')
  assert.equal(runtime.activeFrames.size, 1)
})

test('reacts when the system reduced-motion preference changes', () => {
  const runtime = createPostRuntime()
  runtime.image.onload()
  assert.equal(runtime.activeFrames.size, 1)

  runtime.media.emit('change', { matches: true })
  assert.equal(runtime.activeFrames.size, 0)

  runtime.media.emit('change', { matches: false })
  assert.equal(runtime.activeFrames.size, 1)
})

test('pagination arrival shows one brief sprite and then stops animating', () => {
  const runtime = createRuntime()
  runtime.image.onload()
  runtime.dispatch('toybox:page-arrived')

  assert.equal(runtime.canvas.dataset.encounter, 'page')
  assert.equal(runtime.canvas.dataset.spriteCount, '1')
  assert.equal(runtime.activeFrames.size, 1)

  const draws = runtime.drawCount
  runtime.runFrame(1000)
  assert.equal(runtime.drawCount, draws + 1)
  runtime.runFrame(2000)
  assert.equal(runtime.canvas.dataset.encounter, 'page')
  runtime.runFrame(2900)
  assert.equal(runtime.canvas.dataset.encounter, '')
  assert.equal(runtime.canvas.dataset.spriteCount, '0')
  assert.equal(runtime.activeFrames.size, 0)
})

test('repeated arrivals replace the encounter without stacking frames, timers or canvases', () => {
  const runtime = createRuntime()
  runtime.image.onload()
  for (let index = 0; index < 6; index++) runtime.dispatch('toybox:page-arrived')

  assert.equal(runtime.appended.length, 1)
  assert.equal(runtime.canvas.dataset.spriteCount, '1')
  assert.equal(runtime.canvas.dataset.encounterCount, '6')
  assert.equal(runtime.activeFrames.size, 1)
  assert.equal(runtime.timers.size, 1)
})

test('idle encounters wait fifteen to twenty-five seconds on the homepage', () => {
  const runtime = createRuntime()
  runtime.image.onload()
  const [idle] = runtime.timers.values()

  assert.ok(idle.delay >= 15000 && idle.delay < 25000)
  runtime.advance(idle.delay - 1)
  assert.equal(runtime.canvas.dataset.encounter, '')
  runtime.advance(1)
  assert.equal(runtime.canvas.dataset.encounter, 'idle')
  assert.equal(runtime.timers.size, 1)
  assert.equal(runtime.activeFrames.size, 1)
})

test('a returning completion waits for the atlas and greets with a featured sprite', () => {
  const runtime = createRuntime()
  runtime.dispatch('toybox:reading-complete')
  assert.equal(runtime.canvas.dataset.encounter, '')

  runtime.image.onload()
  const sprite = Number(runtime.canvas.dataset.encounterSprite)
  assert.equal(runtime.canvas.dataset.encounter, 'complete')
  assert.ok(sprite >= 80 && sprite <= 95)
})

test('encounters pause when motion is off, reduced or the tab is hidden', () => {
  const off = createRuntime({ storage: { pixelAnim: 'off' } })
  off.image.onload()
  off.dispatch('toybox:page-arrived')
  assert.equal(off.canvas.dataset.encounter, '')
  assert.equal(off.timers.size, 0)

  const reduced = createRuntime({ reducedMotion: true })
  reduced.image.onload()
  reduced.dispatch('toybox:reading-complete')
  assert.equal(reduced.canvas.dataset.encounter, '')
  assert.equal(reduced.timers.size, 0)

  reduced.storage.setItem('pixelAnim', 'on')
  reduced.window.emit('pixel-animation-toggle')
  reduced.dispatch('toybox:page-arrived')
  assert.equal(reduced.canvas.dataset.encounter, 'page')

  reduced.document.hidden = true
  reduced.dispatch('visibilitychange')
  assert.equal(reduced.canvas.dataset.encounter, '')
  assert.equal(reduced.activeFrames.size, 0)
  assert.equal(reduced.timers.size, 0)
  reduced.dispatch('toybox:page-arrived')
  assert.equal(reduced.canvas.dataset.encounter, '')
})

test('article pages keep their ambient sprites and ignore homepage encounters', () => {
  const runtime = createPostRuntime()
  runtime.image.onload()

  assert.equal(runtime.canvas.dataset.pageKind, 'post')
  assert.equal(runtime.canvas.dataset.spriteCount, '2')
  assert.equal(runtime.activeFrames.size, 1)
  runtime.dispatch('toybox:page-arrived')
  runtime.dispatch('toybox:reading-complete')
  assert.equal(runtime.canvas.dataset.encounter, '')
  assert.equal(runtime.canvas.dataset.spriteCount, '2')
  assert.equal(runtime.activeFrames.size, 1)
  assert.equal(runtime.timers.size, 0)
})

test('sprite preview uses the same single-encounter lifecycle and honors motion controls', () => {
  const runtime = createRuntime()
  const preview = event => runtime.window.emit('pixel-sprite-preview', event)
  preview({ detail: { index: 88 } })
  runtime.image.onload()
  assert.equal(runtime.canvas.dataset.encounter, 'preview')
  assert.equal(runtime.canvas.dataset.encounterSprite, '88')
  assert.equal(runtime.activeFrames.size, 1)
  assert.equal(runtime.appended.length, 1)
  preview({ detail: { index: 123 } })
  assert.equal(runtime.canvas.dataset.encounterSprite, '88')
  runtime.storage.setItem('pixelAnim', 'off')
  runtime.window.emit('pixel-animation-toggle')
  preview({ detail: { index: 89 } })
  assert.equal(runtime.canvas.dataset.encounter, '')
  assert.equal(runtime.activeFrames.size, 0)
})

test('phone-width article pages leave the canvas idle and skip the sprite atlas', () => {
  const runtime = createPostRuntime({ width: 375, height: 812, contentRect: { left: 0, right: 375 } })

  assert.equal(runtime.canvas.dataset.pageKind, 'post')
  assert.equal(runtime.canvas.dataset.spriteCount, '0')
  assert.equal(runtime.activeFrames.size, 0)
  assert.equal(runtime.image.src, undefined)

  runtime.storage.setItem('pixelAnim', 'on')
  runtime.window.emit('pixel-animation-toggle', { detail: { enabled: true } })
  runtime.dispatch('visibilitychange')
  assert.equal(runtime.activeFrames.size, 0)
})

test('reads the motion preference once instead of on every frame', () => {
  const runtime = createPostRuntime()
  let reads = 0
  const getItem = runtime.storage.getItem
  runtime.storage.getItem = key => { reads += 1; return getItem(key) }
  assert.ok(runtime.image.src.endsWith('img/toybox-sprites/atlas.png?v=platform-1'))
  runtime.image.onload()

  for (let frame = 1; frame <= 30; frame++) runtime.runFrame(frame * 40)
  assert.equal(reads, 0)
  assert.equal(runtime.activeFrames.size, 1)

  runtime.storage.setItem('pixelAnim', 'off')
  runtime.window.emit('storage', { key: 'pixelAnim', newValue: 'off' })
  assert.equal(runtime.activeFrames.size, 0)

  runtime.window.emit('pixel-animation-toggle', { detail: { enabled: true } })
  assert.equal(runtime.activeFrames.size, 1)
})
