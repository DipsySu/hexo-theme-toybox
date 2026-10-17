'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { compile, loadHexo } = require('./helpers')

function loadFilter(defaultCover, postAssetFolder = false, homeCovers = []) {
  return loadHexo('scripts/filters/random_cover.js', {
    config: { post_asset_folder: postAssetFolder },
    theme: { config: { cover: { default_cover: defaultCover }, toybox: { home: { fallback_covers: homeCovers } } } }
  }).filters.before_post_render
}

test('chooses the same fallback cover for the same post identity', () => {
  const covers = ['/img/fallback-a.jpg', '/img/fallback-b.jpg', '/img/fallback-c.jpg']
  const applyCover = loadFilter(covers)
  const first = applyCover({ path: '2026/stable-post/', title: 'Stable post' })
  const second = applyCover({ path: '2026/stable-post/', title: 'Stable post' })

  assert.equal(first.cover, second.cover)
  assert.equal(covers.includes(first.cover), true)
  assert.equal(first.toybox_cover_source, 'fallback')
  assert.equal(second.toybox_cover_source, 'fallback')

  const firstCover = first.cover
  const incremental = applyCover(first)
  assert.equal(incremental.cover, firstCover)
  assert.equal(incremental.cover_type, 'img')
  assert.equal(incremental.toybox_cover_source, 'fallback')
})

test('preserves explicit and disabled post covers', () => {
  const applyCover = loadFilter(['/img/fallback.jpg'])
  const explicit = applyCover({ path: 'explicit/', cover: '/img/custom.jpg' })
  const disabled = applyCover({ path: 'disabled/', cover: false })

  assert.equal(explicit.cover, '/img/custom.jpg')
  assert.equal(explicit.cover_type, 'img')
  assert.equal(explicit.toybox_cover_source, 'explicit')
  assert.equal(disabled.cover, false)
  assert.equal(disabled.toybox_cover_source, 'disabled')
})

test('renders bundled fallback images with an otherwise default configuration', () => {
  const applyCover = loadFilter([], false, [{ src: '/img/home-toybox/card-aqua-scene.jpg' }])
  const article = applyCover({ path: 'hello-world/' })
  assert.equal(article.cover, '/img/home-toybox/card-aqua-scene.jpg')
  assert.equal(article.cover_type, 'img')
  assert.equal(article.toybox_cover_source, 'fallback')
})

test('an empty default_cover falls back to the bundled covers everywhere', () => {
  const { fallbackCovers } = require('../lib/covers')
  const theme = { cover: { default_cover: '' }, toybox: { home: { fallback_covers: [{ src: '/a.webp', fallback: '/a.png' }, '/b.jpg', {}] } } }
  assert.deepEqual(fallbackCovers(theme), ['/a.webp', '/b.jpg'])
  assert.deepEqual(fallbackCovers({ cover: { default_cover: '/only.jpg' } }), ['/only.jpg'])
  const applyCover = loadFilter('', false, theme.toybox.home.fallback_covers)
  assert.equal(['/a.webp', '/b.jpg'].includes(applyCover({ path: 'empty-default/' }).cover), true)

  const helper = loadHexo('scripts/helpers/cartridge-cover.js').helpers.toybox_cover
  const posts = [{ path: 'x/', toybox_cover_source: 'fallback', cover: '/b.jpg' }, { path: 'y/', toybox_cover_source: 'fallback', cover: '/a.webp' }]
  const context = { theme, site: { posts: { sort: () => posts } } }
  assert.deepEqual(posts.map(post => helper.call(context, post)), ['/a.webp', '/b.jpg'])
})

test('social previews and the share widget use the sleeve artwork', () => {
  const locals = {
    page: { cover: '/img/provisional.jpg', cover_type: 'img' },
    theme: { avatar: { img: '/img/avatar.png' }, sharejs: { sites: 'twitter' }, asset: { sharejs_css: '/share.css', sharejs: '/share.js' } },
    toybox_cover: () => '/img/sleeve.jpg',
    is_post: () => true,
    full_url_for: value => 'https://example.com' + value,
    url_for: value => value,
    toybox_asset: value => value,
    open_graph: options => `<meta property="og:image" content="${options.image}">`
  }
  const og = compile('layout/includes/head/Open_Graph.pug')(locals)
  const share = compile('layout/includes/third-party/share/share-js.pug')(locals)
  assert.match(og, /content="https:\/\/example\.com\/img\/sleeve\.jpg"/)
  assert.match(share, /data-image="\/img\/sleeve\.jpg"/)
  locals.page = { cover: false }
  assert.match(compile('layout/includes/head/Open_Graph.pug')(locals), /\/img\/avatar\.png/)
})
