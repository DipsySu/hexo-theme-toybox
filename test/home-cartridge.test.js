'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const pug = require('pug')
const root = path.join(__dirname, '..')
const mixinPath = path.join(root, 'layout/includes/mixins/post-ui.pug')
const render = pug.compile(fs.readFileSync(mixinPath, 'utf8') + '\n+postUI\n', { filename: mixinPath })

function cartridges({ home = true, covers = true } = {}) {
  return render({
    page: { posts: { data: [
      { title: 'A < B & C', path: 'first/', cover: '/cover.png', cover_type: 'img', categories: { data: [] }, tags: { data: [] } },
      { title: 'Second', path: 'second/', cover: false, categories: { data: [] }, tags: { data: [] } }
    ] } },
    theme: { cover: { index_enable: covers, position: 'left' }, error_img: { post_page: '/fallback.png' }, post_meta: { page: {} }, index_post_content: { method: false } },
    toybox_cover: article => article.cover,
    is_home: () => home,
    url_for: value => '/project/' + value.replace(/^\//, ''),
    _p: key => key
  })
}

test('cartridge decoration is present in SSR and does not replace article links', () => {
  const html = cartridges()
  assert.equal((html.match(/class="toybox-selection-frame" aria-hidden="true"/g) || []).length, 2)
  assert.match(html, /data-toybox-slot="0" data-toybox-number="1"/)
  assert.match(html, /data-toybox-slot="1" data-toybox-number="2"/)
  assert.match(html, /class="toybox-open-button" href="\/project\/first\/" aria-label="A &lt; B &amp; C"/)
  assert.match(html, /data-toybox-i18n="home.read"/)
  assert.match(html, /aria-hidden="true">A<\/span>/)
})

test('cartridges retain usable text and links when all covers are disabled', () => {
  const html = cartridges({ covers: false })
  assert.doesNotMatch(html, /class="post_cover/)
  assert.equal((html.match(/recent-post-info no-cover/g) || []).length, 2)
  assert.match(html, /href="\/project\/first\/"/)
  assert.match(html, /href="\/project\/second\/"/)
  assert.equal((html.match(/toybox-open-button/g) || []).length, 2)
})

test('home selection decorations do not leak into other post lists', () => {
  const html = cartridges({ home: false })
  assert.doesNotMatch(html, /toybox-selection-frame|toybox-open-button/)
  assert.match(html, /class="article-title"/)
})
