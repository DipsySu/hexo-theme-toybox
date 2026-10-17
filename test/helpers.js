'use strict'

// Shared fixtures: theme files, Hexo script loaders and the small browser
// fakes that the vm-based runtime tests are built from.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const pug = require('pug')

const root = path.join(__dirname, '..')
const file = relative => path.join(root, relative)
const read = relative => fs.readFileSync(file(relative), 'utf8')
const compile = relative => pug.compileFile(file(relative))

// Theme-relative paths of every file below `relative` whose name matches.
function walk (relative, pattern) {
  return fs.readdirSync(file(relative), { withFileTypes: true }).flatMap(entry => {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) return walk(child, pattern)
    return pattern.test(entry.name) ? [child] : []
  })
}

// The part of a theme file from the `from` marker up to the `to` marker.
function section (relative, from, to) {
  const source = read(relative)
  const start = source.indexOf(from)
  const end = source.indexOf(to, start)
  assert.ok(start >= 0 && end > start, `${relative} no longer has ${JSON.stringify(from)} before ${JSON.stringify(to)}`)
  return source.slice(start, end)
}

// Runs code in `context` and returns `expression` evaluated after it.
function evaluate (code, context, expression) {
  vm.runInNewContext(code + '\nthis.__result = ' + expression, context)
  return context.__result
}

// Runs a Hexo script the way Hexo does (a function given `hexo`) and collects
// the helpers and filters it registers.
function loadHexo (relative, hexo = {}) {
  const helpers = {}
  const filters = {}
  hexo.extend = {
    helper: { register: (name, fn) => { helpers[name] = fn } },
    filter: { register: (name, fn) => { filters[name] = fn } }
  }
  const filename = file(relative)
  const module = { exports: {} }
  vm.runInThisContext(`(function (exports, require, module, __filename, __dirname, hexo) {${read(relative)}\n})`, filename)(module.exports, createRequire(filename), module, filename, path.dirname(filename), hexo)
  return { hexo, helpers, filters }
}

function storage (seed = {}, failing = false) {
  const values = new Map(Object.entries(seed))
  const guard = () => { if (failing) throw new Error('Storage blocked') }
  return {
    values,
    getItem: key => { guard(); return values.has(key) ? values.get(key) : null },
    setItem: (key, value) => { guard(); values.set(key, String(value)) },
    removeItem: key => { guard(); values.delete(key) }
  }
}

class CustomEvent {
  constructor (type, init) {
    this.type = type
    this.detail = init && init.detail
  }
}

function classList (initial = []) {
  const names = new Set(initial)
  return {
    names,
    add: (...list) => list.forEach(name => names.add(name)),
    remove: (...list) => list.forEach(name => names.delete(name)),
    contains: name => names.has(name),
    toggle: (name, force = !names.has(name)) => { force ? names.add(name) : names.delete(name); return force }
  }
}

// With `strict`, emitting an event nobody listens for fails the test.
function eventTarget (extra, strict = false) {
  const events = new Map()
  return Object.assign({
    events,
    addEventListener (type, fn) { events.set(type, [...(events.get(type) || []), fn]) },
    removeEventListener (type, fn) { events.set(type, (events.get(type) || []).filter(other => other !== fn)) },
    emit (type, event = { type }) {
      const listeners = events.get(type) || []
      assert.ok(!strict || listeners.length, `no ${type} listener`)
      for (const fn of listeners) fn(event)
    }
  }, extra)
}

// Manual timers and animation frames; spread `globals` into a vm context.
function clock () {
  const timers = new Map()
  const frames = new Map()
  let now = 0
  let id = 0
  return {
    timers,
    frames,
    globals: {
      setTimeout: (callback, delay = 0) => { timers.set(++id, { callback, delay, at: now + delay }); return id },
      clearTimeout: key => { timers.delete(key) },
      requestAnimationFrame: callback => { frames.set(++id, callback); return id },
      cancelAnimationFrame: key => { frames.delete(key) }
    },
    advance (ms) {
      now += ms
      for (const [key, timer] of [...timers]) {
        if (timer.at > now) continue
        timers.delete(key)
        timer.callback()
      }
    },
    frame (time) {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach(callback => callback(time))
    }
  }
}

const BOUND_SELECTOR = '[data-toybox-i18n], [data-toybox-i18n-title], [data-toybox-i18n-aria], [data-toybox-i18n-placeholder]'

// Enough of a selector engine for `tag[data-a][data-b], [data-c]` lookups.
function matchesSimple (el, selector) {
  return selector.split(/\s*,\s*/).some(part => {
    const match = part.match(/^([a-z]*)((?:\[[\w-]+\])+)$/)
    if (!match || (match[1] && match[1].toUpperCase() !== el.tagName)) return false
    return match[2].slice(1, -1).split('][').every(name => {
      const key = name.replace(/^data-/, '').replace(/-(\w)/g, (_, letter) => letter.toUpperCase())
      return key in el.dataset
    })
  })
}

// source/js/toybox-settings.js running against a fake document.
function settingsRuntime (options = {}) {
  const local = storage(options.storage)
  const attributes = Object.assign({}, options.attributes)
  const events = []
  const frames = []
  const lookups = []
  const queries = []
  const observers = []
  const bound = options.bound || []
  const elements = options.elements || []
  const media = eventTarget({ matches: Boolean(options.prefersDark) })
  const root = {
    nodeType: 1,
    tagName: 'HTML',
    classList: classList(),
    dataset: {},
    lang: 'zh-CN',
    matches: () => false,
    querySelectorAll: () => [],
    setAttribute: (key, value) => { attributes[key] = String(value) },
    getAttribute: key => attributes[key] || null
  }
  const document = {
    nodeType: 9,
    readyState: 'complete',
    body: {},
    documentElement: root,
    getElementById: id => { lookups.push(id); return null },
    querySelector: selector => { lookups.push(selector); return null },
    querySelectorAll: selector => {
      queries.push(selector)
      return selector === BOUND_SELECTOR ? bound : [root].concat(elements).filter(el => matchesSimple(el, selector))
    },
    addEventListener () {},
    dispatchEvent: event => events.push(event)
  }
  class MutationObserver {
    constructor (callback) { this.callback = callback; observers.push(this) }
    disconnect () {}
    observe (target, init) { this.target = target; this.init = init }
  }
  const context = {
    console,
    CustomEvent,
    document,
    localStorage: local,
    MutationObserver,
    setTimeout,
    clearTimeout,
    GLOBAL_CONFIG: { toybox: { colorMode: options.defaultMode || 'auto', locale: options.defaultLocale || 'zh-CN' } },
    matchMedia: () => media,
    requestAnimationFrame: options.manualFrames ? callback => frames.push(callback) : callback => callback()
  }
  context.window = context
  vm.runInNewContext(read('source/js/toybox-settings.js'), context, { filename: 'toybox-settings.js' })
  return { attributes, context, events, frames, lookups, media, observers, queries, root, storage: local, settings: context.ToyboxSettings }
}

module.exports = { BOUND_SELECTOR, settingsRuntime, root, file, read, compile, walk, section, evaluate, loadHexo, storage, CustomEvent, classList, eventTarget, clock }
