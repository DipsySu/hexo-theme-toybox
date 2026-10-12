'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const themeRoot = path.resolve(__dirname, '..')
const particleSource = fs.readFileSync(
  path.join(themeRoot, 'source/js/pixel-particles.js'),
  'utf8'
)

function createStorage(seed) {
  const values = new Map(Object.entries(seed || {}))
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    values
  }
}

function createRuntime(options) {
  const settings = options || {}
  const width = settings.width || 1440
  const height = settings.height || 900
  const storage = createStorage(settings.storage)
  const windowListeners = new Map()
  const documentListeners = new Map()
  const activeFrames = new Map()
  const timers = new Map()
  const appended = []
  const styleProperties = new Map()
  let frameSequence = 0
  let timerSequence = 0
  let now = 0
  let image
  let drawCount = 0

  const media = {
    matches: Boolean(settings.reducedMotion),
    listener: null,
    addEventListener(type, listener) {
      if (type === 'change') this.listener = listener
    }
  }
  const context2d = {
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage() { drawCount += 1 },
    setTransform() {}
  }
  const canvas = {
    dataset: {},
    id: '',
    style: {
      cssText: '',
      setProperty(name, value, priority) {
        styleProperties.set(name, { value: String(value), priority: priority || '' })
      },
      removeProperty(name) { styleProperties.delete(name) }
    },
    getContext(type) {
      assert.equal(type, '2d')
      return context2d
    },
    setAttribute() {}
  }
  const recentPosts = {}
  const content = {
    getBoundingClientRect() {
      return settings.contentRect || { left: 40, right: width - 40 }
    }
  }
  const body = {
    appendChild(element) { appended.push(element) }
  }
  const document = {
    body,
    documentElement: { clientHeight: height, clientWidth: width },
    hidden: false,
    readyState: 'complete',
    addEventListener(type, listener) { documentListeners.set(type, listener) },
    createElement(tag) {
      assert.equal(tag, 'canvas')
      return canvas
    },
    getElementById(id) {
      if (id === 'recent-posts') return recentPosts
      if (id === 'content-inner') return content
      return null
    },
    querySelector(selector) {
      return settings.post && selector === '#body-wrap.post #post' ? {} : null
    }
  }

  function Image() { image = this }

  const context = {
    Image,
    console,
    devicePixelRatio: 1,
    document,
    innerHeight: height,
    innerWidth: width,
    localStorage: storage,
    location: { pathname: settings.pathname || '/' },
    GLOBAL_CONFIG: { root: settings.root || '/' },
    addEventListener(type, listener) { windowListeners.set(type, listener) },
    cancelAnimationFrame(id) { activeFrames.delete(id) },
    clearTimeout(id) { timers.delete(id) },
    matchMedia() { return media },
    requestAnimationFrame(callback) {
      frameSequence += 1
      activeFrames.set(frameSequence, callback)
      return frameSequence
    },
    setTimeout(callback, delay) {
      timerSequence += 1
      timers.set(timerSequence, { callback, at: now + delay, delay })
      return timerSequence
    }
  }
  context.window = context

  vm.runInNewContext(particleSource, context, { filename: 'pixel-particles.js' })

  return {
    activeFrames,
    appended,
    canvas,
    document,
    documentListeners,
    get drawCount() { return drawCount },
    image,
    media,
    storage,
    styleProperties,
    timers,
    windowListeners,
    advance(ms) {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.at > now) continue
        timers.delete(id)
        timer.callback()
      }
    },
    dispatch(type) { documentListeners.get(type)({ type }) },
    runFrame(time) {
      const callbacks = [...activeFrames.values()]
      activeFrames.clear()
      callbacks.forEach(callback => callback(time))
    }
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
  const scripts = fs.readFileSync(
    path.join(themeRoot, 'layout/includes/additional-js.pug'),
    'utf8'
  )

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
  runtime.windowListeners.get('pixel-animation-toggle')()
  assert.equal(runtime.activeFrames.size, 1)

  runtime.storage.setItem('pixelAnim', 'off')
  runtime.windowListeners.get('pixel-animation-toggle')()
  assert.equal(runtime.activeFrames.size, 0)
})

test('keeps one canvas alive across color-mode changes', () => {
  const runtime = createRuntime()
  const canvas = runtime.canvas

  runtime.image.onload()
  runtime.dispatch('toybox:page-arrived')
  runtime.documentListeners.get('toybox:color-mode-change')()

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

  runtime.media.listener({ matches: true })
  assert.equal(runtime.activeFrames.size, 0)

  runtime.media.listener({ matches: false })
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
  reduced.windowListeners.get('pixel-animation-toggle')()
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
  const preview = runtime.windowListeners.get('pixel-sprite-preview')
  preview({ detail: { index: 88 } })
  runtime.image.onload()
  assert.equal(runtime.canvas.dataset.encounter, 'preview')
  assert.equal(runtime.canvas.dataset.encounterSprite, '88')
  assert.equal(runtime.activeFrames.size, 1)
  assert.equal(runtime.appended.length, 1)
  preview({ detail: { index: 123 } })
  assert.equal(runtime.canvas.dataset.encounterSprite, '88')
  runtime.storage.setItem('pixelAnim', 'off')
  runtime.windowListeners.get('pixel-animation-toggle')()
  preview({ detail: { index: 89 } })
  assert.equal(runtime.canvas.dataset.encounter, '')
  assert.equal(runtime.activeFrames.size, 0)
})
