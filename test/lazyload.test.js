'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')

function createFilter(field = 'site') {
  const filters = {}
  const hexo = {
    theme: { config: { lazyload: { enable: true, field } } },
    extend: { filter: { register: (name, callback) => { filters[name] = callback } } }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/filters/post_lazyload.js'), 'utf8'), {
    hexo, require: () => ({ url_for: value => value })
  })
  return filters
}

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
