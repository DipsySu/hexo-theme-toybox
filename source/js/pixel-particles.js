;(function () {
  'use strict'

  var ROOT = (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/').replace(/\/?$/, '/')
  var ATLAS_URL = ROOT + 'img/toybox-sprites/atlas.png?v=platform-1'
  var ATLAS_COLUMNS = 8
  var CELL_SIZE = 32
  var FRAME_INTERVAL = 1000 / 30
  var ENCOUNTER_DURATION = 1800
  var IDLE_MIN_DELAY = 15000
  var IDLE_DELAY_RANGE = 10000
  var PLATFORM_SPRITES = range(80, 122)
  var FEATURED_SPRITES = range(80, 95)
  var CUTE_SPRITES = range(30, 79)
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  var reducedMotion = !!(motionQuery && motionQuery.matches)
  var atlas = new window.Image()
  var atlasReady = false
  var atlasRequested = false
  var canvas = null
  var ctx = null
  var items = []
  var frameId = 0
  var resizeFrameId = 0
  var lastFrame = 0
  var viewportWidth = 0
  var viewportHeight = 0
  var currentKind = ''
  var homeSlots = []
  var encounter = null
  var encounterCount = 0
  var pendingEncounter = null
  var idleTimer = 0
  var encounterPath = ''
  var encounterRandom = Math.random
  var animationPreference = readAnimationPreference()

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

  // Read once and refreshed by the toggle and storage events, never per frame.
  function readAnimationPreference() {
    try {
      return window.localStorage.getItem('pixelAnim')
    } catch (error) {
      return null
    }
  }

  function animationOff() {
    return animationPreference === 'off'
  }

  function animationExplicitlyOn() {
    return animationPreference === 'on'
  }

  function motionAllowed() {
    return !document.hidden && !animationOff() && (!reducedMotion || animationExplicitlyOn())
  }

  function pageKind() {
    var path = window.location.pathname
    if (ROOT !== '/' && path.indexOf(ROOT) === 0) path = '/' + path.slice(ROOT.length)
    path = path.replace(/index\.html?$/i, '').replace(/\/+$/, '') || '/'
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

  function availableSides(rect, kind) {
    var sides = []
    if (rect.left >= 72) {
      sides.push({ name: 'left', min: 18, max: Math.max(18, rect.left - 22) })
    }
    if (viewportWidth - rect.right >= 72) {
      sides.push({ name: 'right', min: Math.min(viewportWidth - 18, rect.right + 22), max: viewportWidth - 18 })
    }

    // The cartridge rack intentionally fills most of the homepage. Keep a
    // narrow edge lane available there instead of treating the full-width
    // content rectangle as a reason to disable every sprite.
    if (kind === 'home' && !sides.length) {
      var leftEdge = Math.max(18, rect.left / 2)
      var rightEdge = Math.min(viewportWidth - 18, rect.right + (viewportWidth - rect.right) / 2)
      sides.push(
        { name: 'left', min: leftEdge, max: leftEdge },
        { name: 'right', min: rightEdge, max: rightEdge }
      )
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
    var sides = availableSides(rect, kind)
    var compactHome = kind === 'home' && viewportWidth < 760
    currentKind = kind
    if (kind !== 'home') resetEncounters()
    canvas.dataset.pageKind = kind
    if ((viewportWidth < 760 && !compactHome) || !sides.length) {
      items = []
      homeSlots = []
      canvas.dataset.spriteIndices = ''
      syncEncounterData()
      draw(0, false)
      return
    }

    var seed = hashString(window.location.pathname + '|' + kind)
    var random = seededRandom(seed)
    if (kind === 'home' && encounterPath !== window.location.pathname) {
      encounterPath = window.location.pathname
      encounterRandom = seededRandom(seed ^ 0x5bd1e995)
    }
    var count = compactHome ? 1 : spriteCount(kind)
    var sprites = pickSprites(count, random)
    var startSide = Math.floor(random() * sides.length)
    var compactHomeY = compactHome
      ? (Number.isFinite(rect.top) ? Math.max(76, rect.top - 20) : Math.min(210, viewportHeight * 0.27))
      : 0

    var placed = sprites.map(function (spriteIndex, index) {
      var side = sides[(startSide + index) % sides.length]
      var yStep = (index + 1) / (count + 1)
      var yJitter = (random() - 0.5) * Math.min(72, viewportHeight * 0.08)
      return {
        spriteIndex: spriteIndex,
        x: side.min + random() * Math.max(0, side.max - side.min),
        y: compactHome ? compactHomeY : Math.max(76, Math.min(viewportHeight - 76, viewportHeight * yStep + yJitter)),
        size: compactHome ? 32 : Math.round(34 + random() * 8),
        alpha: compactHome ? 0.62 : 0.68 + random() * 0.16,
        phase: random() * Math.PI * 2,
        drift: 1.5 + random() * 1.5,
        speed: 0.45 + random() * 0.2
      }
    })
    // Home sprites are brief encounters: the seeded layout only reserves edge
    // slots beside the rack instead of drawing a permanent crowd.
    homeSlots = kind === 'home'
      ? placed.map(function (item) {
        return { x: item.x, y: compactHome ? item.y : Math.max(96, Math.min(viewportHeight - 120, item.y)) }
      })
      : []
    var title = compactHome && document.getElementById('toybox-recent-title')
    if (title) {
      var titleRect = title.getBoundingClientRect()
      if (titleRect.right + 48 < viewportWidth - 16 && titleRect.top >= 76 && titleRect.bottom <= viewportHeight - 48) {
        homeSlots = [{ x: viewportWidth - 36, y: titleRect.top + titleRect.height / 2 }]
      }
    }
    items = kind === 'home' ? [] : placed
    canvas.dataset.spriteIndices = items.map(function (item) { return item.spriteIndex }).join(',')
    syncEncounterData()
    loadAtlas()
    draw(0, false)
  }

  // Phone-width and gutterless pages have nothing to draw, so they skip the atlas request.
  function loadAtlas() {
    if (!atlasRequested && (items.length || homeSlots.length)) {
      atlasRequested = true
      atlas.src = ATLAS_URL
    }
  }

  function drawSprite(spriteIndex, x, y, size, alpha) {
    var sourceX = (spriteIndex % ATLAS_COLUMNS) * CELL_SIZE
    var sourceY = Math.floor(spriteIndex / ATLAS_COLUMNS) * CELL_SIZE
    ctx.globalAlpha = alpha
    ctx.drawImage(
      atlas,
      sourceX,
      sourceY,
      CELL_SIZE,
      CELL_SIZE,
      Math.round(x - size / 2),
      Math.round(y - size / 2),
      size,
      size
    )
  }

  function drawEncounter(time) {
    var progress = Math.min(1, Math.max(0, time - encounter.start) / encounter.duration)
    var fade = Math.max(0, Math.min(1, progress / 0.15, (1 - progress) / 0.2))
    var hop = Math.abs(Math.sin(progress * Math.PI * 2)) * 10
    drawSprite(encounter.spriteIndex, encounter.x, encounter.y - hop, encounter.size, encounter.alpha * fade)
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
      drawSprite(item.spriteIndex, x, y, item.size, item.alpha)
    })
    if (encounter && encounter.start !== null) drawEncounter(time)
    ctx.globalAlpha = 1
  }

  function syncEncounterData() {
    if (!canvas) return
    canvas.dataset.spriteCount = String(items.length + (encounter ? 1 : 0))
    canvas.dataset.encounter = encounter ? encounter.kind : ''
    canvas.dataset.encounterSprite = encounter ? String(encounter.spriteIndex) : ''
    canvas.dataset.encounterCount = String(encounterCount)
    canvas.dataset.encounterSlots = String(homeSlots.length)
  }

  function clearIdle() {
    if (idleTimer) window.clearTimeout(idleTimer)
    idleTimer = 0
  }

  function resetEncounters() {
    clearIdle()
    pendingEncounter = null
    if (!encounter) return
    encounter = null
    syncEncounterData()
  }

  function scheduleIdle() {
    if (idleTimer || currentKind !== 'home' || !atlasReady || !homeSlots.length || !motionAllowed()) return
    idleTimer = window.setTimeout(function () {
      idleTimer = 0
      startEncounter('idle')
    }, IDLE_MIN_DELAY + Math.floor(encounterRandom() * IDLE_DELAY_RANGE))
  }

  // At most one small homepage sprite: a new event replaces the current
  // encounter instead of stacking, and nothing starts against the motion
  // preference or in a hidden tab.
  function startEncounter(kind, spriteIndex) {
    if (!canvas || currentKind !== 'home' || !homeSlots.length || !motionAllowed()) return false
    if (kind === 'preview' && (!Number.isInteger(spriteIndex) || spriteIndex < 0 || spriteIndex > 122)) return false
    if (!atlasReady) {
      pendingEncounter = { kind: kind, spriteIndex: spriteIndex }
      return false
    }

    pendingEncounter = null
    var pool = kind === 'complete'
      ? FEATURED_SPRITES
      : kind === 'page' && encounterRandom() < 0.5 ? PLATFORM_SPRITES : CUTE_SPRITES
    var slot = homeSlots[Math.floor(encounterRandom() * homeSlots.length)]
    encounter = {
      kind: kind,
      spriteIndex: kind === 'preview' ? spriteIndex : pool[Math.floor(encounterRandom() * pool.length)],
      x: slot.x,
      y: slot.y,
      size: 32,
      alpha: 0.9,
      duration: ENCOUNTER_DURATION,
      start: null
    }
    encounterCount += 1
    clearIdle()
    syncEncounterData()
    syncMotion()
    return true
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
    if (encounter && encounter.start === null) {
      encounter.start = time
    } else if (encounter && time - encounter.start >= encounter.duration) {
      encounter = null
      syncEncounterData()
    }
    if (currentKind === 'home' && !encounter) {
      stop(true)
      return
    }
    draw(time, true)
  }

  function syncMotion() {
    stop(false)
    if (!motionAllowed()) resetEncounters()
    if (!canvas || document.hidden || animationOff()) {
      if (animationOff()) draw(0, false)
      return
    }
    if (reducedMotion && !animationExplicitlyOn()) {
      draw(0, false)
      return
    }
    if (currentKind === 'home') {
      scheduleIdle()
      if (!encounter) {
        draw(0, false)
        return
      }
    } else if (!items.length) {
      // Encounters are home-only, so an empty non-home scene has nothing to animate.
      draw(0, false)
      return
    }
    frameId = window.requestAnimationFrame(tick)
  }

  function setup() {
    var kind = pageKind()

    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = 'pixel-particles-canvas'
      canvas.setAttribute('aria-hidden', 'true')
      document.body.appendChild(canvas)
      ctx = canvas.getContext('2d')
    }

    // Position, stacking and pixel rendering come from #pixel-particles-canvas
    // in toybox-theme.css. On home the inline !important display keeps the
    // canvas shown over every stylesheet display rule, the print one included.
    if (kind === 'home') canvas.style.setProperty('display', 'block', 'important')
    else canvas.style.removeProperty('display')

    layoutItems()
    syncMotion()
  }

  function handleReducedMotionChange(event) {
    reducedMotion = !!event.matches
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
      var queued = pendingEncounter
      if (!queued || !startEncounter(queued.kind, queued.spriteIndex)) syncMotion()
    }
  }

  function handlePageArrived() {
    if (!canvas || pageKind() !== 'home') return
    layoutItems()
    startEncounter('page')
  }

  function handleReadingComplete() {
    if (canvas && currentKind === 'home') startEncounter('complete')
  }

  function handleAnimationToggle(event) {
    var enabled = event && event.detail && event.detail.enabled
    animationPreference = typeof enabled === 'boolean' ? (enabled ? 'on' : 'off') : readAnimationPreference()
    syncMotion()
  }

  function handleStorage(event) {
    if (event.key !== 'pixelAnim' && event.key !== null) return
    animationPreference = readAnimationPreference()
    syncMotion()
  }

  window.addEventListener('resize', scheduleResize, { passive: true })
  window.addEventListener('pixel-animation-toggle', handleAnimationToggle)
  window.addEventListener('storage', handleStorage)
  window.addEventListener('pixel-sprite-preview', function (event) {
    if (pageKind() !== 'home') return
    layoutItems()
    startEncounter('preview', event.detail && event.detail.index)
  })
  document.addEventListener('visibilitychange', syncMotion)
  document.addEventListener('toybox:color-mode-change', syncMotion)
  document.addEventListener('toybox:page-arrived', handlePageArrived)
  document.addEventListener('toybox:reading-complete', handleReadingComplete)
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', handleReducedMotionChange)
    else if (motionQuery.addListener) motionQuery.addListener(handleReducedMotionChange)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup)
  } else {
    setup()
  }
})()
