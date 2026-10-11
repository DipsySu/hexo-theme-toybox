'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const pug = require('pug')

const render = pug.compileFile(path.join(__dirname, '../layout/includes/pagination.pug'))

function home(current, total = 13, count = 63, perPage = 5) {
  const base = 'blog/'
  const link = number => number === 1 ? base : base + 'shelf/' + number + '/'
  return render({
    is_post: () => false,
    is_home: () => true,
    url_for: value => '/project/' + value,
    config: { index_generator: { per_page: perPage }, pagination_dir: 'shelf' },
    site: { posts: { length: count } },
    page: {
      base, current, total,
      posts: { length: Math.max(0, Math.min(perPage || count, count - (current - 1) * perPage)) },
      prev: current > 1 ? current - 1 : 0,
      next: current < total ? current + 1 : 0,
      prev_link: current > 1 ? link(current - 1) : '',
      next_link: current < total ? link(current + 1) : ''
    }
  })
}

test('home pagination has one page picker, a real range, and disabled first-page previous action', () => {
  const html = home(1)
  assert.equal((html.match(/<select/g) || []).length, 1)
  assert.equal((html.match(/<option/g) || []).length, 13)
  assert.match(html, /1-5 \/ 63/)
  assert.match(html, /<button class="toybox-page-step prev"[^>]*disabled/)
  assert.match(html, /href="\/project\/blog\/shelf\/2\/"/)
  assert.doesNotMatch(html, /class="page-number/)
})

test('last page preserves actual post count and project-root jump destinations', () => {
  const html = home(13)
  assert.match(html, /61-63 \/ 63/)
  assert.match(html, /data-current-page="13"/)
  assert.match(html, /<button class="toybox-page-step next"[^>]*disabled/)
  assert.match(html, /<option value="\/project\/blog\/" data-page="1"/)
  assert.match(html, /<option value="\/project\/blog\/shelf\/13\/" data-page="13" selected/)
})

test('single-page and empty collections keep valid ranges and both directions disabled', () => {
  for (const [count, range] of [[3, '1-3 / 3'], [0, '0-0 / 0']]) {
    const html = home(1, 1, count, 0)
    assert.ok(html.includes(range))
    assert.match(html, /<button class="toybox-page-step prev"[^>]*disabled/)
    assert.match(html, /<button class="toybox-page-step next"[^>]*disabled/)
  }
})

test('archive pagination keeps its existing paginator', () => {
  const html = render({ is_post: () => false, is_home: () => false, paginator: () => '<span>archive pages</span>' })
  assert.match(html, /archive pages/)
  assert.doesNotMatch(html, /toybox-page-select/)
})
