(function() {
  'use strict'

  if (window.toyboxTiltReady || !window.matchMedia) return
  window.toyboxTiltReady = true

  var pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  var active = null
  var bounds = null
  var point = null
  var frame = 0
  var animationEnabled = true
  var properties = ['--tilt-x', '--tilt-y', '--foil-x', '--foil-y']
  try { animationEnabled = window.localStorage.getItem('pixelAnim') !== 'off' } catch (error) {}

  function allowed() {
    var body = document.body
    return pointer.matches && !motion.matches && animationEnabled && !document.hidden && body &&
      body.classList.contains('toybox-home') && !body.classList.contains('toybox-paper') &&
      !body.classList.contains('toybox-page-leaving') && !body.classList.contains('toybox-page-entering')
  }

  function reset(immediate) {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    if (active) {
      active.classList.remove('is-tilting')
      if (immediate === true) active.classList.remove('toybox-tilt-ready')
      properties.forEach(function(name) { active.style.removeProperty(name) })
    }
    active = null
    bounds = null
    point = null
  }

  function cardFor(target) {
    return target && target.closest && target.closest('.toybox-card-track > .recent-post-item')
  }

  function render() {
    frame = 0
    if (!active || !active.isConnected || !allowed()) { reset(true); return }
    var x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width))
    var y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height))
    active.style.setProperty('--tilt-x', ((0.5 - y) * 14).toFixed(2) + 'deg')
    active.style.setProperty('--tilt-y', ((x - 0.5) * 18).toFixed(2) + 'deg')
    active.style.setProperty('--foil-x', (x * 100).toFixed(2) + '%')
    active.style.setProperty('--foil-y', (y * 100).toFixed(2) + '%')
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || !allowed()) { reset(true); return }
    var card = cardFor(event.target)
    if (!card) { reset(); return }
    if (card !== active) {
      reset()
      // Sample the untransformed layout, not the tilted card's changing hit box.
      var parent = card.offsetParent
      if (!parent) return
      var parentBounds = parent.getBoundingClientRect()
      bounds = { left: parentBounds.left + card.offsetLeft, top: parentBounds.top + card.offsetTop,
        width: card.offsetWidth, height: card.offsetHeight }
      if (!bounds.width || !bounds.height) { bounds = null; return }
      active = card
      active.classList.add('toybox-tilt-ready', 'is-tilting')
    }
    point = { x: event.clientX, y: event.clientY }
    if (!frame) frame = window.requestAnimationFrame(render)
  }

  function leave(event) {
    if (active && !active.contains(event.relatedTarget)) reset()
  }

  function syncMotion() { reset(true) }

  // Delegation also covers cartridges inserted by the existing AJAX paginator.
  document.addEventListener('pointerover', move, { passive: true })
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerout', leave, { passive: true })
  document.addEventListener('pointercancel', syncMotion, { passive: true })
  document.addEventListener('pointerdown', function(event) {
    if (event.pointerType !== 'mouse' || !active || !active.contains(event.target)) reset()
  }, { passive: true })
  document.addEventListener('keydown', function() { reset() })
  document.addEventListener('scroll', syncMotion, { passive: true, capture: true })
  document.addEventListener('visibilitychange', syncMotion)
  document.addEventListener('toybox:page-arrived', syncMotion)
  window.addEventListener('blur', syncMotion)
  window.addEventListener('resize', syncMotion)
  window.addEventListener('pixel-animation-toggle', function(event) {
    animationEnabled = !event.detail || event.detail.enabled !== false
    syncMotion()
  })
  window.addEventListener('storage', function(event) {
    if (event.key === 'pixelAnim' || event.key === null) {
      animationEnabled = event.newValue !== 'off'
      syncMotion()
    }
  })
  pointer.addEventListener('change', syncMotion)
  motion.addEventListener('change', syncMotion)
})()
