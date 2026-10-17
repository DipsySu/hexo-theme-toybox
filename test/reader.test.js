'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { compile, evaluate, read, section } = require('./helpers')
const renderReader = compile('layout/includes/post/reader.pug')
const main = read('source/js/main.js')

function reader(showToc, readmode = true) {
  return renderReader({ showToc, theme: { readmode, toc: { number: true, expand: false } }, page: { content: '<h2 id="section">Section</h2><p>Body</p>' }, is_post: () => true, _p: key => key, toc: () => '<ol><li><a class="toc-link" href="#section">Section</a></li></ol>' })
}

test('article, contents and progress are present before JavaScript runs', () => {
  const html = reader(true)
  assert.equal((html.match(/id="article-container"/g) || []).length, 1)
  assert.equal((html.match(/id="card-toc"/g) || []).length, 1)
  assert.match(html, /class="pixel-manual-body"/)
  assert.match(html, /aria-controls="card-toc" aria-expanded="false"/)
  assert.match(html, /role="progressbar"[^>]+aria-valuenow="0"/)
  assert.match(html, /data-reader-action="focus" hidden/)
  assert.doesNotMatch(html, /pixel-article-status-chip/)
})

test('articles without contents or reading mode omit unavailable controls', () => {
  const html = reader(false, false)
  assert.match(html, /pixel-manual-body is-single-page/)
  assert.doesNotMatch(html, /id="card-toc"|data-reader-action/)
  assert.match(html, /<p>Body<\/p>/)
})

test('post navigation is distinct from library pagination and honors the project root', () => {
  const html = compile('layout/includes/pagination.pug')({ is_post: () => true, theme: { post_pagination: 1 }, page: { prev: { title: 'Previous', path: 'prev/' }, next: { title: 'Next', path: 'next/' } }, url_for: value => '/project/' + value })
  assert.match(html, /data-toybox-i18n="post.previous"/)
  assert.match(html, /data-toybox-i18n="post.next"/)
  assert.match(html, /href="\/project\/next\/"/)
  assert.doesNotMatch(html, /common.nextPage|common.previousPage/)
})

test('reading progress is bounded, completes only at the end and skips unchanged meter writes', () => {
  let top = 600
  let writes = 0
  let value
  let cleared = 0
  const saves = []
  const target = {
    article: { isConnected: true, scrollHeight: 2000, getBoundingClientRect: () => ({ top }) },
    meter: { isConnected: true, style: { setProperty: () => { writes++ } }, setAttribute: (_, next) => { writes++; value = next }, dataset: {} },
    value: { set textContent(_) { writes++ } },
    path: '/post/'
  }
  const ToyboxSave = { update: detail => saves.push([detail.path, detail.progress, detail.article === target.article]) }
  const context = { readingProgressTarget: target, window: { innerHeight: 1000, ToyboxSave }, markClearedPath: () => { cleared++; return true }, applyClearedState() {} }
  const update = evaluate(section('source/js/pixel-anim-toggle.js', '  function updateReadingProgress()', '  function scheduleReadingProgress()'), context, 'updateReadingProgress')
  update()
  update()
  assert.equal(value, '0')
  assert.equal(writes, 3)
  top = -445
  update()
  update()
  assert.equal(value, '50')
  assert.equal(writes, 6)
  assert.equal(cleared, 0)
  top = -3000
  update()
  assert.equal(value, '100')
  assert.equal(cleared, 1)
  assert.deepEqual(saves.map(save => save[1]), [0, 0, 50, 50, 100])
  assert.ok(saves.every(([path, , article]) => path === '/post/' && article))
})

test('reading mode preserves the visible paragraph and does not create duplicate exits', () => {
  let reading = false
  let count = 0
  let exit
  const scrolls = []
  const anchor = { getBoundingClientRect: () => ({ top: reading ? 200 : 560, bottom: reading ? 300 : 660 }) }
  const body = { classList: { contains: () => reading, add: () => { reading = true }, remove: () => { reading = false } }, appendChild: () => { count++ } }
  const button = { dataset: {}, setAttribute() {}, focus() {}, addEventListener: (_, handler) => { exit = handler }, removeEventListener() {}, remove: () => { count-- } }
  const context = { document: { body, getElementById: () => ({ querySelectorAll: () => [anchor] }), createElement: () => button }, window: { innerHeight: 900, scrollBy: (_, offset) => scrolls.push(offset) } }
  const { switchReadMode } = evaluate('', context, '({' + section('source/js/main.js', '    switchReadMode:', '    scrollToTop:') + '})')
  switchReadMode()
  switchReadMode()
  assert.equal(count, 1)
  assert.equal(reading, true)
  exit()
  assert.equal(reading, false)
  assert.equal(count, 0)
  assert.deepEqual(scrolls, [-360, 360])
})

test('highlight tools recognize the configured Highlight.js identifier and expose keyboard buttons', () => {
  const config = read('layout/includes/head/config.pug')
  assert.match(config, /'highlightjs'/)
  assert.match(main, /plugin === 'highlightjs' \? document.querySelectorAll\('figure.highlight'\)/)
  assert.match(main, /<button type="button" class="fas fa-copy copy-button"/)
  assert.doesNotMatch(main, /highlighjs/)
})

test('contents follow the visible heading and clear the active state at the top', () => {
  const active = new Set()
  const links = ['first', 'second'].map(id => ({ getAttribute: () => '#' + id, classList: { add: () => active.add(id), remove: () => active.delete(id) } }))
  const context = {
    list: [{ id: 'first', top: 500 }, { id: 'second', top: 1200 }], detectItem: '', isToc: true, isExpand: true, isAnchor: false,
    $tocLink: links, $cardToc: { querySelectorAll: () => links }, btf: { getEleTop: node => node.top },
    window: { getComputedStyle: () => ({ scrollMarginTop: '180px' }) }, setTimeout: fn => fn(), autoScrollToc() {}
  }
  const find = evaluate(section('source/js/main.js', '    const findHeadPosition = function (top)', '    // main of scroll'), context, 'findHeadPosition')
  find(330)
  assert.deepEqual([...active], ['first'])
  find(1030)
  assert.deepEqual([...active], ['second'])
  find(0)
  assert.equal(active.size, 0)
})
