;(function () {
  'use strict'

  function rootPath(path) {
    var root = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/'
    return root.replace(/\/?$/, '/') + String(path || '').replace(/^\/+/, '')
  }

  function relativePath(path) {
    var root = rootPath('')
    if (root !== '/' && path.indexOf(root) === 0) return '/' + path.slice(root.length)
    return path
  }

  var ATLAS_URL = rootPath('img/toybox-sprites/atlas.png?v=platform-1')
  var ATLAS_COLUMNS = 8
  var CELL_SIZE = 32
  var FRAME_INTERVAL = 1000 / 30
  var PLATFORM_SPRITES = range(80, 122)
  var FEATURED_SPRITES = range(80, 95)
  var CUTE_SPRITES = range(30, 79)
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  var atlas = new window.Image()
  var atlasReady = false
  var canvas = null
  var ctx = null
  var items = []
  var frameId = 0
  var resizeFrameId = 0
  var lastFrame = 0
  var viewportWidth = 0
  var viewportHeight = 0

  function range(start, end) {
    var values = []
    for (var value = start; value <= end; value++) values.push(value)
    return values
  }

  function hashString(value) {
    var hash = 2166136261
    for (var index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  function seededRandom(seed) {
    var state = seed >>> 0
    return function () {
      state += 0x6d2b79f5
      var value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
  }

  function animationOff() {
    try {
      return window.localStorage.getItem('pixelAnim') === 'off'
    } catch (error) {
      return false
    }
  }

  function animationExplicitlyOn() {
    try {
      return window.localStorage.getItem('pixelAnim') === 'on'
    } catch (error) {
      return false
    }
  }

  function pageKind() {
    var path = relativePath(window.location.pathname).replace(/index\.html?$/i, '').replace(/\/+$/, '') || '/'
    var isHome = (path === '/' || /^\/page\/\d+$/.test(path)) && document.getElementById('recent-posts')
    if (isHome) return 'home'
    if (document.querySelector('#body-wrap.post #post')) return 'post'
    if (document.querySelector('#archive, #tag, #category') || /^\/(archives|tags|categories)(\/|$)/.test(path)) return 'collection'
    return 'page'
  }

  function spriteCount(kind) {
    if (kind === 'post') return 2
    if (kind === 'collection') return 4
    return 3
  }

  function pickSprite(pool, random, selected) {
    for (var attempt = 0; attempt < pool.length * 2; attempt++) {
      var sprite = pool[Math.floor(random() * pool.length)]
      if (selected.indexOf(sprite) === -1) return sprite
    }
    return pool[0]
  }

  function pickSprites(count, random) {
    var selected = [pickSprite(FEATURED_SPRITES, random, [])]
    while (selected.length < count) {
      var pool = random() < 0.68 ? PLATFORM_SPRITES : CUTE_SPRITES
      selected.push(pickSprite(pool, random, selected))
    }
    return selected
  }

  function contentRect() {
    var content = document.getElementById('content-inner') || document.getElementById('body-wrap')
    if (!content) return { left: viewportWidth / 2, right: viewportWidth / 2 }
    return content.getBoundingClientRect()
  }

  function availableSides(rect) {
    var sides = []
    if (rect.left >= 72) {
      sides.push({ name: 'left', min: 18, max: Math.max(18, rect.left - 22) })
    }
    if (viewportWidth - rect.right >= 72) {
      sides.push({ name: 'right', min: Math.min(viewportWidth - 18, rect.right + 22), max: viewportWidth - 18 })
    }
    return sides
  }

  function layoutItems() {
    if (!canvas) return

    var ratio = Math.min(window.devicePixelRatio || 1, 2)
    viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    canvas.width = Math.round(viewportWidth * ratio)
    canvas.height = Math.round(viewportHeight * ratio)
    canvas.style.width = viewportWidth + 'px'
    canvas.style.height = viewportHeight + 'px'
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.imageSmoothingEnabled = false

    var kind = pageKind()
    var rect = contentRect()
    var sides = availableSides(rect)
    if (viewportWidth < 760 || !sides.length) {
      items = []
      canvas.dataset.spriteCount = '0'
      canvas.dataset.spriteIndices = ''
      draw(0, false)
      return
    }

    var seed = hashString(window.location.pathname + '|' + kind)
    var random = seededRandom(seed)
    var count = spriteCount(kind)
    var sprites = pickSprites(count, random)
    var startSide = Math.floor(random() * sides.length)

    items = sprites.map(function (spriteIndex, index) {
      var side = sides[(startSide + index) % sides.length]
      var yStep = (index + 1) / (count + 1)
      var yJitter = (random() - 0.5) * Math.min(72, viewportHeight * 0.08)
      return {
        spriteIndex: spriteIndex,
        x: side.min + random() * Math.max(0, side.max - side.min),
        y: Math.max(76, Math.min(viewportHeight - 76, viewportHeight * yStep + yJitter)),
        size: Math.round(34 + random() * 8),
        alpha: 0.68 + random() * 0.16,
        phase: random() * Math.PI * 2,
        drift: 1.5 + random() * 1.5,
        speed: 0.45 + random() * 0.2
      }
    })
    canvas.dataset.spriteCount = String(items.length)
    canvas.dataset.spriteIndices = items.map(function (item) { return item.spriteIndex }).join(',')
    canvas.dataset.pageKind = kind
    draw(0, false)
  }

  function draw(time, animated) {
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, viewportWidth, viewportHeight)
    if (!atlasReady || animationOff()) return

    var seconds = time / 1000
    items.forEach(function (item) {
      var x = item.x
      var y = item.y
      if (animated) {
        x += Math.sin(seconds * item.speed + item.phase) * item.drift
        y += Math.sin(seconds * item.speed * 1.35 + item.phase) * 5
      }

      var sourceX = (item.spriteIndex % ATLAS_COLUMNS) * CELL_SIZE
      var sourceY = Math.floor(item.spriteIndex / ATLAS_COLUMNS) * CELL_SIZE
      ctx.globalAlpha = item.alpha
      ctx.drawImage(
        atlas,
        sourceX,
        sourceY,
        CELL_SIZE,
        CELL_SIZE,
        Math.round(x - item.size / 2),
        Math.round(y - item.size / 2),
        item.size,
        item.size
      )
    })
    ctx.globalAlpha = 1
  }

  function stop(clearCanvas) {
    if (frameId) window.cancelAnimationFrame(frameId)
    frameId = 0
    lastFrame = 0
    if (clearCanvas && ctx) ctx.clearRect(0, 0, viewportWidth, viewportHeight)
  }

  function tick(time) {
    frameId = window.requestAnimationFrame(tick)
    if (time - lastFrame < FRAME_INTERVAL) return
    lastFrame = time
    draw(time, true)
  }

  function syncMotion() {
    stop(false)
    if (!canvas || document.hidden || animationOff()) {
      if (animationOff()) draw(0, false)
      return
    }
    if (reducedMotion && !animationExplicitlyOn()) {
      draw(0, false)
      return
    }
    frameId = window.requestAnimationFrame(tick)
  }

  function removeCanvas() {
    stop(false)
    if (canvas) canvas.remove()
    canvas = null
    ctx = null
    items = []
  }

  function setup() {
    if (pageKind() === 'home') {
      removeCanvas()
      return
    }

    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = 'pixel-particles-canvas'
      canvas.setAttribute('aria-hidden', 'true')
      canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'pointer-events:none',
        'z-index:0',
        'image-rendering:pixelated'
      ].join(';')
      document.body.appendChild(canvas)
      ctx = canvas.getContext('2d')
    }

    layoutItems()
    syncMotion()
  }

  function scheduleResize() {
    if (resizeFrameId) return
    resizeFrameId = window.requestAnimationFrame(function () {
      resizeFrameId = 0
      layoutItems()
      syncMotion()
    })
  }

  atlas.onload = function () {
    atlasReady = true
    if (canvas) {
      draw(0, false)
      syncMotion()
    }
  }
  atlas.src = ATLAS_URL

  window.addEventListener('resize', scheduleResize, { passive: true })
  window.addEventListener('pixel-animation-toggle', syncMotion)
  document.addEventListener('visibilitychange', syncMotion)
  document.addEventListener('pjax:complete', setup)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup)
  } else {
    setup()
  }
})()
