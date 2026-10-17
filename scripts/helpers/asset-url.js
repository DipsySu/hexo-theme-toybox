'use strict'

// Version local theme assets by content so unchanged files keep their URL
// (and browser cache) across deploys:
// - a file in the site source, else the theme source: md5 of its bytes;
// - a generated stylesheet or script with no source file (index.css from
//   Stylus, bundles): a fingerprint of every theme source file of that type
//   plus the merged theme config, which together decide the output;
// - anything else: one per-build value.

const { createHash, randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { URLSearchParams } = require('node:url')

const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i
const LENGTH = 10

// Memoized per generate, so `hexo server` picks up edited files.
let revisions = new Map()
let generated = new Map()
let buildRevision = randomBytes(LENGTH / 2).toString('hex')

hexo.extend.filter.register('before_generate', () => {
  revisions = new Map()
  generated = new Map()
  buildRevision = randomBytes(LENGTH / 2).toString('hex')
})

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
  return entries.filter(entry => !entry.name.startsWith('.')).flatMap(entry => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(absolute) : [absolute]
  })
}

// Theme source/css (or source/js) decides every generated file of that type.
function generatedRevision (extension) {
  if (!generated.has(extension)) {
    const directory = path.join(hexo.theme_dir, 'source', extension.slice(1))
    const files = listFiles(directory).map(file => path.relative(directory, file).split(path.sep).join('/')).sort()
    const { highlight, prismjs, stylus } = hexo.config || {}
    generated.set(extension, digest(hash => {
      files.forEach(file => hash.update(file + '\0').update(fs.readFileSync(path.join(directory, file))))
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
    let revision = ''
    for (const base of bases) {
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
