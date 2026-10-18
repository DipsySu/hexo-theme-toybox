'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const vm = require('node:vm')
const { compile, read } = require('./helpers')

const render = compile('layout/includes/page/flink.pug')
const url = value => /^https?:\/\//.test(value) ? value : '/blog/' + value.replace(/^\//, '')
const localGroups = [{ class_name: '', class_desc: '', link_list: [{ name: 'Local friend', link: 'https://local.test/', avatar: '/avatar.png', descr: 'Local description' }] }]
const locals = page => ({
  page: { content: '<p>Page content</p>', ...page }, site: { data: { link: localGroups } },
  theme: { error_img: { flink: '/fallback.png' } }, url_for: url, toybox_asset: url
})

test('flink_url takes precedence over local links and loads its script below the site root', () => {
  const html = render(locals({ flink_url: '/friends.json' }))
  assert.match(html, /data-flink-url="\/blog\/friends.json"/)
  assert.match(html, /data-flink-fallback="\/blog\/fallback.png"/)
  assert.match(html, /<script defer(?:="defer")? src="\/blog\/js\/flink.js"><\/script>/)
  assert.match(html, /<p>Page content<\/p>/)
  assert.doesNotMatch(html, /Local friend/)
  const remoteOnly = render({ ...locals({ flink_url: '/friends.json' }), site: { data: {} } })
  assert.match(remoteOnly, /data-flink-url="\/blog\/friends.json"/)
  assert.match(remoteOnly, /src="\/blog\/js\/flink.js"/)
  const external = render(locals({ flink_url: 'https://friends.test/list.json?q="quoted"&a=1' }))
  assert.match(external, /data-flink-url="https:\/\/friends.test\/list.json\?q=&quot;quoted&quot;&amp;a=1"/)
})

test('local and content-only friend pages stay server-rendered without a remote script', () => {
  const html = render(locals({}))
  assert.match(html, /Local friend/)
  assert.match(html, /Local description/)
  assert.match(html, /<p>Page content<\/p>/)
  assert.doesNotMatch(html, /data-flink-url|flink\.js/)
  assert.equal(render({ ...locals({}), site: { data: {} } }), '<div id="article-container"><div class="flink"><p>Page content</p></div></div>')
})

class Element {
  constructor (tag) { this.tag = tag; this.children = []; this.listeners = {}; this.textContent = '' }
  append (...nodes) { this.children.push(...nodes.flatMap(node => node.tag === '#fragment' ? node.children : [node])) }
  prepend (...nodes) { this.children.unshift(...nodes.flatMap(node => node.tag === '#fragment' ? node.children : [node])) }
  addEventListener (type, fn, options) { this.listeners[type] = { fn, options } }
  emit (type) {
    const listener = this.listeners[type]
    if (!listener) return
    if (listener.options.once) delete this.listeners[type]
    listener.fn()
  }
}

const find = (node, match) => [node, ...node.children.flatMap(child => find(child, match))].filter(match)
const group = { class_name: 'Friends!', class_desc: 'Useful sites', link_list: [{ name: 'A friend', link: 'https://friend.test/', avatar: '/avatar.png', descr: 'A description' }] }

async function run (fetch, options = {}) {
  const container = new Element('div')
  container.dataset = { flinkUrl: options.source || '/blog/friends.json', flinkFallback: '/blog/fallback.png' }
  const content = new Element('p')
  content.textContent = 'Page content'
  container.append(content)
  const requests = [], warnings = []
  let updates = 0
  await vm.runInNewContext(read('source/js/flink.js'), {
    URL,
    document: {
      baseURI: 'https://blog.test/blog/link/',
      querySelector: () => options.missing ? null : container,
      createElement: tag => new Element(tag),
      createDocumentFragment: () => new Element('#fragment')
    },
    fetch: source => { requests.push(source); return fetch(source) },
    window: options.lazyload === false ? {} : { lazyLoadInstance: { update: () => { updates++ } } },
    console: { warn: (...args) => warnings.push(args) }
  })
  return { container, content, requests, warnings, updates }
}

const response = groups => async () => ({ ok: true, json: async () => groups })

test('remote friend groups render before page content and refresh lazy loading', async () => {
  const result = await run(response([group]))
  assert.deepEqual(result.requests, ['/blog/friends.json'])
  assert.equal(result.updates, 1)
  assert.deepEqual(result.warnings, [])
  assert.equal(result.container.children.at(-1), result.content)
  const heading = find(result.container, node => node.tag === 'h2')[0]
  assert.equal(heading.textContent, 'Friends!')
  assert.equal(heading.id, 'Friends-')
  assert.equal(heading.children[0].href, '#Friends-')
  const link = find(result.container, node => node.target === '_blank')[0]
  assert.equal(link.href, 'https://friend.test/')
  assert.equal(link.rel, 'noopener noreferrer')
  assert.equal(find(link, node => node.className === 'flink-item-name')[0].textContent, 'A friend')
  assert.equal(find(link, node => node.tag === 'img')[0].src, 'https://blog.test/avatar.png')
})

test('absolute remote sources and lists without headings work without lazy loading', async () => {
  const result = await run(response([null, {}, { link_list: [null, { name: 'Relative', link: '../friend/' }] }]), { source: 'https://friends.test/list.json', lazyload: false })
  assert.deepEqual(result.requests, ['https://friends.test/list.json'])
  assert.deepEqual(result.warnings, [])
  assert.equal(find(result.container, node => node.tag === 'h2').length, 0)
  const link = find(result.container, node => node.target === '_blank')[0]
  assert.equal(link.href, 'https://blog.test/blog/friend/')
  assert.equal(find(link, node => node.tag === 'img')[0].src, 'https://blog.test/blog/fallback.png')
})

test('remote friend labels stay text and unsafe links or avatars are not executed', async () => {
  const label = '<img src=x onerror=alert(1)>'
  const result = await run(response([{ class_name: label, class_desc: label, link_list: [
    { name: label, descr: label, link: 'https://safe.test/', avatar: 'javascript:alert(1)' },
    { name: 'Script', link: 'javascript:alert(1)' },
    { name: 'Data', link: 'data:text/html,bad' }
  ] }]))
  const links = find(result.container, node => node.target === '_blank')
  assert.equal(links.length, 1)
  assert.equal(find(links[0], node => node.className === 'flink-item-name')[0].textContent, label)
  assert.equal(find(links[0], node => node.className === 'flink-item-desc')[0].textContent, label)
  assert.equal(find(result.container, node => node.tag === 'h2')[0].textContent, label)
  assert.equal(find(result.container, node => node.className === 'flink-desc')[0].textContent, label)
  assert.equal(find(links[0], node => node.tag === 'img')[0].src, 'https://blog.test/blog/fallback.png')
  assert.equal(find(result.container, node => node.tag === 'script' || node.innerHTML !== undefined).length, 0)
})

test('remote friend load failures keep page content and do not reject initialization', async () => {
  for (const fetch of [
    async () => { throw new Error('offline') },
    async () => ({ ok: false, status: 404, json: () => { throw new Error('must not parse') } }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid JSON') } }),
    response({ not: 'an array' })
  ]) {
    const result = await run(fetch)
    assert.deepEqual(result.container.children, [result.content])
    assert.equal(result.warnings.length, 1)
    assert.equal(result.updates, 0)
  }
})

test('failed avatars use the configured fallback only once', async () => {
  const result = await run(response([group]))
  const image = find(result.container, node => node.tag === 'img')[0]
  image.emit('error')
  assert.equal(image.src, 'https://blog.test/blog/fallback.png')
  assert.equal(image.listeners.error, undefined)
  image.emit('error')
  assert.equal(image.src, 'https://blog.test/blog/fallback.png')
})

test('pages without a remote friend list do not fetch', async () => {
  const result = await run(() => { throw new Error('must not fetch') }, { missing: true })
  assert.deepEqual(result.requests, [])
  assert.deepEqual(result.warnings, [])
})

test('empty remote lists preserve page content without substituting local links', async () => {
  const result = await run(response([]))
  assert.deepEqual(result.container.children, [result.content])
  assert.deepEqual(result.warnings, [])
})
