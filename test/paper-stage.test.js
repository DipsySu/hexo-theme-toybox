'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const { file, read } = require('./helpers')
const css = read('source/css/paper-stage.css')

test('paper skin is server-selected and cartridge remains an unmodified fallback', () => {
  const layout = read('layout/includes/layout.pug')
  assert.match(layout, /theme\.toybox && theme\.toybox\.appearance === 'paper'/)
  assert.match(layout, /toyboxPaper \? ' toybox-paper' : ''/)
  assert.match(read('_config.yml'), /appearance: paper/)
})

test('paper backdrop is a bundled viewport background, not a scrolling content layer', () => {
  assert.match(css, /\.toybox-paper \.toybox-card-row\s*{[^}]*url\('\.\.\/img\/paper-stage\/meadow\.jpg'\)/s)
  assert.match(css, /background-attachment: scroll/)
  assert.ok(fs.statSync(file('source/img/paper-stage/meadow.jpg')).size < 600000)
  assert.doesNotMatch(read('layout/index.pug'), /toybox-paper-scenery/)
})

test('paper skin preserves themes, motion preferences and touch target sizes', () => {
  assert.match(css, /\[data-theme='dark'\] body\.toybox-paper/)
  assert.match(css, /background-blend-mode: multiply/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\.toybox-card-arrow {[^}]*width: 44px; min-height: 44px;/)
  assert.match(css, /@media \(max-width: 680px\)/)
  assert.match(css, /flex-basis: min\(280px, calc\(100vw - 76px\)\)/)
  assert.match(css, /data-toybox-page-direction='previous'.*animation-name: paper-scene-return/)
})
