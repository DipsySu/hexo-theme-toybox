'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const yaml = require('js-yaml')
const { BOUND_SELECTOR, classList, read, settingsRuntime: createRuntime, walk } = require('./helpers')

function preferenceButton(dataset) {
  const attributes = {}
  return { tagName: 'BUTTON', dataset, attributes, classList: classList(), setAttribute(key, value) { attributes[key] = String(value) } }
}

function boundElement(dataset, children, text) {
  const attributes = {}
  return {
    nodeType: 1,
    isConnected: true,
    dataset,
    attributes,
    textContent: text || '',
    matches(selector) { return selector === BOUND_SELECTOR && Object.keys(dataset).some(key => key.startsWith('toyboxI18n')) },
    querySelectorAll(selector) { return selector === BOUND_SELECTOR ? children || [] : [] },
    getAttribute(key) { return key in attributes ? attributes[key] : null },
    setAttribute(key, value) { attributes[key] = String(value) }
  }
}

test('switches between all supported locales at runtime', () => {
  const runtime = createRuntime()
  const settings = runtime.context.ToyboxSettings

  assert.equal(settings.t('nav.home'), '主页')
  settings.applyLocale('en', true)
  assert.equal(settings.t('nav.home'), 'Home')
  assert.equal(runtime.root.lang, 'en')

  settings.applyLocale('zh_tw', true)
  assert.equal(settings.t('nav.archives'), '歸檔')
  assert.equal(runtime.root.lang, 'zh-TW')
  assert.equal(runtime.storage.getItem('toybox-locale'), 'zh-TW')
})

test('applies light, dark, and system color modes', () => {
  const runtime = createRuntime({ prefersDark: true })
  const settings = runtime.context.ToyboxSettings

  settings.applyColorMode('light', true)
  assert.equal(runtime.attributes['data-theme'], 'light')
  assert.equal(runtime.storage.getItem('theme'), 'light')

  settings.applyColorMode('dark', true)
  assert.equal(runtime.attributes['data-theme'], 'dark')
  assert.equal(runtime.storage.getItem('theme'), 'dark')

  settings.applyColorMode('auto', true)
  assert.equal(runtime.attributes['data-theme'], 'dark')
  assert.equal(runtime.storage.getItem('toybox-color-mode'), 'auto')
  assert.equal(runtime.storage.getItem('theme'), null)
})

test('re-applies color modes over a pre-painted theme without persisting', () => {
  const runtime = createRuntime({ prefersDark: true, attributes: { 'data-theme': 'dark' } })
  const settings = runtime.context.ToyboxSettings
  assert.equal(runtime.attributes['data-theme'], 'dark')

  settings.applyColorMode('light', false)
  assert.equal(runtime.attributes['data-theme'], 'light')

  settings.applyColorMode('dark', false)
  assert.equal(runtime.attributes['data-theme'], 'dark')

  settings.applyColorMode('auto', false)
  assert.equal(runtime.attributes['data-theme'], 'dark')
  assert.equal(runtime.storage.values.size, 0)
})

test('restores persisted visitor preferences', () => {
  const runtime = createRuntime({
    storage: {
      'toybox-color-mode': 'dark',
      'toybox-locale': 'en'
    }
  })

  assert.equal(runtime.context.ToyboxSettings.getColorMode(), 'dark')
  assert.equal(runtime.context.ToyboxSettings.getLocale(), 'en')
  assert.equal(runtime.attributes['data-theme'], 'dark')
  assert.equal(runtime.root.lang, 'en')
})

test('marks only the preference buttons as pressed, never the root element', () => {
  const english = preferenceButton({ toyboxLocale: 'en' })
  const chinese = preferenceButton({ toyboxLocale: 'zh-CN' })
  const dark = preferenceButton({ toyboxColorMode: 'dark' })
  const auto = preferenceButton({ toyboxColorMode: 'auto' })
  const runtime = createRuntime({ elements: [english, chinese, dark, auto] })
  const settings = runtime.context.ToyboxSettings

  settings.applyLocale('en', false)
  settings.applyColorMode('dark', false)
  assert.equal(english.classList.contains('is-active'), true)
  assert.equal(english.attributes['aria-pressed'], 'true')
  assert.equal(chinese.attributes['aria-pressed'], 'false')
  assert.equal(dark.attributes['aria-pressed'], 'true')
  assert.equal(auto.classList.contains('is-active'), false)
  assert.equal(runtime.root.dataset.toyboxLocale, 'en')
  assert.equal(runtime.root.dataset.toyboxColorMode, 'dark')
  assert.equal(runtime.root.classList.contains('is-active'), false)
  assert.equal(runtime.attributes['aria-pressed'], undefined)
})

test('still honors the legacy theme preference key', () => {
  const runtime = createRuntime({ storage: { theme: 'dark' } })

  assert.equal(runtime.context.ToyboxSettings.getColorMode(), 'dark')
  assert.equal(runtime.attributes['data-theme'], 'dark')
})

test('dynamic UI translation only visits newly added elements', () => {
  const runtime = createRuntime({ manualFrames: true, defaultLocale: 'en' })
  const observer = runtime.observers[0]
  assert.equal(runtime.observers.length, 1)
  // One deferred chrome pass after the other DOMContentLoaded handlers, then nothing.
  assert.equal(runtime.frames.length, 1)
  runtime.lookups.length = 0
  runtime.frames.shift()()
  assert.ok(runtime.lookups.includes('go-up'))
  assert.equal(observer.target, runtime.context.document.body)
  assert.equal(observer.init.childList, true)
  assert.equal(observer.init.subtree, true)
  runtime.queries.length = 0
  runtime.lookups.length = 0

  // A reading-meter or TOC percent write swaps a Text node; that must not rescan anything.
  const text = { nodeType: 3, isConnected: true }
  observer.callback([
    { type: 'characterData', target: text, addedNodes: [] },
    { type: 'childList', target: {}, addedNodes: [text] }
  ])
  assert.equal(runtime.frames.length, 0)

  const child = boundElement({ toyboxI18nAria: 'search.close' })
  const added = boundElement({ toyboxI18n: 'nav.home' }, [child], '主页')
  const detached = boundElement({ toyboxI18n: 'nav.archives' }, null, '归档')
  detached.isConnected = false
  observer.callback([{ type: 'childList', addedNodes: [text, added] }])
  observer.callback([{ type: 'childList', addedNodes: [added, detached] }])
  assert.equal(runtime.frames.length, 1)
  runtime.frames.shift()()

  assert.equal(added.textContent, 'Home')
  assert.equal(child.attributes['aria-label'], 'Close search')
  assert.equal(detached.textContent, '归档')
  assert.deepEqual(runtime.queries, [])
  assert.deepEqual(runtime.lookups, [])
})

test('switching locale still re-translates every bound element', () => {
  const heading = boundElement({ toyboxI18n: 'nav.archives' }, null, '归档')
  const runtime = createRuntime({ bound: [heading] })
  runtime.queries.length = 0

  runtime.context.ToyboxSettings.applyLocale('en', false)
  assert.equal(heading.textContent, 'Archives')
  assert.ok(runtime.queries.includes(BOUND_SELECTOR))
  assert.ok(runtime.lookups.includes('go-up'))

  runtime.context.ToyboxSettings.applyLocale('zh-TW', false)
  assert.equal(heading.textContent, '歸檔')
})

test('keeps the three locale dictionaries in sync', () => {
  const dictionaries = createRuntime().context.ToyboxSettings.dictionaries
  const englishKeys = Object.keys(dictionaries.en).sort()

  assert.deepEqual(Object.keys(dictionaries['zh-CN']).sort(), englishKeys)
  assert.deepEqual(Object.keys(dictionaries['zh-TW']).sort(), englishKeys)
})

test('every literal i18n key the theme references exists in every locale', () => {
  const dictionaries = createRuntime().context.ToyboxSettings.dictionaries
  const sources = ['layout', 'scripts', 'source/js'].flatMap(directory => walk(directory, /\.(pug|js)$/)).map(file => {
    const source = read(file)
    if (!file.endsWith('toybox-settings.js')) return source
    return source.slice(0, source.indexOf('var dictionaries = {')) + source.slice(source.indexOf('var themeConfig'))
  }).join('\n')

  // Only _p/__ read languages/*.yml; toybox_text keys are checked against the
  // dictionaries below.
  const serverCall = /(?:\b_p|\b__)\(\s*(['"`])([^'"`$]+)\1/g
  const serverKeys = new Set([...sources.matchAll(serverCall)].map(match => match[2]))
  const flatten = (value, prefix) => Object.entries(value).flatMap(([key, child]) => {
    const name = prefix ? prefix + '.' + key : key
    return child && typeof child === 'object' ? flatten(child, name) : [name]
  })
  const ymlKeys = ['default.yml', 'en.yml', 'zh-CN.yml', 'zh-TW.yml'].map(file => [file, flatten(yaml.load(read('languages/' + file)))])
  assert.ok(serverKeys.size > 25)
  ymlKeys.forEach(([file, keys]) => {
    assert.deepEqual(keys.slice().sort(), ymlKeys[0][1].slice().sort(), `${file} key set`)
    serverKeys.forEach(key => assert.ok(keys.includes(key), `${file} is missing ${key}`))
  })

  const namespaces = [...new Set(Object.keys(dictionaries.en).map(key => key.split('.')[0]))]
  const clientLiteral = new RegExp(`['"\`]((?:${namespaces.join('|')})\\.[a-z][A-Za-z]*)['"\`]`, 'g')
  const fileName = /\.(?:css|gif|html|jpe?g|js|json|md|png|svg|txt|webp|xml|ya?ml)$/
  const clientKeys = new Set([...sources.replace(serverCall, '').matchAll(clientLiteral)].map(match => match[1]).filter(key => !fileName.test(key)))
  assert.ok(clientKeys.size > 100)
  Object.entries(dictionaries).forEach(([locale, dictionary]) => {
    clientKeys.forEach(key => assert.ok(dictionary[key], `${locale} is missing ${key}`))
  })
})
