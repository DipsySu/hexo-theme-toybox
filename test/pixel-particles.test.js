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
  const activeFrames = new Set()
  const appended = []
  const styleProperties = new Map()
  let frameSequence = 0
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
    querySelector() { return null }
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
    matchMedia() { return media },
    requestAnimationFrame() {
      frameSequence += 1
      activeFrames.add(frameSequence)
      return frameSequence
    }
  }
  context.window = context

  vm.runInNewContext(particleSource, context, { filename: 'pixel-particles.js' })

  return {
    activeFrames,
    appended,
    canvas,
    documentListeners,
    get drawCount() { return drawCount },
    image,
    media,
    storage,
    styleProperties,
    windowListeners
  }
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

test('creates a visible homepage canvas when the cartridge rack fills the viewport', () => {
  const runtime = createRuntime()

  assert.equal(runtime.appended.length, 1)
  assert.equal(runtime.canvas.id, 'pixel-particles-canvas')
  assert.equal(runtime.canvas.dataset.pageKind, 'home')
  assert.equal(runtime.canvas.dataset.spriteCount, '3')
  assert.deepEqual(runtime.styleProperties.get('display'), {
    value: 'block',
    priority: 'important'
  })

  runtime.image.onload()
  assert.ok(runtime.drawCount >= 3)
  assert.equal(runtime.activeFrames.size, 1)
})

test('keeps one unobtrusive homepage sprite on compact viewports', () => {
  const runtime = createRuntime({
    width: 390,
    height: 844,
    contentRect: { left: 0, right: 379, top: 226 }
  })

  assert.equal(runtime.canvas.dataset.pageKind, 'home')
  assert.equal(runtime.canvas.dataset.spriteCount, '1')
  runtime.image.onload()
  assert.ok(runtime.drawCount >= 1)
  assert.equal(runtime.activeFrames.size, 1)
})

test('renders a static scene for reduced motion and honors an explicit animation toggle', () => {
  const runtime = createRuntime({ reducedMotion: true })

  runtime.image.onload()
  assert.ok(runtime.drawCount >= 3)
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
  runtime.documentListeners.get('toybox:color-mode-change')()

  assert.equal(runtime.appended.length, 1)
  assert.equal(runtime.canvas, canvas)
  assert.equal(runtime.canvas.dataset.spriteCount, '3')
  assert.equal(runtime.activeFrames.size, 1)
})

test('reacts when the system reduced-motion preference changes', () => {
  const runtime = createRuntime()
  runtime.image.onload()
  assert.equal(runtime.activeFrames.size, 1)

  runtime.media.listener({ matches: true })
  assert.equal(runtime.activeFrames.size, 0)

  runtime.media.listener({ matches: false })
  assert.equal(runtime.activeFrames.size, 1)
})
