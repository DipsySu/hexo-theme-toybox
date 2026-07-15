'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const settingsSource = fs.readFileSync(
  path.join(__dirname, '../source/js/toybox-settings.js'),
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
  const attributes = {}
  const properties = {}
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
    style: { setProperty(key, value) { properties[key] = value } },
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
  context.activateDarkMode = () => root.setAttribute('data-theme', 'dark')
  context.activateLightMode = () => root.setAttribute('data-theme', 'light')
  vm.runInNewContext(settingsSource, context, { filename: 'toybox-settings.js' })
  return { attributes, context, events, media, properties, root, storage }
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

test('keeps the three locale dictionaries in sync', () => {
  const dictionaries = createRuntime().context.ToyboxSettings.dictionaries
  const englishKeys = Object.keys(dictionaries.en).sort()

  assert.deepEqual(Object.keys(dictionaries['zh-CN']).sort(), englishKeys)
  assert.deepEqual(Object.keys(dictionaries['zh-TW']).sort(), englishKeys)
})
