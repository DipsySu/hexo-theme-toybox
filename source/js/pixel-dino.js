;(function () {
  'use strict'

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

  // 挂载到 footer
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
