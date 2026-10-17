'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const vm = require('node:vm')
const { compile, evaluate, read, section } = require('./helpers')

const utilsSource = read('source/js/utils.js')

function createUtils(globals = {}) {
  const appended = []
  const listeners = {}
  const element = tagName => ({
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    setAttribute(name, value) { this.attributes[name] = value },
    appendChild(child) { this.children.push(child); child.parentNode = this },
    remove() { this.removed = true }
  })
  const document = {
    readyState: 'complete',
    head: { appendChild: ele => appended.push(ele) },
    createElement: element,
    querySelectorAll: () => [],
    addEventListener(type, listener) { (listeners[type] = listeners[type] || []).push(listener) }
  }
  const context = Object.assign({ document, GLOBAL_CONFIG: {} }, globals)
  context.window = context
  vm.runInNewContext(utilsSource + '\nthis.btf = btf', context)
  return { appended, btf: context.btf, context, element, listeners }
}

test('loadScript and loadCSS fetch each URL once and settle instead of throwing', async () => {
  const { appended, btf } = createUtils()
  const first = btf.loadScript('https://cdn.example/a.js')
  assert.equal(btf.loadScript('https://cdn.example/a.js'), first)
  assert.equal(appended.length, 1)
  assert.equal(appended[0].tagName, 'SCRIPT')
  assert.equal(appended[0].src, 'https://cdn.example/a.js')
  assert.equal(appended[0].async, true)
  appended[0].onload()
  await first

  const css = btf.loadCSS('https://cdn.example/a.css')
  assert.equal(appended[1].rel, 'stylesheet')
  assert.equal(appended[1].href, 'https://cdn.example/a.css')
  appended[1].onerror()
  await assert.rejects(css, /Failed to load https:\/\/cdn\.example\/a\.css/)
  assert.equal(appended[1].removed, true)

  // a failed URL is forgotten, so it can be retried later
  btf.loadCSS('https://cdn.example/a.css')
  assert.equal(appended.length, 3)
})

function lightboxImages(element, count) {
  return Array.from({ length: count }, (_, index) => {
    const parent = element('p')
    const img = { dataset: { lazySrc: `/img/${index}.png` }, src: 'data:image/gif;base64,', title: '', alt: `Shot ${index}`, parentNode: parent }
    parent.insertBefore = (wrapper, child) => { child.parentNode = wrapper }
    return img
  })
}

test('lightbox loads Fancybox only for pages with images and binds it once', async () => {
  const binds = []
  const lightbox = { css: 'https://cdn.example/fancybox.css', js: 'https://cdn.example/fancybox.js' }
  const { appended, btf, element } = createUtils({ GLOBAL_CONFIG: { lightbox }, Fancybox: { bind: (...args) => binds.push(args) } })

  btf.loadLightbox([])
  assert.equal(appended.length, 0)
  assert.equal(btf.lightboxReady, undefined)

  const images = lightboxImages(element, 2)
  btf.loadLightbox(images)
  btf.loadLightbox(images)
  assert.deepEqual(appended.map(ele => ele.tagName), ['LINK', 'SCRIPT'])
  assert.equal(images[0].parentNode.tagName, 'A')
  assert.equal(images[0].parentNode.attributes.href, '/img/0.png')
  assert.equal(images[1].parentNode.attributes['data-caption'], 'Shot 1')

  appended.forEach(ele => ele.onload())
  await btf.lightboxReady
  assert.equal(binds.length, 1)
  assert.equal(binds[0][0], '[data-fancybox]')
})

test('an image clicked while Fancybox is loading opens in the lightbox once it is ready', async () => {
  const lightbox = { css: 'https://cdn.example/fancybox.css', js: 'https://cdn.example/fancybox.js' }
  const { appended, btf, element, listeners } = createUtils({ GLOBAL_CONFIG: { lightbox }, Fancybox: { bind() {} } })
  const images = lightboxImages(element, 1)
  btf.loadLightbox(images)
  const link = images[0].parentNode
  const opened = []
  link.click = () => opened.push(link.attributes.href)
  let prevented = 0
  const click = (extra = {}) => listeners.click.forEach(listener => listener(Object.assign({
    button: 0,
    target: { closest: selector => selector === 'a[data-fancybox]' ? link : null },
    preventDefault() { prevented++ }
  }, extra)))

  click({ metaKey: true })
  assert.equal(prevented, 0, 'modified clicks keep their browser behaviour')
  click()
  assert.equal(prevented, 1, 'an early click does not leave the article')
  assert.deepEqual(opened, [])

  appended.forEach(ele => ele.onload())
  await btf.lightboxReady
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(opened, ['/img/0.png'], 'the held click is replayed into Fancybox')

  click()
  assert.equal(prevented, 1, 'clicks pass straight to Fancybox once it is bound')
})

test('lightbox degrades to plain image links when Fancybox cannot load', async () => {
  const lightbox = { css: 'https://cdn.example/fancybox.css', js: 'https://cdn.example/fancybox.js' }
  const { appended, btf, element } = createUtils({ GLOBAL_CONFIG: { lightbox } })
  const images = lightboxImages(element, 1)
  assert.doesNotThrow(() => btf.loadLightbox(images))
  appended[1].onerror()
  appended[0].onload()
  await btf.lightboxReady
  assert.equal(images[0].parentNode.attributes['data-fancybox'], 'gallery')

  const disabled = createUtils({ GLOBAL_CONFIG: { lightbox: null } })
  disabled.btf.loadLightbox(lightboxImages(disabled.element, 1))
  assert.equal(disabled.appended.length, 0)
})

test('lazyload fallback shows real sources and stands in for later update() calls', () => {
  const images = []
  const makeImage = src => {
    const img = { dataset: { lazySrc: src }, src: 'data:image/gif;base64,', removeAttribute(name) { if (name === 'data-lazy-src') delete this.dataset.lazySrc } }
    images.push(img)
    return img
  }
  const { btf, context } = createUtils()
  context.document.querySelectorAll = () => images.filter(img => img.dataset.lazySrc)
  makeImage('/cover.png')
  btf.lazyloadFallback()
  assert.equal(images[0].src, '/cover.png')
  assert.equal(images[0].loading, 'lazy')
  assert.equal(images[0].dataset.lazySrc, undefined)

  makeImage('/later.png')
  context.lazyLoadInstance.update()
  assert.equal(images[1].src, '/later.png')
})

test('contents and anchors tolerate pages that enable the TOC without rendering #card-toc', () => {
  const source = section('source/js/main.js', '  const scrollFnToDo = function () {', '  const rightSideFn = {')
  const listeners = []
  const article = { querySelectorAll: () => [] }
  const run = isAnchor => {
    const context = {
      GLOBAL_CONFIG: { isAnchor, percent: { toc: true } },
      GLOBAL_CONFIG_SITE: { isToc: true },
      document: { getElementById: id => id === 'article-container' ? article : null },
      btf: { throttle: fn => fn, getScrollPercent: () => { throw new Error('no TOC percentage to update') } }
    }
    context.window = Object.assign(context, { scrollY: 120, addEventListener: (type, fn) => listeners.push([type, fn]) })
    evaluate(source, context, 'scrollFnToDo()')
    return context
  }

  assert.equal(run(false).mobileToc, undefined)
  assert.equal(listeners.length, 0)
  const withAnchor = run(true)
  assert.equal(withAnchor.mobileToc, undefined)
  assert.doesNotThrow(() => withAnchor.tocScrollFn())
})

test('rightside visibility follows scroll state without probing computed styles', () => {
  const writes = []
  const classes = new Set()
  const rightside = { style: { set cssText(value) { writes.push(value) } } }
  const header = { classList: { contains: name => classes.has(name), add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)) } }
  let onScroll
  const context = {
    GLOBAL_CONFIG: { percent: { rightside: false } },
    document: { body: { scrollHeight: 4000 }, documentElement: { scrollTop: 0 }, getElementById: id => ({ rightside, 'page-header': header })[id] },
    btf: { throttle: fn => fn },
    innerHeight: 800,
    scrollY: 0,
    addEventListener: (type, fn) => { onScroll = fn },
    getComputedStyle: () => { throw new Error('scroll ticks must not force style recalculation') }
  }
  context.window = context
  evaluate(section('source/js/main.js', '  const scrollFn = function () {', '  /**\n  * toc,anchor'), context, 'scrollFn()')

  const scrollTo = top => { context.scrollY = top; onScroll() }
  scrollTo(300)
  scrollTo(600)
  assert.deepEqual(writes, ['opacity: 0.8; transform: translateX(-58px)'])
  assert.ok(classes.has('nav-fixed'))
  scrollTo(0)
  assert.equal(writes.at(-1), "opacity: ''; transform: ''")
  assert.equal(classes.has('nav-fixed'), false)
  scrollTo(300)
  assert.equal(writes.length, 3)
  assert.equal(writes.at(-1), 'opacity: 0.8; transform: translateX(-58px)')
})

test('inline GLOBAL_CONFIG survives quotes, backslashes and closing script tags', () => {
  const hostile = 'It\'s "quoted" \\ </script><script>alert(1)</script>'
  const render = compile('layout/includes/head/config.pug')
  const html = render({
    theme: {
      local_search: { enable: true, preload: true, top_n_per_article: 1, unescape: false },
      toybox: { settings: { locale: { default: 'en' } } },
      fancybox: true,
      asset: { fancybox: 'https://cdn.example/fancybox.js', fancybox_css: 'https://cdn.example/fancybox.css' },
      post_meta: { page: { date_format: 'date' }, post: { date_format: 'relative' } },
      lazyload: { enable: true },
      anchor: { auto_update: false },
      photofigcaption: false,
      toc: { scroll_percent: true },
      rightside_scroll_percent: false,
      highlight_copy: true,
      highlight_lang: true,
      highlight_height_limit: false,
      highlight_shrink: false
    },
    config: { root: '/blog/', search: { path: 'search.json' }, highlight: { enable: true } },
    page: {},
    pageTitle: hostile,
    showToc: true,
    is_post: () => false,
    _p: () => hostile,
    toybox_asset: value => value
  })

  assert.equal((html.match(/<\/script>/g) || []).length, 1)
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
  const context = { window: {} }
  vm.runInNewContext(script, context)
  const config = context.window.GLOBAL_CONFIG
  assert.equal(config.root, '/blog/')
  assert.equal(config.copy.success, hostile)
  assert.equal(config.dateSuffix.month, hostile)
  assert.equal(config.localSearch.languages.hits_empty, hostile)
  assert.equal(config.toybox.locale, 'en')
  assert.deepEqual({ ...config.lightbox }, { css: 'https://cdn.example/fancybox.css', js: 'https://cdn.example/fancybox.js' })
  assert.equal(config.highlight.plugin, 'highlightjs')
  for (const key of ['Snackbar', 'copyright', 'noticeOutdate', 'runtime', 'source', 'autoDarkmode']) assert.equal(key in config, false, key)
  assert.deepEqual({ ...context.GLOBAL_CONFIG_SITE }, { title: hostile, isPost: false, isHighlightShrink: false, isToc: true })
})

test('theme scripts load in dependency order, third-party scripts never block init, home-only scripts stay on home', () => {
  const render = compile('layout/includes/additional-js.pug')
  const page = home => render({
    theme: {
      asset: { utils: '/js/utils.js', main: '/js/main.js', lazyload: 'https://cdn.example/lazyload.js', busuanzi: '//busuanzi.example/b.js' },
      lazyload: { enable: true },
      busuanzi: {},
      local_search: { enable: false }
    },
    toybox_asset: value => value,
    is_home: () => home,
    toyboxCollectionView: false
  })

  const homeHtml = page(true)
  const postHtml = page(false)
  assert.match(homeHtml, /<script async(="async")? src="https:\/\/cdn\.example\/lazyload\.js" onerror="btf\.lazyloadFallback\(\)"><\/script>/)
  // Settings before the reading save, the save before the sprites, the sprites before the controls.
  assert.match(homeHtml, /\/js\/utils\.js[\s\S]*\/js\/main\.js[\s\S]*lazyload\.js[\s\S]*toybox-settings\.js[\s\S]*toybox-save\.js[\s\S]*pixel-particles\.js[\s\S]*pixel-anim-toggle\.js/)
  assert.match(homeHtml, /\/js\/cartridge-tilt\.js/)
  assert.doesNotMatch(postHtml, /cartridge-tilt/)
  for (const html of [homeHtml, postHtml]) {
    assert.doesNotMatch(html, /fancybox|pixel-sprite-assets|typed|subtitle/i)
    assert.equal((html.match(/<script src="https:/g) || []).length, 0)
  }
})
