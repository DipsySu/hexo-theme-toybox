'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const pug = require('pug')
const { file, read } = require('./helpers')
const mixin = 'layout/includes/mixins/post-ui.pug'
const render = pug.compile(read(mixin) + '\n+postUI(page.posts.data)\n', { filename: file(mixin) })

// The home shelf (or another post list) for the given posts.
function shelf(posts, { home = true, covers = true, excerpt = { method: false }, url_for = value => value } = {}) {
  return render({
    page: { posts: { data: posts.map(post => Object.assign({ categories: { data: [] }, tags: { data: [] } }, post)) } },
    theme: { cover: { index_enable: covers, position: 'left' }, error_img: { post_page: '/fallback.png' }, post_meta: { page: {} }, index_post_content: excerpt },
    toybox_cover: article => article.cover,
    strip_html: html => html.replace(/<[^>]+>/g, ''),
    is_home: () => home,
    url_for,
    _p: key => key
  })
}

const cartridges = options => shelf([
  { title: 'A < B & C', path: 'first/', cover: '/cover.png', cover_type: 'img' },
  { title: 'Second', path: 'second/', cover: false }
], Object.assign({ url_for: value => '/project/' + value.replace(/^\//, '') }, options))
const numbered = (count, options) => shelf(Array.from({ length: count }, (_, index) => ({ title: 'Post ' + index, path: `p${index}/`, cover: `/c${index}.png`, cover_type: 'img', content: '<p>x</p>' })), options)

test('cartridge decoration is present in SSR and does not replace article links', () => {
  const html = cartridges()
  assert.equal((html.match(/class="toybox-selection-frame" aria-hidden="true"/g) || []).length, 2)
  assert.match(html, /data-toybox-slot="0" data-toybox-number="1"/)
  assert.match(html, /data-toybox-slot="1" data-toybox-number="2"/)
  assert.match(html, /class="toybox-open-button" href="\/project\/first\/" aria-label="A &lt; B &amp; C"/)
  assert.match(html, /data-toybox-i18n="home.read"/)
  assert.match(html, /aria-hidden="true">A<\/span>/)
  assert.equal((html.match(/class="toybox-card-foil" aria-hidden="true"/g) || []).length, 1)
  assert.equal((html.match(/class="toybox-card-glare" aria-hidden="true"/g) || []).length, 2)
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
  assert.doesNotMatch(html, /toybox-selection-frame|toybox-open-button|toybox-card-foil|toybox-card-glare/)
  assert.match(html, /class="article-title"/)
})

test('the visible home stage loads its covers with the page and only the first is high priority', () => {
  const covers = numbered(6).match(/<img class="post-bg"[^>]*>/g)
  assert.equal(covers.length, 6)
  assert.match(covers[0], /loading="eager" fetchpriority="high"/)
  assert.doesNotMatch(covers[0], /decoding=/)
  covers.slice(1, 5).forEach(cover => assert.match(cover, /loading="eager" decoding="async"/))
  covers.slice(1).forEach(cover => assert.doesNotMatch(cover, /fetchpriority/))
  assert.match(covers[5], /loading="lazy" decoding="async"/)
  numbered(2, { home: false }).match(/<img class="post-bg"[^>]*>/g).forEach(cover => {
    assert.match(cover, /loading="lazy" decoding="async"/)
    assert.doesNotMatch(cover, /fetchpriority/)
  })
})

test('excerpts never end inside an HTML entity', () => {
  const excerptOf = (content, length) => shelf([{ title: 'T', path: 't/', cover: false, content }], { home: false, excerpt: { method: 3, length } })
    .match(/<div class="content">([^<]*)<\/div>/)[1]
  assert.equal(excerptOf('ab &#123; cd', 5), 'ab &#123; ...')
  assert.equal(excerptOf('ab &quot;c&quot;', 3), 'ab  ...')
  assert.equal(excerptOf('ab &amp;', 4), 'ab &amp;')
  assert.equal(excerptOf('plain text here', 5), 'plain ...')
})
