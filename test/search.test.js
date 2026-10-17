'use strict'

const assert = require('node:assert/strict')
const vm = require('node:vm')
const test = require('node:test')
const { read } = require('./helpers')
const source = read('source/js/search/local-search.js').split(';(() => {')[0]

function searchFixture(fetch) {
  const events = []
  const context = { fetch, Event, AbortController, setTimeout, clearTimeout, URL, location: { origin: 'https://example.test' }, window: { dispatchEvent: event => events.push(event.type) } }
  vm.runInNewContext(source + '\nthis.Search = LocalSearch', context)
  return { search: new context.Search({ path: '/search.json' }), events }
}

test('search retries after a network failure without getting stuck loading', async () => {
  let attempts = 0
  const { search, events } = searchFixture(async () => {
    if (++attempts === 1) throw new Error('offline')
    return { ok: true, text: async () => JSON.stringify([{ title: 'Hello', content: 'Search works', url: '/hello/' }]) }
  })
  assert.equal(await search.fetchData(), false)
  assert.equal(search.state, 'error')
  assert.equal(search.isfetched, false)
  assert.equal(await search.fetchData(), true)
  assert.equal(attempts, 2)
  assert.equal(search.getResultItems(['hello']).length, 1)
  assert.deepEqual(events, ['search:loading', 'search:error', 'search:loading', 'search:loaded'])
})

test('search rejects HTTP and parsing failures before marking the index loaded', async () => {
  for (const response of [{ ok: false }, { ok: true, text: async () => '{invalid' }, { ok: true, text: async () => '{}' }]) {
    const { search } = searchFixture(async () => response)
    assert.equal(await search.fetchData(), false)
    assert.equal(search.isfetched, false)
    assert.equal(search.request, null)
  }
})

test('search shares in-flight requests and reuses a successfully parsed index', async () => {
  let finish
  let requests = 0
  const { search } = searchFixture(() => { requests++; return new Promise(resolve => { finish = resolve }) })
  const first = search.fetchData()
  assert.equal(search.fetchData(), first)
  finish({ ok: true, text: async () => '[]' })
  assert.equal(await first, true)
  assert.equal(await search.fetchData(), true)
  assert.equal(requests, 1)
})

test('search escapes index content and rejects script URLs', async () => {
  const { search } = searchFixture(async () => ({ ok: true, text: async () => JSON.stringify([
    { title: '<img src=x>', url: '/post/' },
    { title: 'Bad', url: 'javascript:alert(1)' }
  ]) }))
  await search.fetchData()
  assert.equal(search.datas.length, 1)
  assert.equal(search.datas[0].title, '&lt;img src=x&gt;')
})

test('search matches any letter case and highlights the original text', async () => {
  const { search } = searchFixture(async () => ({ ok: true, text: async () => JSON.stringify([
    { title: 'Flutter Gradient', content: 'Build a LinearGradient in Flutter', url: '/flutter/' },
    { title: 'Go', content: 'Goroutines', url: '/go/' }
  ]) }))
  await search.fetchData()
  assert.equal(search.datas[0].titleLc, 'flutter gradient')
  const results = search.getResultItems(['GRADIENT'])
  assert.equal(results.length, 1)
  assert.match(results[0].item, /<mark class="search-keyword">Gradient<\/mark>/)
  assert.match(results[0].item, /Linear<mark class="search-keyword">Gradient<\/mark>/)
  assert.equal(results[0].includedCount, 1)
})
