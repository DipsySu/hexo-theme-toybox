'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const vm = require('node:vm')
const { CustomEvent, clock, eventTarget, read, storage } = require('./helpers')

const saveSource = read('source/js/toybox-save.js')
const SAVE_KEY = 'toyboxResume:v1:/blog/'

function record(overrides) {
  return JSON.stringify(Object.assign({
    version: 1,
    path: '/blog/posts/a/',
    title: 'Saved quest',
    progress: 42,
    updatedAt: 1700000000000
  }, overrides))
}

function createElement(extra) {
  const attributes = new Map()
  const listeners = new Map()
  return Object.assign({
    dataset: {},
    hidden: false,
    listeners,
    style: { properties: new Map(), setProperty(name, value) { this.properties.set(name, String(value)) } },
    textContent: '',
    addEventListener(type, listener) { listeners.set(type, listener) },
    focus() {},
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null },
    hasAttribute(name) { return attributes.has(name) },
    removeAttribute(name) { attributes.delete(name) },
    setAttribute(name, value) { attributes.set(name, String(value)) }
  }, extra)
}

function createMount() {
  const parts = {}
  for (const name of ['link', 'cover', 'title', 'value', 'fill', 'clear']) parts[name] = createElement()
  const mount = createElement({ hidden: true, querySelector: selector => parts[selector.replace('.toybox-resume-', '')] || null })
  return { mount, parts }
}

function createRuntime(options = {}) {
  const local = storage(options.storage, options.failing)
  const session = options.session || storage({}, options.failing)
  const time = clock()
  const events = []
  const scrolls = []
  const replaced = []
  const bound = []
  const view = { top: 500, focused: null, home: createMount() }
  const location = { origin: 'https://example.test', pathname: options.pathname || '/blog/', search: '', hash: options.hash || '' }
  const isHome = location.pathname === '/blog/'

  const heading = createElement({ focus() { view.focused = heading } })
  const posts = { querySelector: selector => (selector === '.toybox-resume' ? view.home.mount : null) }
  const title = { textContent: '  <b>Hello</b>\n World ' }
  const cover = createElement()
  cover.setAttribute('src', 'data:image/gif;base64,placeholder')
  cover.setAttribute('data-lazy-src', '/blog/img/cover.webp')
  const article = {
    isConnected: true,
    scrollHeight: 3000,
    getBoundingClientRect: () => ({ top: view.top, bottom: view.top + 3000 }),
    querySelectorAll: () => (options.headings || []).map(([id, offset]) => ({ id, getBoundingClientRect: () => ({ top: view.top + offset }) }))
  }
  const document = {
    fonts: { ready: Promise.resolve() },
    hidden: false,
    addEventListener() {},
    dispatchEvent(event) { events.push(event) },
    getElementById(id) {
      if (!isHome) return null
      return id === 'recent-posts' ? posts : id === 'toybox-recent-title' ? heading : null
    },
    querySelector(selector) {
      if (isHome) return null
      return selector === '#post-info h1' ? title : selector === '#post-info .pixel-article-sleeve-art' ? cover : null
    }
  }
  const context = eventTarget({
    CustomEvent,
    GLOBAL_CONFIG: { root: '/blog/' },
    ToyboxSettings: {
      bind(el, key, params, attribute) {
        bound.push(key + ' ' + JSON.stringify(params))
        el.setAttribute(attribute, key)
        return el
      }
    },
    URL,
    document,
    history: { state: null, replaceState(state, unused, url) { replaced.push(url); location.hash = '' } },
    innerHeight: 1000,
    localStorage: local,
    location,
    pageYOffset: 0,
    sessionStorage: session,
    scrollTo(options) { scrolls.push(options.top) },
    ...time.globals
  })
  context.window = context
  vm.runInNewContext(saveSource, context, { filename: 'toybox-save.js' })

  return {
    api: context.ToyboxSave,
    bound,
    context,
    events,
    heading,
    local,
    replaced,
    scrolls,
    timers: time.timers,
    get focused() { return view.focused },
    get mount() { return view.home.mount },
    get parts() { return view.home.parts },
    advance: time.advance,
    fire: (type, event = { type }) => context.emit(type, event),
    replaceMount() { view.home = createMount() },
    save() {
      const raw = local.values.get(SAVE_KEY)
      return raw ? JSON.parse(raw) : null
    },
    setTop(top) { view.top = top },
    async settle() {
      await new Promise(resolve => setImmediate(resolve))
      while (time.frames.size) time.frame(16)
    },
    update(progress) {
      context.ToyboxSave.update({ article, path: location.pathname.replace(/\/$/, ''), progress })
    }
  }
}

test('loading the runtime twice keeps one API', () => {
  const runtime = createRuntime()
  vm.runInContext(saveSource, runtime.context)
  assert.equal(runtime.context.ToyboxSave, runtime.api)
  assert.deepEqual(Object.keys(runtime.api).sort(), ['refresh', 'update'])
})

test('rejects unsafe or corrupt saves and renders the title as plain text', () => {
  const unsafe = [
    '{',
    record({ version: 2 }),
    record({ path: 'https://evil.test/blog/posts/a/' }),
    record({ path: '//evil.test/blog/posts/a/' }),
    record({ path: 'javascript:alert(1)' }),
    record({ path: '/blog/../admin/' }),
    record({ path: '/blog/%2f..%2fadmin/' }),
    record({ path: '/blog/%5cadmin/' }),
    record({ path: '/other/posts/a/' }),
    record({ path: '/blog/' }),
    record({ progress: '42' }),
    record({ progress: 120 }),
    record({ progress: null }),
    record({ title: 42 }),
    record({ cover: 'data:image/png;base64,AAAA' }),
    record({ cover: 'https://cdn.evil.test/a.png' }),
    record({ cover: '/private/a.png' }),
    record({ anchorId: 'part', anchorRatio: 2 })
  ]
  for (const raw of unsafe) {
    const runtime = createRuntime({ storage: { [SAVE_KEY]: raw } })
    runtime.api.refresh()
    assert.equal(runtime.mount.hidden, true, raw)
  }

  const title = '<img src=x onerror=alert(1)>'
  const runtime = createRuntime({ storage: { [SAVE_KEY]: record({ title, cover: '/blog/img/a.webp' }) } })
  runtime.api.refresh()
  assert.equal(runtime.mount.hidden, false)
  assert.equal(runtime.parts.title.textContent, title)
  assert.equal(runtime.parts.value.textContent, '42%')
  assert.equal(runtime.parts.fill.style.width, '42%')
  assert.equal(runtime.mount.style.properties.get('--resume-progress'), '42%')
  assert.equal(runtime.parts.link.getAttribute('href'), '/blog/posts/a/#toybox-resume')
  assert.equal(runtime.parts.cover.getAttribute('src'), '/blog/img/a.webp')
  assert.equal(runtime.parts.cover.hidden, false)
  assert.equal(runtime.bound.at(-1), 'home.resumeTitle ' + JSON.stringify({ title, progress: 42 }))
})

test('storage failures leave the homepage and article usable', () => {
  const home = createRuntime({ failing: true })
  assert.doesNotThrow(() => home.api.refresh())
  assert.equal(home.mount.hidden, true)

  const article = createRuntime({ failing: true, pathname: '/blog/posts/a/' })
  assert.doesNotThrow(() => {
    article.update(40)
    article.advance(2000)
    article.update(99)
    article.fire('pagehide')
  })
})

test('throttles progress writes, flushes on pagehide and never saves 0%', () => {
  const runtime = createRuntime({
    pathname: '/blog/posts/b/',
    storage: { [SAVE_KEY]: record() },
    headings: [['part-1', 400], ['part-2', 1000]]
  })

  runtime.update(0)
  runtime.advance(5000)
  assert.equal(runtime.save().path, '/blog/posts/a/')

  runtime.update(10)
  runtime.update(20)
  runtime.setTop(-800)
  runtime.update(30)
  runtime.advance(999)
  assert.equal(runtime.save().path, '/blog/posts/a/')
  runtime.advance(1)

  const saved = runtime.save()
  assert.equal(saved.path, '/blog/posts/b/')
  assert.equal(saved.progress, 30)
  assert.equal(saved.title, '<b>Hello</b> World')
  assert.equal(saved.cover, '/blog/img/cover.webp')
  assert.equal(saved.anchorId, 'part-2')
  assert.equal(saved.anchorRatio, 0.04)

  runtime.update(45)
  runtime.fire('pagehide')
  assert.equal(runtime.save().progress, 45)
  assert.equal(runtime.timers.size, 0)
})

test('completing the saved article clears it once and greets one homepage return', () => {
  const session = storage()
  const runtime = createRuntime({
    pathname: '/blog/posts/a/',
    session,
    storage: { [SAVE_KEY]: record(), pixelAnim: 'off', 'toyboxClearedPosts:v1': '{}' }
  })
  runtime.update(60)
  runtime.update(98)
  runtime.update(100)
  runtime.advance(5000)
  assert.equal(runtime.save(), null)
  assert.equal(runtime.local.values.get('pixelAnim'), 'off')
  assert.ok(runtime.local.values.has('toyboxClearedPosts:v1'))
  assert.deepEqual(runtime.events.map(event => event.type), ['toybox:reading-complete'])

  const other = createRuntime({ pathname: '/blog/posts/b/', storage: { [SAVE_KEY]: record() } })
  other.update(99)
  assert.equal(other.save().path, '/blog/posts/a/')

  const home = createRuntime({ session })
  home.api.refresh()
  home.api.refresh()
  assert.equal(home.events.length, 1)
  assert.equal(home.events[0].type, 'toybox:reading-complete')
  assert.equal(home.events[0].detail.returned, true)
  assert.equal(home.events[0].detail.path, '/blog/posts/a/')
})

test('restores only explicit resume links on the matching article', async () => {
  const storage = { [SAVE_KEY]: record({ anchorId: 'part-2', anchorRatio: 0.5 }) }
  const headings = [['part-1', 400], ['part-2', 1000]]

  const plain = createRuntime({ pathname: '/blog/posts/a/', storage, headings })
  plain.update(0)
  await plain.settle()
  assert.deepEqual(plain.scrolls, [])

  const other = createRuntime({ pathname: '/blog/posts/b/', hash: '#toybox-resume', storage, headings })
  other.update(0)
  await other.settle()
  assert.deepEqual(other.scrolls, [])
  assert.deepEqual(other.replaced, ['/blog/posts/b/'])

  const resumed = createRuntime({ pathname: '/blog/posts/a/', hash: '#toybox-resume', storage, headings })
  resumed.update(0)
  resumed.update(30)
  await resumed.settle()
  assert.deepEqual(resumed.scrolls, [2220])
  assert.deepEqual(resumed.replaced, ['/blog/posts/a/'])
  resumed.advance(5000)
  assert.equal(resumed.save().progress, 42)

  const fallback = createRuntime({ pathname: '/blog/posts/a', hash: '#toybox-resume', storage: { [SAVE_KEY]: record({ progress: 50 }) } })
  fallback.update(0)
  await fallback.settle()
  assert.deepEqual(fallback.scrolls, [1445])

  const interrupted = createRuntime({ pathname: '/blog/posts/a/', hash: '#toybox-resume', storage })
  interrupted.update(0)
  interrupted.fire('wheel')
  await interrupted.settle()
  assert.deepEqual(interrupted.scrolls, [])
  interrupted.update(55)
  interrupted.advance(1000)
  assert.equal(interrupted.save().progress, 55)

  const anchored = createRuntime({ pathname: '/blog/posts/a/', hash: '#toybox-resume', storage })
  anchored.update(0)
  anchored.context.location.hash = '#part-1'
  await anchored.settle()
  assert.deepEqual(anchored.scrolls, [])
  assert.deepEqual(anchored.replaced, [])
})

test('fresh homepage mounts pick up the save, clear only it and follow other tabs', () => {
  const runtime = createRuntime({ storage: { [SAVE_KEY]: record(), pixelAnim: 'on', 'toyboxClearedPosts:v1': '{"version":1,"posts":{}}' } })
  runtime.api.refresh()
  assert.equal(runtime.mount.hidden, false)

  runtime.replaceMount()
  assert.equal(runtime.mount.hidden, true)
  runtime.api.refresh()
  assert.equal(runtime.mount.hidden, false)
  assert.equal(runtime.parts.title.textContent, 'Saved quest')
  assert.equal(runtime.parts.cover.hidden, true)

  runtime.parts.clear.listeners.get('click')({ preventDefault() {} })
  assert.equal(runtime.save(), null)
  assert.equal(runtime.local.values.get('pixelAnim'), 'on')
  assert.ok(runtime.local.values.has('toyboxClearedPosts:v1'))
  assert.equal(runtime.mount.hidden, true)
  assert.equal(runtime.focused, runtime.heading)
  assert.equal(runtime.heading.getAttribute('tabindex'), '-1')

  runtime.local.setItem(SAVE_KEY, record({ title: 'From another tab' }))
  runtime.fire('storage', { key: SAVE_KEY })
  assert.equal(runtime.mount.hidden, false)
  assert.equal(runtime.parts.title.textContent, 'From another tab')
  runtime.replaceMount()
  runtime.fire('pageshow')
  assert.equal(runtime.mount.hidden, false)
  assert.equal(runtime.parts.title.textContent, 'From another tab')
})
