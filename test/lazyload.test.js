'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { loadHexo } = require('./helpers')

const createFilter = (field = 'site') => loadHexo('scripts/filters/post_lazyload.js', { theme: { config: { lazyload: { enable: true, field } } } }).filters

test('lazy loading never crosses an image without src into the next script or image', () => {
  const filter = createFilter()['after_render:html']
  const empty = '<img class="toybox-resume-cover" hidden alt="">'
  const script = '<script src="/js/utils.js"></script>'
  const result = filter(empty + script + '<img src="/cover.png">')
  assert.ok(result.startsWith(empty + script))
  assert.match(result, /data-lazy-src="\/cover.png"/)
  assert.equal((result.match(/data-lazy-src=/g) || []).length, 1)
})

test('image attributes containing src text and angle brackets are preserved', () => {
  const filter = createFilter()['after_render:html']
  const result = filter('<img alt="a > b src=x"\n src="/image.jpg"><img data-src="/deferred.jpg">')
  assert.match(result, /alt="a > b src=x"/)
  assert.match(result, /data-lazy-src="\/image.jpg"/)
  assert.ok(result.endsWith('<img data-src="/deferred.jpg">'))
})

test('post-only lazy loading leaves the site filter unchanged', () => {
  const filters = createFilter('post')
  const source = '<p><img src="/article.png"></p>'
  assert.equal(filters['after_render:html'](source), undefined)
  assert.match(filters.after_post_render({ content: source }).content, /data-lazy-src="\/article.png"/)
})

test('images that choose native loading or opt out keep their real src', () => {
  const filter = createFilter()['after_render:html']
  const native = '<img src="/ledger.jpg" alt="" loading="lazy" decoding="async">'
  const eager = '<img class="post-bg" src="/cover.jpg" loading=\'eager\' fetchpriority="high">'
  const optOut = '<img class="site-icon" src="/logo.png" data-no-lazy="data-no-lazy"/><img src="/avatar.png" data-no-lazy>'
  assert.equal(filter(native + eager + optOut), native + eager + optOut)
})

test('opt-out markers inside quoted values or longer attribute names do not count', () => {
  const filter = createFilter()['after_render:html']
  const result = filter('<img alt="loading=lazy data-no-lazy" src="/a.jpg"><img data-loading="x" data-no-lazy-later src="/b.jpg">')
  assert.match(result, /data-lazy-src="\/a.jpg"/)
  assert.match(result, /data-lazy-src="\/b.jpg"/)
})
