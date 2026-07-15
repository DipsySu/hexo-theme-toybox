'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = '/hexo-theme-toybox/'
const publicDirectory = path.resolve(__dirname, '..', 'demo', 'public')

function collectFiles(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectFiles(absolute, extension)
    return absolute.endsWith(extension) ? [absolute] : []
  })
}

function localTarget(reference) {
  const clean = decodeURIComponent(reference.split(/[?#]/)[0])
  if (!clean.startsWith(projectRoot)) return null
  const relative = clean.slice(projectRoot.length)
  if (!relative || relative.endsWith('/')) return path.join(publicDirectory, relative, 'index.html')
  return path.join(publicDirectory, relative)
}

const htmlFiles = collectFiles(publicDirectory, '.html')
const cssFiles = collectFiles(publicDirectory, '.css')
const missing = []
const rootless = []

htmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8')

  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1]
    if (/^(?:data:|https?:|javascript:|mailto:|#)/.test(reference)) continue
    if (/^\/(?:css|js|img|fonts|cursors)\//.test(reference)) rootless.push(reference)

    const target = localTarget(reference)
    if (target && !fs.existsSync(target)) missing.push(reference)
  }
})

cssFiles.forEach(file => {
  const css = fs.readFileSync(file, 'utf8')
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    const reference = match[1]
    if (/^(?:data:|https?:|#)/.test(reference)) continue
    const target = path.resolve(path.dirname(file), reference.split('?')[0])
    if (!fs.existsSync(target)) missing.push(path.relative(publicDirectory, target))
  }
})

const home = fs.readFileSync(path.join(publicDirectory, 'index.html'), 'utf8')
const homeCards = (home.match(/class="recent-post-item/g) || []).length

assert.equal(htmlFiles.length > 10, true, 'expected a complete multi-page demo')
assert.equal(homeCards, 5, 'home page should render five post cartridges')
assert.equal(fs.existsSync(path.join(publicDirectory, 'page/2/index.html')), true, 'pagination page missing')
assert.equal(fs.existsSync(path.join(publicDirectory, 'search.xml')), true, 'local search index missing')
assert.deepEqual([...new Set(rootless)], [], 'root-relative assets bypass the Pages project root')
assert.deepEqual([...new Set(missing)], [], 'generated demo contains missing local assets')

console.log(`Verified ${htmlFiles.length} HTML pages, ${cssFiles.length} stylesheets, and ${homeCards} home cartridges.`)
