'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function fixture(root = '/') {
  let helper
  let regenerate
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/helpers/asset-url.js'), 'utf8'), {
    require, URL,
    hexo: { extend: {
      filter: { register: (name, callback) => { assert.equal(name, 'before_generate'); regenerate = callback } },
      helper: { register: (name, callback) => { assert.equal(name, 'toybox_asset'); helper = callback } }
    } }
  })
  const context = { url_for: value => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value) ? value : root + value.replace(/^\//, '') }
  return { url: value => helper.call(context, value), regenerate: () => regenerate() }
}

test('all local styles and scripts share a revision that changes for each build', () => {
  const assets = fixture()
  const css = assets.url('/css/index.css')
  const js = assets.url('/js/main.js')
  assert.match(css, /^\/css\/index\.css\?v=[a-f0-9]{16}$/)
  assert.equal(css.split('?')[1], js.split('?')[1])
  assert.equal(assets.url('/css/index.css'), css)
  assets.regenerate()
  assert.notEqual(assets.url('/css/index.css'), css)
})

test('versioned assets respect subdirectory deployments and existing URL parameters', () => {
  const assets = fixture('/hexo-theme-toybox/')
  const url = new URL(assets.url('/js/main.js?mode=test&v=old#section'), 'https://example.com')
  assert.equal(url.pathname, '/hexo-theme-toybox/js/main.js')
  assert.equal(url.searchParams.get('mode'), 'test')
  assert.match(url.searchParams.get('v'), /^[a-f0-9]{16}$/)
  assert.equal(url.searchParams.getAll('v').length, 1)
  assert.equal(url.hash, '#section')
})

test('external CDN and data URLs are not rewritten', () => {
  const assets = fixture()
  for (const url of ['https://cdn.example.com/main.js?v=1', '//cdn.example.com/main.css', 'data:text/css,body{}']) {
    assert.equal(assets.url(url), url)
  }
})
