'use strict'

// Version local theme assets by content so unchanged files keep their URL
// (and browser cache) across deploys:
// - a file in the site source, else the theme source: md5 of its bytes;
// - a stylesheet rendered from a theme Stylus entry (index.css,
//   toybox-home.css): md5 of the rendered CSS, so the URL always names the
//   bytes that are served;
// - any other generated stylesheet or script with no source file: a
//   fingerprint of every theme source file of that type plus the merged theme
//   config, which together decide the output;
// - anything else: one per-build value.

const { Buffer } = require('node:buffer')
const { createHash, randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { URLSearchParams } = require('node:url')

const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i
const LENGTH = 10

// Memoized per generate, so `hexo server` picks up edited files.
let revisions = new Map()
let generated = new Map()
let rendered = new Map()
let buildRevision = randomBytes(LENGTH / 2).toString('hex')

hexo.extend.filter.register('before_generate', () => {
  revisions = new Map()
  generated = new Map()
  rendered = new Map()
  buildRevision = randomBytes(LENGTH / 2).toString('hex')
  return renderStylusEntries()
})

// Render each theme Stylus entry once up front and version it by its output.
// An incremental `hexo generate` only re-renders a Stylus route when the entry
// file itself changed, so a config or partial edit would otherwise leave the
// old CSS in public/ under a URL that promises the new one. Removing the stale
// file makes Hexo write the fresh render.
async function renderStylusEntries () {
  if (!hexo.theme_dir || !hexo.render || typeof hexo.render.render !== 'function') return
  const directory = path.join(hexo.theme_dir, 'source', 'css')
  let names
  try {
    names = fs.readdirSync(directory).filter(name => name.endsWith('.styl') && !name.startsWith('_'))
  } catch {
    return
  }
  await Promise.all(names.map(async name => {
    const route = 'css/' + name.replace(/\.styl$/, '.css')
    let css
    try {
      css = await hexo.render.render({ path: path.join(directory, name) })
    } catch {
      return
    }
    rendered.set(route, digest(hash => hash.update(css)))
    const published = hexo.public_dir && path.join(hexo.public_dir, route)
    const current = published && readFile(published)
    if (current && !current.equals(Buffer.from(css))) {
      try { fs.unlinkSync(published) } catch {}
    }
  }))
}

function digest (update) {
  const hash = createHash('md5')
  update(hash)
  return hash.digest('hex').slice(0, LENGTH)
}

function inside (base, relative) {
  const file = path.resolve(base, relative)
  return file.startsWith(path.resolve(base) + path.sep) ? file : ''
}

function readFile (file) {
  try {
    return fs.statSync(file).isFile() ? fs.readFileSync(file) : null
  } catch {
    return null
  }
}

function listFiles (directory) {
  let entries
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    return []
  }
  // Hidden files (.DS_Store and friends) are never published.
  // Follow symlinks like Hexo does when it publishes the theme source.
  return entries.filter(entry => !entry.name.startsWith('.')).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    let stat
    try {
      stat = fs.statSync(absolute)
    } catch {
      return []
    }
    return stat.isDirectory() ? listFiles(absolute) : stat.isFile() ? [absolute] : []
  })
}

// Theme source/css (or source/js) decides every generated file of that type.
function generatedRevision (extension) {
  if (!generated.has(extension)) {
    const directory = path.join(hexo.theme_dir, 'source', extension.slice(1))
    const files = listFiles(directory).map(file => path.relative(directory, file).split(path.sep).join('/')).sort()
    const { highlight, prismjs, stylus } = hexo.config || {}
    generated.set(extension, digest(hash => {
      files.forEach(file => {
        const content = readFile(path.join(directory, file))
        if (content) hash.update(file + '\0').update(content)
      })
      hash.update(JSON.stringify(hexo.theme.config || {}))
      hash.update(JSON.stringify({ highlight, prismjs, stylus }))
    }))
  }
  return generated.get(extension)
}

function revisionFor (pathname) {
  if (!revisions.has(pathname)) {
    let relative = pathname.replace(/^\/+/, '')
    try { relative = decodeURI(relative) } catch {}
    const bases = [hexo.source_dir, hexo.theme_dir && path.join(hexo.theme_dir, 'source')].filter(Boolean)
    let revision = rendered.get(relative) || ''
    for (const base of revision ? [] : bases) {
      const content = relative && readFile(inside(base, relative))
      if (content) {
        revision = digest(hash => hash.update(content))
        break
      }
    }
    const extension = path.extname(relative).toLowerCase()
    if (!revision && (extension === '.css' || extension === '.js') && hexo.theme_dir) revision = generatedRevision(extension)
    revisions.set(pathname, revision || buildRevision)
  }
  return revisions.get(pathname)
}

hexo.extend.helper.register('toybox_asset', function (asset) {
  const resolved = this.url_for(asset)
  if (EXTERNAL.test(resolved)) return resolved

  const [withoutHash, ...hashParts] = resolved.split('#')
  const [pathname, ...queryParts] = withoutHash.split('?')
  const query = new URLSearchParams(queryParts.join('?'))
  query.set('v', revisionFor(String(asset).split(/[?#]/)[0]))
  return pathname + '?' + query + (hashParts.length ? '#' + hashParts.join('#') : '')
})
