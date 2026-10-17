'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const pug = require('pug')

const root = path.join(__dirname, '..')
const helpers = {}
globalThis.hexo = { extend: { helper: { register: (name, callback) => { helpers[name] = callback } } } }
require('../scripts/helpers/collections.js')
delete globalThis.hexo

const text = (key, params) => helpers.toybox_text.call({ page: { lang: 'en' }, config: {}, _p: name => name }, key, params)
const url = value => '/blog/' + String(value).replace(/^\//, '')

function day (value) {
  const date = new Date(value + 'T12:00:00Z')
  return { year: () => date.getUTCFullYear(), month: () => date.getUTCMonth(), date: () => date.getUTCDate(), valueOf: () => date.getTime() }
}

function post (slug, value, extra = {}) {
  return Object.assign({ title: slug, path: `posts/${slug}/`, date: day(value), cover: `/img/${slug}.jpg`, cover_type: 'img', categories: [] }, extra)
}

const alpha = post('alpha', '2026-07-15', { categories: [{ name: 'Software Development' }], description: 'Alpha summary' })
const beta = post('beta', '2026-07-01', { cover: false, cover_type: undefined })
const gamma = post('gamma', '2026-03-10')
const delta = post('delta', '2025-12-31')
const posts = [alpha, beta, gamma, delta]

const tags = [
  { name: 'beta tag', path: 'tags/beta/', length: 5 },
  { name: '<script>alert(1)</script>', path: 'tags/script/', length: 2 },
  { name: 'Alpha Tag', path: 'tags/alpha/', length: 5 },
  { name: 'Unused', path: 'tags/unused/', length: 0 }
]

const categories = [
  { _id: 'dev', name: 'Software Development', path: 'categories/软件开发/', length: 3, posts: [gamma, beta, alpha] },
  { _id: 'web', parent: 'dev', name: 'Web', path: 'categories/软件开发/web/', length: 2, posts: [alpha, beta] },
  { _id: 'css', parent: 'web', name: 'CSS', path: 'categories/软件开发/web/css/', length: 1, posts: [beta] },
  { _id: 'life', name: 'Life <b>', path: 'categories/life/', length: 1, posts: [beta] },
  { _id: 'orphan', parent: 'missing', name: 'Orphan', path: 'categories/orphan/', length: 1, posts: [delta] },
  { _id: 'a', parent: 'b', name: 'Loop A', path: 'categories/a/', length: 1, posts: [delta] },
  { _id: 'b', parent: 'a', name: 'Loop B', path: 'categories/b/', length: 1, posts: [delta] },
  { _id: 'empty', name: 'Empty', path: 'categories/empty/', length: 0, posts: [] }
]

function context (page, config = {}) {
  return {
    page,
    site: { posts, tags, categories },
    config: Object.assign({ archive_dir: 'archives', tag_dir: 'tags', category_dir: 'categories', archive_generator: { per_page: 3, yearly: true, monthly: true }, tag_generator: { per_page: 3 }, category_generator: { per_page: 3 } }, config),
    theme: { cover: { archives_enable: true, default_cover: ['/img/fallback.jpg'] } },
    url_for: url,
    toybox_cover: article => article.cover,
    _p: key => key
  }
}

function view (page, config) {
  return helpers.toybox_collection_view.call(context(page, config))
}

function locals (collection, page, extra = {}) {
  return Object.assign({
    toyboxCollection: collection,
    toyboxIndexType: '',
    collectionExcerpt: false,
    page,
    site_title: page.tag || page.category || 'Archives',
    theme: { cover: { archives_enable: true }, error_img: { post_page: '/img/avatar.png' } },
    config: { date_format: 'YYYY-MM-DD' },
    url_for: url,
    toybox_text: text,
    toybox_cover: article => article.cover,
    toybox_collection_links: () => helpers.toybox_collection_links.call(context(page)),
    date: (value, format) => format === 'YYYY' ? String(value.year()) : new Date(+value).toISOString().slice(0, 10),
    date_xml: value => new Date(+value).toISOString(),
    strip_html: value => String(value).replace(/<[^>]+>/g, ''),
    _p: key => key
  }, extra)
}

const renderResults = pug.compileFile(path.join(root, 'layout/includes/collection/results.pug'))
const renderHeading = pug.compileFile(path.join(root, 'layout/includes/collection/heading.pug'))
const renderTags = pug.compileFile(path.join(root, 'layout/includes/page/tags.pug'))
const renderCategories = pug.compileFile(path.join(root, 'layout/includes/page/categories.pug'))

test('tag index uses real counts, skips empty tags, and orders deterministically', () => {
  const index = helpers.toybox_tag_index.call(context({}))
  assert.deepEqual(index.map(tag => [tag.name, tag.count]), [['Alpha Tag', 5], ['beta tag', 5], ['<script>alert(1)</script>', 2]])
  assert.equal(index[0].url, '/blog/tags/alpha/')
  assert.deepEqual(index.map(tag => tag.tone), helpers.toybox_tag_index.call(context({})).map(tag => tag.tone))
  index.forEach(tag => assert.ok(['coral', 'aqua', 'yellow', 'green'].includes(tag.tone)))
})

test('category tree keeps nested hierarchy, membership counts, and deterministic artwork', () => {
  const tree = helpers.toybox_category_tree.call(context({}))
  const dev = tree.find(node => node.name === 'Software Development')
  assert.equal(dev.count, 3)
  assert.equal(dev.children[0].name, 'Web')
  assert.equal(dev.children[0].children[0].name, 'CSS')
  assert.equal(dev.children[0].children[0].depth, 2)
  assert.equal(dev.cover, '/blog/img/alpha.jpg')
  assert.equal(dev.latestTitle, 'alpha')
  assert.equal(dev.url, '/blog/categories/软件开发/')
  const life = tree.find(node => node.name === 'Life <b>')
  assert.equal(life.cover, '')
  assert.ok(tree.find(node => node.name === 'Orphan'))
  assert.ok(tree.find(node => node.name.startsWith('Loop')))
  assert.ok(!tree.find(node => node.name === 'Empty'))
  assert.equal(helpers.toybox_category_total.call(context({}), tree), 7)
})

test('archive views scope totals and routes to the configured archive directory', () => {
  const month = view({ archive: true, year: 2026, month: 7, base: 'notes/2026/07/', current: 1, total: 1, posts: [alpha, beta] }, { archive_dir: 'notes' })
  assert.equal(month.total, 2)
  assert.deepEqual(month.breadcrumb.map(crumb => crumb.key || crumb.label), ['collection.home', 'collection.archives', '2026', '2026-07'])
  assert.equal(month.breadcrumb[2].url, '/blog/notes/2026/')
  assert.deepEqual(month.rail.items.map(item => [item.label || item.key, item.count, item.current]), [['collection.allPosts', 4, false], ['2026', 3, 'true'], ['2026-07', 2, 'page'], ['2025', 1, false]])
  assert.equal(month.rail.items[2].url, '/blog/notes/2026/07/')
  assert.equal(month.pager.totalPages, 1)

  const year = view({ archive: true, year: 2026, base: 'notes/2026/', current: 1, total: 1, posts: [alpha, beta, gamma] }, { archive_dir: 'notes' })
  assert.equal(year.total, 3)
  assert.equal(year.groupByYear, false)
  assert.equal(year.rail.items[1].current, 'page')

  const all = view({ archive: true, base: 'notes/', current: 2, total: 2, posts: [delta] }, { archive_dir: 'notes', pagination_dir: 'p' })
  assert.deepEqual([all.pager.start, all.pager.end, all.pager.total], [4, 4, 4])
  assert.equal(all.pager.prev, '/blog/notes/')
  assert.equal(all.pager.next, '')
  assert.equal(all.pager.pages[1].url, '/blog/notes/p/2/')
  assert.equal(all.groupByYear, true)
})

test('tag and category views report collection totals, siblings, and ancestry', () => {
  const tag = view({ tag: 'Alpha Tag', base: 'tags/alpha/', current: 1, total: 2, posts: [alpha, beta, gamma] })
  assert.equal(tag.total, 5)
  assert.deepEqual([tag.pager.start, tag.pager.end], [1, 3])
  assert.equal(tag.pager.next, '/blog/tags/alpha/page/2/')
  assert.equal(tag.rail.back.url, '/blog/tags/')
  assert.equal(tag.rail.items.find(item => item.current === 'page').label, 'Alpha Tag')

  const css = view({ category: 'CSS', base: 'categories/软件开发/web/css/', current: 1, total: 1, posts: [beta] })
  assert.equal(css.total, 1)
  assert.deepEqual(css.breadcrumb.map(crumb => crumb.key || crumb.label), ['collection.home', 'collection.categories', 'Software Development', 'Web', 'CSS'])
  assert.deepEqual(css.rail.items.map(item => [item.label, item.depth, item.current]), [['Web', 0, 'true'], ['CSS', 1, 'page']])
})

test('result ledger renders escaped single-link rows, a shared rail, and a bounded pager', () => {
  const page = { tag: 'Alpha Tag', base: 'tags/alpha/', current: 2, total: 2, posts: [alpha, beta] }
  const html = renderResults(locals(view(page), page))
  assert.match(html, /<div class="toybox-ledger" id="tag"/)
  assert.equal((html.match(/class="toybox-ledger-row/g) || []).length, 2)
  assert.equal((html.match(/class="toybox-ledger-title"/g) || []).length, 2)
  assert.doesNotMatch(html, /<span class="toybox-ledger-thumb"[^>]*>(?:(?!<\/span>)[\s\S])*<a/)
  assert.match(html, /is-coverless[\s\S]*fa-file-alt/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /aria-current="page"/)
  assert.match(html, /4–5 of 5 posts/)
  assert.match(html, /<button class="toybox-page-step next"[^>]*disabled/)
  assert.match(html, /<a class="toybox-page-step prev" href="\/blog\/tags\/alpha\/"/)
  assert.match(html, /<select id="toybox-collection-page"[^>]*disabled/)
  assert.doesNotMatch(html, /toybox-ledger-excerpt|toybox-ledger-year/)

  const single = { tag: 'beta tag', base: 'tags/beta/', current: 1, total: 1, posts: [gamma] }
  assert.doesNotMatch(renderResults(locals(view(single), single)), /toybox-collection-pager/)
})

test('archive ledger groups by year and index-style collections add excerpts', () => {
  const page = { archive: true, base: 'archives/', current: 1, total: 2, posts: [alpha, beta, delta] }
  const html = renderResults(locals(view(page), page, { collectionExcerpt: true }))
  assert.match(html, /<h2 class="toybox-ledger-year">2026<\/h2>[\s\S]*<h2 class="toybox-ledger-year">2025<\/h2>/)
  assert.match(html, /<p class="toybox-ledger-excerpt">Alpha summary<\/p>/)
  assert.match(html, /<div class="toybox-ledger" id="archive"/)
  assert.match(html, /data-toybox-i18n="collection.allPostsOption"/)
})

test('compact heading exposes breadcrumbs, true totals, and the active collection link', () => {
  const page = { category: 'CSS', base: 'categories/软件开发/web/css/', current: 1, total: 1, posts: [beta] }
  const html = renderHeading(locals(view(page), page))
  assert.match(html, /<a href="\/blog\/categories\/软件开发\/">Software Development<\/a>/)
  assert.match(html, /<span aria-current="page">CSS<\/span>/)
  assert.match(html, /<h1 id="site-title">CSS<\/h1>/)
  assert.match(html, />Posts: 1</)
  assert.match(html, /href="\/blog\/categories\/" aria-current="true"/)
  assert.equal((html.match(/<h1/g) || []).length, 1)

  const index = renderHeading(locals(null, { title: 'Tags' }, { toyboxIndexType: 'tags', site_title: 'Tags <i>', toybox_tag_index: () => [1, 2, 3] }))
  assert.match(index, /Tags &lt;i&gt;/)
  assert.match(index, />Tags: 3</)
  assert.match(index, /href="\/blog\/tags\/" aria-current="page"/)

  const translated = renderHeading(locals(null, {}, { toyboxIndexType: 'tags', site_title: '标签', toybox_tag_index: () => [1] }))
  assert.match(translated, /<h1 id="site-title" data-toybox-i18n="collection.tags">Tags<\/h1>/)
  assert.match(translated, /<span aria-current="page" data-toybox-i18n="collection.tags">Tags<\/span>/)

  const month = { archive: true, year: 2026, month: 7, base: 'archives/2026/07/', posts: [alpha, beta] }
  const dated = renderHeading(locals(view(month), month, { site_title: '七月 2026' }))
  assert.match(dated, /<h1 id="site-title">2026-07<\/h1>/)
})

test('tag index renders usable SSR labels and inactive enhancement controls', () => {
  const index = helpers.toybox_tag_index.call(context({}))
  const html = renderTags(locals(null, {}, { toybox_tag_index: () => index }))
  assert.equal((html.match(/class="toybox-tag-label"/g) || []).length, 3)
  assert.match(html, /href="\/blog\/tags\/alpha\/"/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /<input id="toybox-tag-filter"[^>]*disabled/)
  assert.match(html, /role="status" aria-live="polite"/)
  assert.match(html, /aria-label="Alpha Tag, posts: 5"/)
  assert.match(html, /class="toybox-filter-empty" hidden/)
  assert.doesNotMatch(html, /font-size/)

  const empty = renderTags(locals(null, {}, { toybox_tag_index: () => [] }))
  assert.match(empty, /No tags yet\./)
  assert.doesNotMatch(empty, /toybox-tag-filter/)
})

test('category boxes nest children as separate escaped links', () => {
  const tree = helpers.toybox_category_tree.call(context({}))
  const html = renderCategories(locals(null, {}, { toybox_category_tree: () => tree }))
  assert.equal((html.match(/class="toybox-category-box"/g) || []).length, tree.length)
  assert.match(html, /<ul class="toybox-category-children">[\s\S]*Web[\s\S]*<ul class="toybox-category-children">[\s\S]*CSS/)
  assert.doesNotMatch(html, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/)
  assert.match(html, /Life &lt;b&gt;/)
  assert.match(html, /<img src="\/blog\/img\/alpha.jpg"/)
  assert.match(html, /fa-folder-open/)
  assert.match(html, /Latest: alpha/)
  assert.match(renderCategories(locals(null, {}, { toybox_category_tree: () => [] })), /No categories yet\./)
})

test('server collection strings come from the runtime dictionaries for the page language', () => {
  const textFor = (page, config, key, params) => helpers.toybox_text.call({ page, config, _p: name => 'yml:' + name }, key, params)
  assert.equal(text('collection.posts', { count: 3 }), 'Posts: 3')
  assert.equal(textFor({ lang: 'zh-TW' }, { language: 'zh-CN' }, 'collection.posts', { count: 3 }), '3 篇文章')
  assert.equal(textFor({ lang: 'fr' }, { language: ['fr', 'zh-CN'] }, 'collection.tags'), '标签')
  assert.equal(textFor({ lang: 'fr' }, { language: 'fr' }, 'footer.theme'), 'Theme')
  assert.equal(textFor({}, {}, 'copy.success'), 'yml:copy.success', 'keys the dictionaries lack still go through _p')
})

test('tag filtering and sorting work over the full SSR index and keep focus', () => {
  let focused = null
  const control = props => Object.assign({ hidden: false, disabled: true, value: '', dataset: {}, listeners: {}, addEventListener (type, callback) { this.listeners[type] = callback }, focus () { focused = this } }, props)
  const item = (name, count) => ({ hidden: false, name, dataset: { count }, querySelector: () => ({ textContent: name }) })
  const items = [item('Hexo', 5), item('Zebra', 3), item('alpha', 1)]
  const grid = { hidden: false, children: items.slice(), appendChild (node) { this.children.splice(this.children.indexOf(node), 1); this.children.push(node) } }
  const input = control({})
  const sort = control({ value: 'count' })
  const clear = control({ hidden: true })
  const reset = control({})
  const status = { textContent: '' }
  const empty = { hidden: true }
  const nodes = { '#toybox-tag-filter': input, '#toybox-tag-sort': sort, '.toybox-filter-clear': clear, '.toybox-filter-reset': reset, '#toybox-tag-grid': grid, '#toybox-tag-status': status, '.toybox-filter-empty': empty }
  const indexRoot = { dataset: {}, querySelector: selector => nodes[selector] }
  const runtime = {
    document: { readyState: 'complete', documentElement: { lang: 'en' }, addEventListener () {}, querySelectorAll: selector => selector === '[data-toybox-tag-index]' ? [indexRoot] : [] },
    ToyboxSettings: { bind: (node, key, params) => { node.textContent = key + ' ' + JSON.stringify(params) } },
    location: { assign () {} },
    addEventListener () {}
  }
  runtime.window = runtime
  vm.runInNewContext(fs.readFileSync(path.join(root, 'source/js/collection-ui.js'), 'utf8'), runtime)

  assert.equal(input.disabled, false)
  assert.equal(sort.disabled, false)
  input.value = 'HE'
  input.listeners.input()
  assert.deepEqual(items.map(entry => entry.hidden), [false, true, true])
  assert.equal(clear.hidden, false)
  assert.match(status.textContent, /collection\.tagResults .*"shown":1,"total":3/)

  input.value = 'zzz'
  input.listeners.input()
  assert.equal(empty.hidden, false)
  assert.equal(grid.hidden, true)
  reset.listeners.click()
  assert.equal(focused, input)
  assert.equal(input.value, '')
  assert.deepEqual(items.map(entry => entry.hidden), [false, false, false])
  assert.match(status.textContent, /collection\.tagAll/)

  sort.value = 'name'
  sort.listeners.change()
  assert.deepEqual(grid.children.map(entry => entry.name), ['alpha', 'Hexo', 'Zebra'])
  sort.value = 'count'
  sort.listeners.change()
  assert.deepEqual(grid.children.map(entry => entry.name), ['Hexo', 'Zebra', 'alpha'])
})

test('destination pickers commit keyboard steps on Enter and retain native pointer navigation', () => {
  const destinations = ['/archives/', '/archives/page/2/', '/archives/page/3/']
  const assigned = []
  const select = {
    dataset: {}, listeners: {}, disabled: true, selectedIndex: 0,
    options: destinations.map(value => ({ value })),
    get value () { return destinations[this.selectedIndex] },
    set value (value) { this.selectedIndex = destinations.indexOf(value) },
    addEventListener (event, callback) { this.listeners[event] = callback },
    closest () { return null }
  }
  const runtime = {
    document: { readyState: 'complete', querySelectorAll: selector => selector === 'select[data-toybox-destination]' ? [select] : [] },
    location: { assign: value => assigned.push(value) }, addEventListener () {}
  }
  runtime.window = runtime
  vm.runInNewContext(fs.readFileSync(path.join(root, 'source/js/collection-ui.js'), 'utf8'), runtime)
  const press = key => select.listeners.keydown({ key, preventDefault () {} })
  assert.equal(select.disabled, false)
  press('ArrowDown')
  assert.equal(select.value, destinations[1])
  assert.deepEqual(assigned, [])
  press('Enter')
  assert.deepEqual(assigned, [destinations[1]])
  press('End')
  press('ArrowDown')
  assert.equal(select.value, destinations[2])
  press('Escape')
  assert.equal(select.value, destinations[0])
  press('ArrowDown')
  select.listeners.blur()
  assert.equal(select.value, destinations[0])
  select.value = destinations[2]
  select.listeners.change()
  assert.deepEqual(assigned, [destinations[1], destinations[2]])
})
