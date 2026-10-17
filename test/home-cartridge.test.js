'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const pug = require('pug')
const root = path.join(__dirname, '..')
const mixinPath = path.join(root, 'layout/includes/mixins/post-ui.pug')
const render = pug.compile(fs.readFileSync(mixinPath, 'utf8') + '\n+postUI(page.posts.data)\n', { filename: mixinPath })

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

function shelf(count, { home = true, excerpt = { method: false } } = {}) {
  const data = Array.from({ length: count }, (_, index) => ({ title: 'Post ' + index, path: `p${index}/`, cover: `/c${index}.png`, cover_type: 'img', content: '<p>x</p>', categories: { data: [] }, tags: { data: [] } }))
  return render({
    page: { posts: { data } },
    theme: { cover: { index_enable: true, position: 'left' }, error_img: { post_page: '/fallback.png' }, post_meta: { page: {} }, index_post_content: excerpt },
    toybox_cover: article => article.cover,
    strip_html: html => html.replace(/<[^>]+>/g, ''),
    is_home: () => home,
    url_for: value => value,
    _p: key => key
  })
}

test('the visible home stage loads its covers with the page and only the first is high priority', () => {
  const covers = shelf(6).match(/<img class="post-bg"[^>]*>/g)
  assert.equal(covers.length, 6)
  assert.match(covers[0], /loading="eager" fetchpriority="high"/)
  assert.doesNotMatch(covers[0], /decoding=/)
  covers.slice(1, 5).forEach(cover => assert.match(cover, /loading="eager" decoding="async"/))
  covers.slice(1).forEach(cover => assert.doesNotMatch(cover, /fetchpriority/))
  assert.match(covers[5], /loading="lazy" decoding="async"/)
  shelf(2, { home: false }).match(/<img class="post-bg"[^>]*>/g).forEach(cover => {
    assert.match(cover, /loading="lazy" decoding="async"/)
    assert.doesNotMatch(cover, /fetchpriority/)
  })
})

test('excerpts never end inside an HTML entity', () => {
  const excerptOf = (content, length) => {
    const html = render({
      page: { posts: { data: [{ title: 'T', path: 't/', cover: false, content, categories: { data: [] }, tags: { data: [] } }] } },
      theme: { cover: { index_enable: true, position: 'left' }, error_img: {}, post_meta: { page: {} }, index_post_content: { method: 3, length } },
      toybox_cover: () => false,
      strip_html: value => value,
      is_home: () => false,
      url_for: value => value,
      _p: key => key
    })
    return html.match(/<div class="content">([^<]*)<\/div>/)[1]
  }
  assert.equal(excerptOf('ab &#123; cd', 5), 'ab &#123; ...')
  assert.equal(excerptOf('ab &quot;c&quot;', 3), 'ab  ...')
  assert.equal(excerptOf('ab &amp;', 4), 'ab &amp;')
  assert.equal(excerptOf('plain text here', 5), 'plain ...')
})
