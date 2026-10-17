'use strict'

// Shared by the cover filter and helpers in scripts/. Hexo only executes
// files under scripts/, so this module is loaded with require() alone.

const IMAGE = /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i

// 32-bit FNV-1a: a stable, dependency-free hash for picking artwork.
function fnv1a (value) {
  const text = String(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// cover.default_cover (a string or a list) wins over the bundled
// toybox.home.fallback_covers. List entries may be strings or
// { src, primary, fallback } objects; the first usable URL is kept.
function fallbackCovers (theme) {
  const configured = theme && theme.cover && theme.cover.default_cover
  const home = theme && theme.toybox && theme.toybox.home && theme.toybox.home.fallback_covers
  const covers = typeof configured === 'string' && configured
    ? [configured]
    : Array.isArray(configured) && configured.length ? configured : Array.isArray(home) ? home : []
  return covers
    .map(cover => typeof cover === 'string' ? cover : cover && (cover.src || cover.primary || cover.fallback))
    .filter(Boolean)
}

function pickCover (covers, identity) {
  return covers.length ? covers[fnv1a(identity) % covers.length] : ''
}

module.exports = { IMAGE, fnv1a, fallbackCovers, pickCover }
