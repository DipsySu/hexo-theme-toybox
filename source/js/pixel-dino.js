;(function () {
  'use strict'

  function rootPath(path) {
    var root = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/'
    return root.replace(/\/?$/, '/') + String(path || '').replace(/^\/+/, '')
  }

  function setupToyboxSidePacman() {
    if (document.getElementById('toybox-side-pacman')) return

    var canvas = document.createElement('canvas')
    canvas.id = 'toybox-side-pacman'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)

    var ctx = canvas.getContext('2d')
    if (!ctx) return

    var frameId = 0
    var lastTime = 0
    var distance = 0
    var enabled = false
    var encountersEnabled = false
    var leftX = 0
    var rightX = 0
    var pathTop = 70
    var pathBottom = 0
    var segmentLength = 0
    var speed = 72
    var encounter = null
    var encounterCount = 0
    var encounterDelay = 1.2 + Math.random() * 1.8
    var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    var encounterPalettes = [
      { main: '#28b9cf', light: '#bdf4f1', dark: '#126f88', accent: '#f4c928' },
      { main: '#ef5961', light: '#ffd5c6', dark: '#9f303b', accent: '#54c978' },
      { main: '#6f62d9', light: '#d8d0ff', dark: '#3f388c', accent: '#ffca43' },
      { main: '#54b96b', light: '#d7f5bd', dark: '#277343', accent: '#ee6e83' }
    ]
    var encounterSpriteGroups = {
      'platform-classic': [
        80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
        96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
        110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122
      ],
      'bee-squad': [0, 1, 63, 68, 72, 120],
      'star-fighter': [2, 3, 4, 5, 17, 24],
      'energy-capsule': [
        6, 7, 8, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 25, 26, 27, 28, 29,
        30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66,
        67, 69, 70, 71, 73, 74, 75, 76, 77, 78, 79
      ],
      'pixel-meteor': [9, 10, 18, 23]
    }
    var encounterAtlas = new window.Image()
    var encounterAtlasReady = false

    encounterAtlas.onload = function() {
      encounterAtlasReady = true
      draw()
    }
    encounterAtlas.src = rootPath('img/toybox-sprites/atlas.png?v=platform-1')

    function animationOff() {
      try {
        return window.localStorage.getItem('pixelAnim') === 'off'
      } catch (error) {
        return false
      }
    }

    function resize() {
      var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
      var height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      var ratio = Math.min(window.devicePixelRatio || 1, 2)
      var wrap = document.getElementById('body-wrap')
      var rect = wrap && wrap.getBoundingClientRect()
      var leftGutter = rect ? rect.left : 0
      var rightGutter = rect ? width - rect.right : 0

      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      enabled = width >= 1600 && height >= 760 && leftGutter >= 44 && rightGutter >= 44
      encountersEnabled = enabled && leftGutter >= 76 && rightGutter >= 76
      leftX = Math.max(22, leftGutter / 2)
      rightX = width - Math.max(22, rightGutter / 2)
      pathTop = Math.max(64, height * 0.08)
      pathBottom = Math.min(height - 64, height * 0.92)
      segmentLength = Math.max(1, pathBottom - pathTop)
      if (distance >= segmentLength * 2) distance = 0
      if (encounter) {
        encounter.y = Math.max(pathTop + 58, Math.min(pathBottom - 58, encounter.y))
        if (!encountersEnabled) encounter = null
      }
      draw()
    }

    function pointAt(value) {
      var total = segmentLength * 2
      var normalized = ((value % total) + total) % total
      if (normalized < segmentLength) {
        return { x: leftX, y: pathTop + normalized, direction: 'down', rail: 'left' }
      }
      return { x: rightX, y: pathBottom - (normalized - segmentLength), direction: 'up', rail: 'right' }
    }

    function drawDots(pac) {
      ctx.fillStyle = 'rgba(181, 145, 42, 0.55)'
      for (var y = pathTop + 18; y < pathBottom - 10; y += 22) {
        var leftEaten = pac.rail === 'left' ? y <= pac.y : pac.rail === 'right'
        var rightEaten = pac.rail === 'right' && y >= pac.y
        if (!leftEaten) ctx.fillRect(Math.round(leftX - 2), Math.round(y - 2), 4, 4)
        if (!rightEaten) ctx.fillRect(Math.round(rightX - 2), Math.round(y - 2), 4, 4)
      }
    }

    function drawTunnel(x, y) {
      ctx.strokeStyle = 'rgba(60, 61, 58, 0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(Math.round(x - 12), Math.round(y - 8), 24, 16)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)'
      ctx.fillRect(Math.round(x - 8), Math.round(y - 4), 16, 8)
    }

    function drawPacman(point, mouth) {
      var angle = point.direction === 'down' ? Math.PI / 2 : -Math.PI / 2
      ctx.fillStyle = '#f4c928'
      ctx.strokeStyle = '#9b7610'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
      ctx.arc(point.x, point.y, 10, angle + mouth, angle - mouth + Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    function drawGhost(point) {
      var x = Math.round(point.x - 8)
      var y = Math.round(point.y - 8)
      ctx.fillStyle = '#ef6f78'
      ctx.beginPath()
      ctx.arc(x + 8, y + 7, 8, Math.PI, 0)
      ctx.lineTo(x + 16, y + 16)
      ctx.lineTo(x + 12, y + 13)
      ctx.lineTo(x + 8, y + 16)
      ctx.lineTo(x + 4, y + 13)
      ctx.lineTo(x, y + 16)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(x + 4, y + 6, 4, 5)
      ctx.fillRect(x + 10, y + 6, 4, 5)
      ctx.fillStyle = '#305b9d'
      ctx.fillRect(x + 5, y + 8, 2, 2)
      ctx.fillRect(x + 11, y + 8, 2, 2)
    }

    function pixelRect(x, y, width, height, color) {
      ctx.fillStyle = color
      ctx.fillRect(Math.round(x), Math.round(y), width, height)
    }

    function drawBeeDrone(x, y, palette, flap, variant) {
      var wing = flap ? 6 : 4
      pixelRect(x - 3, y - 8, 6, 3, palette.light)
      pixelRect(x - 7, y - wing, 4, 5, palette.main)
      pixelRect(x + 3, y - wing, 4, 5, palette.main)
      pixelRect(x - 5, y - 3, 10, 8, palette.accent)
      pixelRect(x - 3, y - 1, 6, 3, palette.dark)
      pixelRect(x - 5, y + 5, 3, 3, palette.dark)
      pixelRect(x + 2, y + 5, 3, 3, palette.dark)
      if (variant) pixelRect(x - 1, y - 7, 2, 2, '#ffffff')
    }

    function drawBeeSquad(item) {
      var count = item.variant ? 5 : 3
      var flap = Math.floor(item.age * 8) % 2
      var spacing = 18
      for (var i = 0; i < count; i++) {
        var row = i < 3 ? 0 : 1
        var column = i < 3 ? i - 1 : (i - 3) * 2 - 1
        var x = item.x + column * spacing * 0.55
        var y = item.y + row * 18 + Math.abs(column) * 5
        drawBeeDrone(x, y, item.palette, flap === i % 2, item.variant)
      }
    }

    function drawStarFighter(item) {
      var direction = item.direction
      var x = item.x + Math.sin(item.age * 3) * 8 * direction
      var y = item.y + Math.sin(item.age * 5) * 3
      pixelRect(x - 12, y - 3, 24, 6, item.palette.main)
      pixelRect(x - 5, y - 7, 12, 14, item.palette.light)
      pixelRect(x + direction * 8 - 3, y - 2, 9, 4, item.palette.accent)
      pixelRect(x - direction * 12 - 4, y - 5, 6, 3, item.palette.dark)
      pixelRect(x - direction * 12 - 4, y + 2, 6, 3, item.palette.dark)
      pixelRect(x - direction * 18 - 2, y - 1, 5, 2, '#f48b35')
      if (Math.floor(item.age * 5) % 2) {
        pixelRect(x + direction * 22, y - 1, 6, 2, item.palette.accent)
        pixelRect(x + direction * 32, y - 1, 3, 2, item.palette.light)
      }
    }

    function drawEnergyCapsule(item) {
      var x = item.x + Math.sin(item.age * 2.6) * 5
      var y = item.y
      pixelRect(x - 14, y - 7, 28, 14, item.palette.dark)
      pixelRect(x - 10, y - 5, 20, 10, item.palette.light)
      pixelRect(x - 3, y - 5, 6, 10, item.palette.main)
      pixelRect(x - 1, y - 2, 2, 4, item.palette.accent)
      pixelRect(x - 18, y - 4, 4, 8, item.palette.accent)
      pixelRect(x + 14, y - 4, 4, 8, item.palette.accent)
    }

    function drawPixelMeteor(item) {
      var drift = (item.age * 18 * item.direction) % 34
      var x = item.x + drift - 17 * item.direction
      var y = item.y + Math.sin(item.age * 4) * 4
      pixelRect(x - item.direction * 18, y - 2, 12, 4, item.palette.light)
      pixelRect(x - item.direction * 10, y - 4, 10, 8, item.palette.accent)
      pixelRect(x - 5, y - 7, 14, 14, item.palette.main)
      pixelRect(x - 2, y - 4, 8, 8, item.palette.dark)
      pixelRect(x + 1, y - 2, 4, 4, item.palette.light)
    }

    function drawAtlasCell(index, x, y, size) {
      var sourceX = (index % 8) * 32
      var sourceY = Math.floor(index / 8) * 32
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        encounterAtlas,
        sourceX,
        sourceY,
        32,
        32,
        Math.round(x - size / 2),
        Math.round(y - size / 2),
        size,
        size
      )
    }

    function drawAtlasEncounter(item) {
      var bob = Math.sin(item.age * 4 + item.variant) * 3

      if (item.type === 'platform-classic') {
        var hop = Math.abs(Math.sin(item.age * 4.6 + item.variant)) * 7
        var platformSize = Math.floor(item.age * 5) % 2 ? 36 : 34
        drawAtlasCell(item.spriteIndex, item.x, item.y - hop, platformSize)
        return
      }

      if (item.type === 'bee-squad') {
        var wing = Math.floor(item.age * 7) % 2 ? 2 : 0
        drawAtlasCell(item.spriteIndex, item.x - 11, item.y + bob + wing, 22)
        drawAtlasCell(item.spriteIndex, item.x + 11, item.y + bob - wing, 22)
        if (item.variant) drawAtlasCell(item.spriteIndex, item.x, item.y + 17 - bob, 18)
        return
      }

      if (item.type === 'star-fighter') {
        drawAtlasCell(item.spriteIndex, item.x + Math.sin(item.age * 3) * 8 * item.direction, item.y + bob, 36)
        return
      }

      if (item.type === 'pixel-meteor') {
        var drift = (item.age * 14 * item.direction) % 24
        drawAtlasCell(item.spriteIndex, item.x + drift - 12 * item.direction, item.y + bob, 32)
        return
      }

      var pickupSize = Math.floor(item.age * 4) % 2 ? 30 : 28
      drawAtlasCell(item.spriteIndex, item.x, item.y + bob, pickupSize)
    }

    function spawnEncounter() {
      var roll = Math.random()
      var firstEncounter = encounterCount === 0
      var type = firstEncounter ? 'platform-classic' : roll < 0.48 ? 'platform-classic'
        : roll < 0.78 ? 'energy-capsule'
          : roll < 0.88 ? 'bee-squad'
            : roll < 0.95 ? 'star-fighter'
              : 'pixel-meteor'
      var rail = Math.random() < 0.5 ? 'left' : 'right'
      var railX = rail === 'left' ? leftX : rightX
      var edgeRoom = rail === 'left' ? leftX : canvas.width / Math.min(window.devicePixelRatio || 1, 2) - rightX
      var spread = Math.max(0, Math.min(36, edgeRoom - 34))
      var spriteGroup = firstEncounter ? encounterSpriteGroups['platform-classic'].slice(0, 16) : encounterSpriteGroups[type]

      encounter = {
        type: type,
        rail: rail,
        x: railX + (Math.random() * 2 - 1) * spread,
        y: pathTop + 70 + Math.random() * Math.max(20, segmentLength - 140),
        age: 0,
        duration: 2.6 + Math.random() * 1.8,
        direction: Math.random() < 0.5 ? -1 : 1,
        variant: Math.random() < 0.5 ? 0 : 1,
        palette: encounterPalettes[Math.floor(Math.random() * encounterPalettes.length)],
        spriteIndex: spriteGroup[Math.floor(Math.random() * spriteGroup.length)]
      }
      encounterCount += 1
    }

    function previewEncounter(spriteIndex) {
      if (!Number.isFinite(spriteIndex) || spriteIndex < 0 || spriteIndex > 122) return

      var type = spriteIndex >= 80 ? 'platform-classic'
        : encounterSpriteGroups['bee-squad'].indexOf(spriteIndex) !== -1 ? 'bee-squad'
          : encounterSpriteGroups['star-fighter'].indexOf(spriteIndex) !== -1 ? 'star-fighter'
            : encounterSpriteGroups['pixel-meteor'].indexOf(spriteIndex) !== -1 ? 'pixel-meteor'
              : 'energy-capsule'
      var rail = encounter && encounter.rail === 'left' ? 'right' : 'left'

      encounter = {
        type: type,
        rail: rail,
        x: rail === 'left' ? leftX : rightX,
        y: pathTop + segmentLength * 0.5,
        age: 0,
        duration: 5,
        direction: rail === 'left' ? 1 : -1,
        variant: 0,
        palette: encounterPalettes[spriteIndex % encounterPalettes.length],
        spriteIndex: spriteIndex
      }
      encounterDelay = 2
      draw()
    }

    function updateEncounter(delta) {
      if (!encountersEnabled) return

      if (encounter) {
        encounter.age += delta
        if (encounter.age >= encounter.duration) {
          encounter = null
          encounterDelay = 2.8 + Math.random() * 4.6
        }
        return
      }

      encounterDelay -= delta
      if (encounterDelay <= 0) spawnEncounter()
    }

    function drawEncounter() {
      if (!encounter) return

      var fadeIn = Math.min(1, encounter.age * 4)
      var fadeOut = Math.min(1, (encounter.duration - encounter.age) * 3)
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.92

      if (encounterAtlasReady) drawAtlasEncounter(encounter)
      else if (encounter.type === 'platform-classic' || encounter.type === 'energy-capsule') drawEnergyCapsule(encounter)
      else if (encounter.type === 'bee-squad') drawBeeSquad(encounter)
      else if (encounter.type === 'star-fighter') drawStarFighter(encounter)
      else drawPixelMeteor(encounter)

      ctx.globalAlpha = 1
    }

    function draw() {
      var width = canvas.width / Math.min(window.devicePixelRatio || 1, 2)
      var height = canvas.height / Math.min(window.devicePixelRatio || 1, 2)
      ctx.clearRect(0, 0, width, height)
      if (!enabled) return

      var pac = pointAt(distance)
      var ghost = pointAt(distance - 104)
      var mouth = 0.18 + Math.abs(Math.sin(distance * 0.055)) * 0.32
      drawDots(pac)
      drawTunnel(leftX, pathTop)
      drawTunnel(leftX, pathBottom)
      drawTunnel(rightX, pathTop)
      drawTunnel(rightX, pathBottom)
      drawEncounter()
      drawGhost(ghost)
      drawPacman(pac, mouth)
    }

    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = 0
      lastTime = 0
    }

    function loop(now) {
      if (!lastTime) lastTime = now
      var delta = Math.min((now - lastTime) / 1000, 0.08)
      lastTime = now
      distance = (distance + speed * delta) % (segmentLength * 2)
      updateEncounter(delta)
      draw()
      frameId = window.requestAnimationFrame(loop)
    }

    function syncAnimation() {
      stop()
      if (!enabled || document.hidden || animationOff() || reducedMotion) {
        draw()
        return
      }
      frameId = window.requestAnimationFrame(loop)
    }

    window.addEventListener('resize', function() {
      resize()
      syncAnimation()
    })
    window.addEventListener('pixel-animation-toggle', syncAnimation)
    window.addEventListener('pixel-sprite-preview', function(event) {
      previewEncounter(Number(event.detail && event.detail.index))
    })
    document.addEventListener('visibilitychange', syncAnimation)
    resize()
    syncAnimation()
  }

  if (document.body && document.body.classList.contains('toybox-home')) {
    setupToyboxSidePacman()
    return
  }

  var H = 64
  var S = 3
  var MAX_DT = 0.08
  var PAC_SPEED = 18
  var GHOST_SPEED = 9
  var PEBBLE_SPEED = 6
  // 之前硬编码 false，导致页脚吃豆人永远忽略系统“减弱动态效果”偏好。
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  var inView = false
  var canvas = document.createElement('canvas')
  canvas.id = 'pacman-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'display:block;width:100%;height:' + H + 'px;pointer-events:none;image-rendering:pixelated;'

  // 挂载到 footer，支持 pjax 重载后重新挂载
  function mount() {
    if (document.body && document.body.classList.contains('toybox-home')) return
    if (document.getElementById('pacman-canvas')) return
    var footer = document.getElementById('footer') || document.querySelector('footer') || document.body
    footer.appendChild(canvas)
  }
  function tryMount() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount)
    } else {
      mount()
    }
  }
  tryMount()
  // Re-mount when another script replaces the current page content.
  document.addEventListener('pjax:complete', mount)
  document.addEventListener('pjax:success', mount)
  var ctx = canvas.getContext('2d')
  var GY = H - 10

  function resize() {
    var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    canvas.width = width
    canvas.height = H
  }
  resize()

  // colors
  var YELLOW  = '#facc15'
  var YDARK   = '#ca8a04'
  var DOTCOL  = '#f4d76b'
  var GCOLS   = [['#f87171','#fca5a5'],['#60a5fa','#93c5fd'],['#f9a8d4','#fbcfe8'],['#6ee7b7','#a7f3d0']]
  var GROUND  = '#b98b5f'
  var PEBCOL  = '#d8b67a'

  // dots
  var dots = []
  function initDots() {
    dots = []
    var sp = 14
    for (var x = sp; x < canvas.width / S; x += sp) dots.push({ x: x, eaten: false })
  }
  initDots()

  // ghosts
  var PAC_R   = 5
  var GHOST_W = 9
  var GHOST_H = 11
  var ghosts  = GCOLS.map(function(pal, i) { return { x: 80 + i * 36, pal: pal, dir: 1, wobble: i * 18 } })

  // pac
  var pac   = { x: 10, dir: 1 }
  var mouth = 0
  var elapsed = 0
  var lastTime = 0
  var frameId = 0
  var resizeFrameId = 0

  // pebbles
  var pebbles = []
  function initPebbles() {
    pebbles = []
    for (var i = 0; i < 14; i++) {
      pebbles.push({
        x: Math.random() * (canvas.width / S) | 0,
        y: GY / S + 1 + (Math.random() * 2 | 0),
        w: 1 + (Math.random() * 2 | 0)
      })
    }
  }
  initPebbles()

  function scheduleResize() {
    if (resizeFrameId) return
    resizeFrameId = requestAnimationFrame(function() {
      resizeFrameId = 0
      resize()
      initDots()
      initPebbles()
      // 仅当页脚在视口内且动效未手动关闭时才重绘，避免 resize 在屏幕外/关闭态留下一帧
      if (!isAnimationOff() && inView) draw()
    })
  }

  function isAnimationOff() {
    try {
      return window.localStorage.getItem('pixelAnim') === 'off'
    } catch (err) {
      return false
    }
  }
  // 缓存“动效已关闭”状态，避免 loop 每帧同步读 localStorage（事件驱动的调用仍直接读，始终最新）
  var animationOff = isAnimationOff()

  function drawGhost(gx, gy, pal, eyeDir) {
    var body = pal[0]
    ctx.fillStyle = body
    var rows = [
      [2, 5], [1, 7], [0, 9], [0, 9], [0, 9],
      [0, 9], [0, 9], [0, 9], [0, 9]
    ]
    for (var r = 0; r < rows.length; r++) {
      ctx.fillRect((gx + rows[r][0]) * S, (gy + r) * S, rows[r][1] * S, S)
    }
    ctx.fillRect((gx + 0) * S, (gy + 9) * S, 2 * S, 2 * S)
    ctx.fillRect((gx + 3) * S, (gy + 9) * S, 3 * S, 2 * S)
    ctx.fillRect((gx + 7) * S, (gy + 9) * S, 2 * S, 2 * S)
    ctx.fillStyle = '#fff'
    ctx.fillRect((gx + 2) * S, (gy + 2) * S, 2 * S, 3 * S)
    ctx.fillRect((gx + 5) * S, (gy + 2) * S, 2 * S, 3 * S)
    ctx.fillStyle = '#1e3a8a'
    var po = eyeDir === 1 ? 1 : 0
    ctx.fillRect((gx + 2 + po) * S, (gy + 3) * S, S, S)
    ctx.fillRect((gx + 5 + po) * S, (gy + 3) * S, S, S)
  }

  function drawPac(cx, cy, r, m, dir) {
    ctx.save()
    ctx.fillStyle = YELLOW
    ctx.beginPath()
    var sp = m * 0.15
    if (dir === 1) {
      ctx.moveTo(cx * S, cy * S)
      ctx.arc(cx * S, cy * S, r * S, sp, Math.PI * 2 - sp)
    } else {
      ctx.moveTo(cx * S, cy * S)
      ctx.arc(cx * S, cy * S, r * S, Math.PI + sp, Math.PI - sp, true)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = YDARK
    var ex = dir === 1 ? cx - 1 : cx + 1
    ctx.fillRect(ex * S, (cy - r + 1) * S, S, S)
    ctx.restore()
  }

  function tick(dt) {
    elapsed += dt
    var mouthFrame = Math.floor(elapsed * 8) % 12
    mouth = mouthFrame < 6 ? mouthFrame : 11 - mouthFrame

    pac.x += pac.dir * PAC_SPEED * dt
    var W = canvas.width / S
    if (pac.x >= W - PAC_R - 2) pac.dir = -1
    if (pac.x <= PAC_R + 2)     pac.dir =  1

    for (var i = 0; i < dots.length; i++) {
      if (!dots[i].eaten && Math.abs(dots[i].x - pac.x) < PAC_R) dots[i].eaten = true
    }
    if (dots.every(function(d) { return d.eaten })) initDots()

    for (var j = 0; j < ghosts.length; j++) {
      var g = ghosts[j]
      var diff = pac.x - GHOST_W / 2 - g.x
      var ghostStep = GHOST_SPEED * dt
      if (Math.abs(diff) > ghostStep) {
        g.x += diff > 0 ? ghostStep : -ghostStep
        g.dir = diff > 0 ? 1 : 0
      }
    }

    for (var k = 0; k < pebbles.length; k++) {
      pebbles[k].x -= PEBBLE_SPEED * dt
      if (pebbles[k].x < -4) pebbles[k].x = (canvas.width / S) + (Math.random() * 40 | 0)
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, H)

    ctx.fillStyle = GROUND
    ctx.fillRect(0, GY, canvas.width, 2)

    ctx.fillStyle = PEBCOL
    for (var k = 0; k < pebbles.length; k++) {
      ctx.fillRect(pebbles[k].x * S, pebbles[k].y * S, pebbles[k].w * S, S)
    }

    var DY = GY / S - PAC_R - 1
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].eaten) continue
      var big = i % 5 === 0
      if (big && Math.floor(elapsed * 2) % 2 === 0) continue
      var r = big ? 2 : 1
      ctx.fillStyle = DOTCOL
      ctx.fillRect((dots[i].x - r / 2) * S, (DY + PAC_R - r) * S, r * S, r * S)
    }

    var ghostY = GY / S - GHOST_H - 1
    for (var j = 0; j < ghosts.length; j++) {
      var g = ghosts[j]
      var wy = Math.sin(elapsed * 4 + g.wobble) * 1.5 | 0
      drawGhost(g.x | 0, ghostY + wy, g.pal, g.dir)
    }

    drawPac(pac.x | 0, GY / S - PAC_R - 1, PAC_R, mouth, pac.dir)
  }

  function loop(now) {
    if (!lastTime) lastTime = now
    var dt = Math.min((now - lastTime) / 1000, MAX_DT)
    lastTime = now

    if (!animationOff) {
      tick(dt)
      draw()
    } else {
      stop()
      return
    }
    frameId = requestAnimationFrame(loop)
  }

  function start() {
    if (frameId || document.hidden || isAnimationOff()) return
    lastTime = 0
    frameId = requestAnimationFrame(loop)
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId)
    frameId = 0
    lastTime = 0
    ctx.clearRect(0, 0, canvas.width, H)
  }

  function explicitlyOn() {
    try {
      return window.localStorage.getItem('pixelAnim') === 'on'
    } catch (err) {
      return false
    }
  }

  // 是否应当循环动画：手动关闭 → 否；系统减弱动态且未手动开启 → 否（只画静态帧）；否则 → 是
  function shouldAnimate() {
    if (isAnimationOff()) return false
    if (reduceMotion && !explicitlyOn()) return false
    return true
  }

  // 仅当页脚进入视口、标签页可见、且应当动画时才启动循环
  function maybeStart() {
    if (!shouldAnimate() || document.hidden || !inView) return
    start()
  }

  // 进入视口时按状态决定动/静/空；离开视口立即停，避免读正文时页脚在屏幕外空跑 RAF
  function applyViewportState() {
    if (!inView) { stop(); return }
    if (shouldAnimate()) maybeStart()
    else if (!isAnimationOff()) draw()  // 减弱动态：画一帧静态画面
    else stop()                          // 已关闭：留空
  }

  function handleVisibilityChange() {
    if (document.hidden) stop()
    else applyViewportState()
  }

  function setupObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      // 老浏览器降级：退回“可见即按状态运行”的旧行为
      inView = true
      applyViewportState()
      return
    }
    var io = new IntersectionObserver(function(entries) {
      inView = entries[entries.length - 1].isIntersecting
      applyViewportState()
    }, { threshold: 0 })
    io.observe(canvas)
  }

  window.addEventListener('resize', scheduleResize)
  window.addEventListener('pixel-animation-toggle', function(e) {
    animationOff = !(e.detail && e.detail.enabled)
    if (e.detail && e.detail.enabled) maybeStart()
    else stop()
  })
  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver)
  } else {
    setupObserver()
  }
})()
