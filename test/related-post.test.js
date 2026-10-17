'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function loadHelper() {
  let helper
  const hexo = { extend: { helper: { register: (name, fn) => { assert.equal(name, 'related_posts'); helper = fn } } } }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/helpers/related_post.js'), 'utf8'), { hexo })
  return helper
}

const post = (slug, day, extra = {}) => Object.assign({ title: slug, path: `${slug}/`, date: Date.UTC(2026, 0, day), updated: Date.UTC(2026, 5, day), cover: `/${slug}.png`, cover_type: 'img' }, extra)

function context(limit, covered = []) {
  return {
    theme: { related_post: { limit, date_type: 'created' } },
    config: { date_format: 'YYYY-MM-DD' },
    _p: key => key,
    escape_html: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    url_for: value => '/blog/' + value.replace(/^\//, ''),
    date: value => new Date(value).toISOString().slice(0, 10),
    toybox_cover: article => { covered.push(article.path); return article.cover }
  }
}

const titles = html => [...html.matchAll(/<div class="title">([^<]*)<\/div>/g)].map(match => match[1])

test('related posts rank shared tags, then date, then path, regardless of load order', () => {
  const helper = loadHelper()
  const current = post('current', 9)
  const old = post('old', 1)
  const newer = post('newer', 5)
  const twinA = post('twin-a', 3)
  const twinB = post('twin-b', 3)
  const both = post('both', 2)
  const tagsInOrder = posts => [{ posts: [current, ...posts, both] }, { posts: [both, current] }]

  const forward = helper.call(context(10), { path: current.path, tags: tagsInOrder([old, twinB, newer, twinA]) })
  const reversed = helper.call(context(10), { path: current.path, tags: tagsInOrder([twinA, newer, twinB, old]) })
  assert.deepEqual(titles(forward), ['both', 'newer', 'twin-a', 'twin-b', 'old'])
  assert.equal(reversed, forward)
})

test('only the posts that are shown resolve covers and links', () => {
  const helper = loadHelper()
  const covered = []
  const current = post('current', 9)
  const others = Array.from({ length: 8 }, (_, index) => post('p' + index, index + 1, index === 7 ? { cover: '#123456', cover_type: undefined, title: 'A < B' } : {}))
  const html = helper.call(context(3, covered), { path: current.path, tags: [{ posts: [current, ...others] }] })
  assert.deepEqual(covered, ['p7/', 'p6/', 'p5/'])
  assert.equal((html.match(/<a href="\/blog\/p\d\/"/g) || []).length, 3)
  assert.match(html, /<div class="cover" style="background: #123456"><\/div>/)
  assert.match(html, /<img class="cover" src="\/blog\/p6.png" alt="cover">/)
  assert.match(html, /title="A &lt; B"/)
  assert.match(html, /<span>post\.recommend<\/span>/)
})

test('posts without shared tags render nothing', () => {
  const helper = loadHelper()
  const current = post('current', 9)
  assert.equal(helper.call(context(6), { path: current.path, tags: [] }), '')
  assert.equal(helper.call(context(6), { path: current.path, tags: [{ posts: [current] }] }), '')
})
