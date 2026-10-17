'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const css = fs.readFileSync(path.join(root, 'source/css/pixel-icons.css'), 'utf8')
const iconDir = path.join(root, 'source/img/pixel-icons')

// Same transform that produced the --pi-* variables: compact markup, drop the root
// size/fill attributes (masks only read alpha) and percent-encode the unsafe characters.
function toDataUri (svg) {
  const compact = svg
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
    .replace(/^<svg\b[^>]*>/, tag => tag.replace(/\s(?:width|height|fill)="[^"]*"/g, ''))
    .replace(/"/g, "'")
  return 'data:image/svg+xml,' + compact.replace(/[%#<>]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase())
}

function collect (directory, pattern) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return collect(absolute, pattern)
    return pattern.test(entry.name) ? [fs.readFileSync(absolute, 'utf8')] : []
  })
}

const baseBlock = css.slice(css.indexOf('/* 所有图标共用的基础样式 */'), css.indexOf('content: "" !important;'))
const baseClasses = new Set([...baseBlock.matchAll(/\.(fa-[a-z-]+)::before/g)].map(match => match[1]))
const maskedClasses = new Map(css.split('\n')
  .filter(line => /mask-image: var\(--pi-/.test(line))
  .flatMap(line => [...line.matchAll(/\.(fa-[a-z-]+)::before/g)].map(match => [match[1], line.match(/var\(--pi-([\w-]+)\)/)[1]])))

test('inlines each pixel icon mask once and keeps it in sync with its SVG source', () => {
  const variables = [...css.matchAll(/--pi-([\w-]+): url\("([^"]+)"\);/g)]
  const names = variables.map(match => match[1])

  assert.ok(names.length >= 30)
  assert.equal(new Set(names).size, names.length)
  variables.forEach(([, name, uri]) => {
    const svg = fs.readFileSync(path.join(iconDir, name + '.svg'), 'utf8')
    assert.equal(uri, toDataUri(svg), `--pi-${name} is stale: regenerate it from img/pixel-icons/${name}.svg`)
  })
  names.forEach(name => assert.ok([...maskedClasses.values()].includes(name), `--pi-${name} is never used`))
  assert.doesNotMatch(css, /url\(\.\.\/img\//)
  assert.ok(fs.existsSync(path.join(iconDir, 'LICENSE')))
})

test('draws every Font Awesome class the theme renders with a pixel mask', () => {
  const sources = [
    ...collect(path.join(root, 'layout'), /\.pug$/),
    ...collect(path.join(root, 'scripts'), /\.js$/),
    ...collect(path.join(root, 'source/js'), /\.js$/),
    fs.readFileSync(path.join(root, '_config.yml'), 'utf8')
  ]
  const utilities = new Set(['fa-fw', 'fa-spin', 'fa-pulse', 'fa-solid', 'fa-regular', 'fa-brands'])
  const used = new Set(sources.flatMap(source => source.match(/\bfa-[a-z][a-z-]*[a-z]\b/g) || []).filter(name => !utilities.has(name)))

  assert.ok(used.has('fa-arrow-right') && used.has('fa-copy') && used.has('fa-thumbs-up'))
  used.forEach(name => {
    assert.ok(maskedClasses.has(name), `${name} has no pixel mask`)
    assert.ok(baseClasses.has(name), `${name} is missing from the shared icon box rule`)
  })
  // A base-listed class without a mask would paint a solid currentColor square.
  baseClasses.forEach(name => assert.ok(maskedClasses.has(name), `${name} is boxed but has no mask`))
})

test('replaces the Font Awesome box model without loading Font Awesome', () => {
  const head = fs.readFileSync(path.join(root, 'layout/includes/head.pug'), 'utf8')

  assert.doesNotMatch(head, /fontawesome/)
  assert.match(css, /\.fas, \.far, \.fab, \.fa-solid, \.fa-regular, \.fa-brands \{ display: inline-block;[^}]*line-height: 1;/)
  assert.match(css, /\.fa-fw \{ width: 1\.25em; text-align: center; \}/)
  assert.match(css, /\.fa-spin \{ animation: toybox-fa-spin 2s linear infinite; \}/)
  assert.match(css, /\.fa-pulse \{ animation: toybox-fa-spin 1s steps\(8\) infinite; \}/)
  // The theme shortens every animation under reduced motion; a looping spinner would strobe.
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.fa-spin, \.fa-pulse \{ animation: none; \} \}/)
})
