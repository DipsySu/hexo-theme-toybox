'use strict'

// View models for archives, tags, and categories. Templates render the
// returned plain data with escaped Pug interpolation.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { fnv1a, fallbackCovers, pickCover } = require('../../lib/covers')

const TONES = ['coral', 'aqua', 'yellow', 'green']
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function list (query) {
  if (!query) return []
  if (Array.isArray(query)) return query
  if (typeof query.toArray === 'function') return query.toArray()
  return Array.isArray(query.data) ? query.data : []
}

function toneFor (identity) {
  return TONES[fnv1a(identity) % TONES.length]
}

function byName (a, b) {
  const name = String(a.name)
  const other = String(b.name)
  return collator.compare(name, other) || (name < other ? -1 : name > other ? 1 : 0)
}

function byCount (a, b) {
  return b.count - a.count || byName(a, b)
}

function newestFirst (a, b) {
  return Number(b.date || 0) - Number(a.date || 0)
}

function directory (value, fallback) {
  const clean = String(value || fallback).replace(/^\/+|\/+$/g, '')
  return clean ? clean + '/' : ''
}

function dateParts (date) {
  if (date && typeof date.year === 'function') return { year: date.year(), month: date.month() + 1, day: date.date() }
  const value = new Date(date)
  return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
}

function pad (value) {
  return String(value).padStart(2, '0')
}

function perPageFor (config, generator) {
  const options = config[generator] || {}
  const value = options.per_page !== undefined ? options.per_page : config.per_page !== undefined ? config.per_page : 10
  return Number(value) || 0
}

function findTaxonomy (items, path, name) {
  return items.find(item => item.path === path) || items.find(item => item.name === name)
}

function parentOf (category, known) {
  return category.parent && category.parent !== category._id && known.has(category.parent) ? category.parent : ''
}

function tagIndex (context) {
  return list(context.site.tags)
    .filter(tag => tag.length > 0)
    .map(tag => ({
      name: tag.name,
      url: context.url_for(tag.path),
      count: tag.length,
      tone: toneFor(tag.path || tag.name)
    }))
    .sort(byCount)
}

// Categories keep Hexo's own membership counts: a post filed under
// "Parent > Child" already counts once in each, so totals are never summed.
function categoryTree (context) {
  const categories = list(context.site.categories)
  const known = new Set(categories.map(category => category._id))
  const children = new Map()
  const visited = new Set()
  const theme = context.theme || {}
  const coversEnabled = !theme.cover || theme.cover.archives_enable !== false

  categories.forEach(category => {
    const parent = parentOf(category, known)
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(category)
  })

  function artwork (category) {
    const posts = list(category.posts).slice().sort(newestFirst)
    const result = { latestTitle: posts.length ? posts[0].title || '' : '', cover: '' }
    if (!coversEnabled || !posts.length) return result
    const eligible = posts.find(post => post.cover !== false && post.cover_type === 'img' && post.cover)
    let cover = eligible ? context.toybox_cover(eligible) : ''
    if (!cover && posts.some(post => post.cover !== false)) cover = pickCover(fallbackCovers(theme), category.path || category.name)
    if (cover) result.cover = context.url_for(cover)
    return result
  }

  function build (category, depth) {
    if (visited.has(category._id)) return null
    visited.add(category._id)
    const nested = (children.get(category._id) || [])
      .map(child => build(child, depth + 1))
      .filter(Boolean)
      .sort(byCount)
    if (!category.length && !nested.length) return null
    const node = {
      name: category.name,
      url: category.length ? context.url_for(category.path) : '',
      count: category.length,
      depth,
      tone: toneFor(category.path || category.name),
      children: nested
    }
    return depth === 0 ? Object.assign(node, artwork(category)) : node
  }

  const roots = (children.get('') || []).map(category => build(category, 0))
  // A cyclic parent chain has no root; keep those categories reachable.
  categories.forEach(category => {
    if (!visited.has(category._id)) roots.push(build(category, 0))
  })
  return roots.filter(Boolean).sort(byCount)
}

function countNodes (nodes) {
  return nodes.reduce((total, node) => total + (node.url ? 1 : 0) + countNodes(node.children), 0)
}

function archiveView (context, base) {
  const { page, site, config } = context
  const archive = config.archive_generator || {}
  const posts = list(site.posts)
  const years = new Map()
  let scoped = 0

  posts.forEach(post => {
    const date = dateParts(post.date)
    years.set(date.year, (years.get(date.year) || 0) + 1)
    if (page.year && date.year === Number(page.year) &&
      (!page.month || date.month === Number(page.month)) &&
      (!page.day || date.day === Number(page.day))) scoped++
  })

  const home = context.url_for(base)
  const breadcrumb = [{ key: 'collection.archives', url: home, current: !page.year }]
  if (page.year) {
    const yearPath = base + page.year + '/'
    breadcrumb.push({ label: String(page.year), url: context.url_for(yearPath), current: !page.month })
    if (page.month) {
      const monthPath = yearPath + pad(page.month) + '/'
      breadcrumb.push({ label: `${page.year}-${pad(page.month)}`, url: context.url_for(monthPath), current: !page.day })
      if (page.day) breadcrumb.push({ label: `${page.year}-${pad(page.month)}-${pad(page.day)}`, current: true })
    }
  }

  const items = [{
    key: 'collection.allPosts',
    optionKey: 'collection.allPostsOption',
    url: home,
    count: posts.length,
    depth: 0,
    current: page.year ? false : 'page'
  }]
  if (archive.yearly !== false) {
    [...years.keys()].sort((a, b) => b - a).forEach(year => {
      const current = Number(page.year) === year ? (page.month ? 'true' : 'page') : false
      items.push({ label: String(year), url: context.url_for(base + year + '/'), count: years.get(year), depth: 0, current })
      if (current && page.month) {
        const label = `${year}-${pad(page.month)}${page.day ? '-' + pad(page.day) : ''}`
        const scopePath = base + year + '/' + pad(page.month) + '/' + (page.day ? pad(page.day) + '/' : '')
        items.push({ label, url: context.url_for(scopePath), count: scoped, depth: 1, current: 'page' })
      }
    })
  }

  return {
    kind: 'archive',
    total: page.year ? scoped : posts.length,
    perPage: perPageFor(config, 'archive_generator'),
    groupByYear: !page.year,
    breadcrumb,
    rail: { labelKey: 'collection.archiveNav', items }
  }
}

function tagView (context) {
  const { page, config } = context
  const tag = findTaxonomy(list(context.site.tags), page.base, page.tag)
  const index = context.url_for(directory(config.tag_dir, 'tags'))
  const items = tagIndex(context).map(item => Object.assign(item, {
    label: item.name,
    depth: 0,
    current: tag && item.name === tag.name ? 'page' : false
  }))

  return {
    kind: 'tag',
    total: tag ? tag.length : list(page.posts).length,
    perPage: perPageFor(config, 'tag_generator'),
    groupByYear: false,
    breadcrumb: [
      { key: 'collection.tags', url: index },
      { label: page.tag, current: true }
    ],
    rail: { labelKey: 'collection.tagNav', back: { key: 'collection.allTags', url: index }, items }
  }
}

function categoryView (context) {
  const { page, config } = context
  const categories = list(context.site.categories)
  const known = new Set(categories.map(item => item._id))
  const byId = new Map(categories.map(item => [item._id, item]))
  const category = findTaxonomy(categories, page.base, page.category)
  const index = context.url_for(directory(config.category_dir, 'categories'))
  const ancestry = []
  let parent = category && byId.get(parentOf(category, known))

  while (parent && parent !== category && !ancestry.includes(parent)) {
    ancestry.unshift(parent)
    parent = byId.get(parentOf(parent, known))
  }

  const link = (item, depth, current) => ({
    label: item.name,
    url: context.url_for(item.path),
    count: item.length,
    depth,
    current
  })
  const childrenOf = parentId => categories
    .filter(item => parentOf(item, known) === parentId && (item.length > 0 || item === category))
    .map(item => ({ item, name: item.name, count: item.length }))
    .sort(byCount)
    .map(entry => entry.item)

  const items = []
  const direct = ancestry[ancestry.length - 1]
  const depth = direct ? 1 : 0
  if (direct) items.push(link(direct, 0, 'true'))
  if (category) {
    childrenOf(parentOf(category, known)).forEach(item => {
      items.push(link(item, depth, item === category ? 'page' : false))
      if (item === category) childrenOf(category._id).forEach(child => items.push(link(child, depth + 1, false)))
    })
  }

  const breadcrumb = [{ key: 'collection.categories', url: index }]
  ancestry.forEach(item => breadcrumb.push({ label: item.name, url: context.url_for(item.path) }))
  breadcrumb.push({ label: page.category, current: true })

  return {
    kind: 'category',
    total: category ? category.length : list(page.posts).length,
    perPage: perPageFor(config, 'category_generator'),
    groupByYear: false,
    breadcrumb,
    rail: { labelKey: 'collection.categoryNav', back: { key: 'collection.allCategories', url: index }, items }
  }
}

function pager (context, view) {
  const { page, config } = context
  const current = Math.max(1, Number(page.current) || 1)
  const totalPages = Math.max(1, Number(page.total) || 1)
  const count = list(page.posts).length
  const perPage = view.perPage || count
  const start = count ? (current - 1) * perPage + 1 : 0
  const paginationDir = directory(config.pagination_dir, 'page')
  const base = page.base || ''
  const pages = []

  for (let number = 1; number <= totalPages; number++) {
    pages.push({
      number,
      url: context.url_for(number === 1 ? base : base + paginationDir + number + '/'),
      current: number === current
    })
  }

  return {
    current,
    totalPages,
    start,
    end: count ? start + count - 1 : 0,
    total: view.total,
    prev: current > 1 ? pages[current - 2].url : '',
    next: current < totalPages ? pages[current].url : '',
    pages
  }
}

// toybox-settings.js holds the one copy of the UI strings the browser swaps in
// on a locale change, so server output reads the same dictionaries. Checked
// once per generate and reloaded when the file changes, so `hexo server`
// picks up edits; a broken file is reported once instead of failing pages.
const SETTINGS = path.join(__dirname, '../../source/js/toybox-settings.js')
const site = hexo
let dictionaries = null
let dictionariesTime
let checked = false
if (hexo.extend.filter) hexo.extend.filter.register('before_generate', () => { checked = false })

function loadDictionaries () {
  if (checked) return dictionaries
  checked = true
  let time
  try {
    time = fs.statSync(SETTINGS).mtimeMs
  } catch {
    return dictionaries
  }
  if (time === dictionariesTime) return dictionaries
  dictionariesTime = time
  try {
    const sandbox = { document: { readyState: 'loading', addEventListener () {} }, matchMedia: () => ({ matches: false, addEventListener () {} }) }
    sandbox.window = sandbox
    vm.runInNewContext(fs.readFileSync(SETTINGS, 'utf8'), sandbox, { filename: SETTINGS })
    dictionaries = sandbox.ToyboxSettings.dictionaries
  } catch (err) {
    if (site.log) site.log.error('toybox: cannot read UI strings from %s: %s', SETTINGS, err.message)
  }
  return dictionaries
}

// Hexo's _p order: page.lang, then config.language. A language the
// dictionaries lack can still come from a site languages/<lang>.yml; English
// is the last resort, and keys found nowhere fall back to _p.
function lookup (languages, key) {
  const dicts = loadDictionaries() || {}
  const i18n = site.theme && site.theme.i18n
  for (const name of languages) {
    if (Object.prototype.hasOwnProperty.call(dicts, name)) return dicts[name][key]
    if (i18n && i18n.list().includes(name)) {
      const value = i18n.get([name])[key]
      if (value !== undefined) return value
    }
  }
  return dicts.en && dicts.en[key]
}

hexo.extend.helper.register('toybox_text', function (key, params) {
  const text = lookup([].concat(this.page && this.page.lang, this.config && this.config.language).filter(Boolean), key)
  return String(text === undefined ? this._p(key) : text).replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return params && params[name] !== undefined && params[name] !== null ? params[name] : ''
  })
})

hexo.extend.helper.register('toybox_collection_links', function () {
  const { config } = this
  return [
    { key: 'archives', url: this.url_for(directory(config.archive_dir, 'archives')), icon: 'fas fa-archive' },
    { key: 'tags', url: this.url_for(directory(config.tag_dir, 'tags')), icon: 'fas fa-tags' },
    { key: 'categories', url: this.url_for(directory(config.category_dir, 'categories')), icon: 'fas fa-folder-open' }
  ]
})

hexo.extend.helper.register('toybox_tag_index', function () {
  return tagIndex(this)
})

hexo.extend.helper.register('toybox_category_tree', function () {
  return categoryTree(this)
})

hexo.extend.helper.register('toybox_category_total', function (tree) {
  return countNodes(tree || categoryTree(this))
})

hexo.extend.helper.register('toybox_collection_view', function () {
  const { page, config } = this
  let view
  if (page.archive) view = archiveView(this, directory(config.archive_dir, 'archives'))
  else if (page.tag) view = tagView(this)
  else if (page.category) view = categoryView(this)
  else return null
  view.breadcrumb.unshift({ key: 'collection.home', url: this.url_for('/') })
  view.pager = pager(this, view)
  return view
})
