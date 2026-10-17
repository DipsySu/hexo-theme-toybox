'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const yaml = require('js-yaml')

const root = path.join(__dirname, '..')
const settingsSource = fs.readFileSync(
  path.join(root, 'source/js/toybox-settings.js'),
  'utf8'
)

function createStorage(seed) {
  const values = new Map(Object.entries(seed || {}))
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
    values
  }
}

function createRuntime(options) {
  const storage = createStorage(options && options.storage)
  const attributes = Object.assign({}, options && options.attributes)
  const events = []
  const media = {
    matches: Boolean(options && options.prefersDark),
    listener: null,
    addEventListener(type, listener) {
      if (type === 'change') this.listener = listener
    }
  }
  const root = {
    nodeType: 1,
    dataset: {},
    lang: 'zh-CN',
    matches() { return false },
    querySelectorAll() { return [] },
    setAttribute(key, value) { attributes[key] = String(value) },
    getAttribute(key) { return attributes[key] || null }
  }
  const document = {
    nodeType: 9,
    readyState: 'complete',
    body: {},
    documentElement: root,
    getElementById() { return null },
    querySelector() { return null },
    querySelectorAll() { return [] },
    addEventListener() {},
    dispatchEvent(event) { events.push(event) }
  }
  class MutationObserver {
    disconnect() {}
    observe() {}
  }
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init && init.detail
    }
  }
  const context = {
    console,
    CustomEvent,
    document,
    localStorage: storage,
    MutationObserver,
    setTimeout,
    clearTimeout
  }
  context.window = context
  context.GLOBAL_CONFIG = {
    toybox: {
      colorMode: options && options.defaultMode || 'auto',
      locale: options && options.defaultLocale || 'zh-CN'
    }
  }
  context.matchMedia = () => media
  context.requestAnimationFrame = callback => callback()
  vm.runInNewContext(settingsSource, context, { filename: 'toybox-settings.js' })
  return { attributes, context, events, media, root, storage }
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

test('still honors the legacy theme preference key', () => {
  const runtime = createRuntime({ storage: { theme: 'dark' } })

  assert.equal(runtime.context.ToyboxSettings.getColorMode(), 'dark')
  assert.equal(runtime.attributes['data-theme'], 'dark')
})

test('keeps the three locale dictionaries in sync', () => {
  const dictionaries = createRuntime().context.ToyboxSettings.dictionaries
  const englishKeys = Object.keys(dictionaries.en).sort()

  assert.deepEqual(Object.keys(dictionaries['zh-CN']).sort(), englishKeys)
  assert.deepEqual(Object.keys(dictionaries['zh-TW']).sort(), englishKeys)
})

test('every literal i18n key the theme references exists in every locale', () => {
  const dictionaries = createRuntime().context.ToyboxSettings.dictionaries
  const files = []
  const collect = directory => fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) collect(absolute)
    else if (/\.(pug|js)$/.test(entry.name)) files.push(absolute)
  })
  ;['layout', 'scripts', 'source/js'].forEach(directory => collect(path.join(root, directory)))
  const sources = files.map(file => {
    const source = fs.readFileSync(file, 'utf8')
    if (!file.endsWith('toybox-settings.js')) return source
    return source.slice(0, source.indexOf('var dictionaries = {')) + source.slice(source.indexOf('var themeConfig'))
  }).join('\n')

  const serverCall = /(?:\b_p|\b__|\btoybox_text)\(\s*(['"`])([^'"`$]+)\1/g
  const serverKeys = new Set([...sources.matchAll(serverCall)].map(match => match[2]))
  const flatten = (value, prefix) => Object.entries(value).flatMap(([key, child]) => {
    const name = prefix ? prefix + '.' + key : key
    return child && typeof child === 'object' ? flatten(child, name) : [name]
  })
  const ymlKeys = ['default.yml', 'en.yml', 'zh-CN.yml', 'zh-TW.yml'].map(file => [file, flatten(yaml.load(fs.readFileSync(path.join(root, 'languages', file), 'utf8')))])
  assert.ok(serverKeys.size > 40)
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
