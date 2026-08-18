'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const filterSource = fs.readFileSync(path.join(__dirname, '../scripts/filters/random_cover.js'), 'utf8')

function loadFilter(defaultCover, postAssetFolder = false) {
  let registeredFilter
  const hexo = {
    config: { post_asset_folder: postAssetFolder },
    theme: { config: { cover: { default_cover: defaultCover } } },
    extend: {
      filter: {
        register(name, callback) {
          assert.equal(name, 'before_post_render')
          registeredFilter = callback
        }
      }
    }
  }

  vm.runInNewContext(filterSource, { hexo }, { filename: 'random_cover.js' })
  return registeredFilter
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
