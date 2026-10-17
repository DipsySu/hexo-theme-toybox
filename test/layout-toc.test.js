'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const pug = require('pug')

const root = path.join(__dirname, '..')
const layoutPath = path.join(root, 'layout/includes/layout.pug')
const layout = fs.readFileSync(layoutPath, 'utf8')
// The page facts computed at the top of the shared layout, without the shell.
const renderFacts = pug.compile(layout.slice(0, layout.indexOf('doctype html')) + '\n| !{JSON.stringify({ showToc, tocHtml })}\n', { filename: layoutPath })

function facts({ post = true, pageToc, aside = true, headings = true } = {}) {
  const calls = []
  const result = renderFacts({
    theme: { aside: { enable: aside, hide: false, display: {} }, toc: { post: true, number: false } },
    page: { content: headings ? '<h2 id="a">A</h2>' : '<p>text</p>', toc: pageToc },
    is_post: () => post,
    is_page: () => !post,
    is_home: () => false,
    is_archive: () => false,
    is_category: () => false,
    is_tag: () => false,
    toybox_collection_view: () => null,
    toc: (content, options) => { calls.push(options); return content.includes('<h2') ? '<ol class="toc"></ol>' : '' }
  })
  return Object.assign(JSON.parse(result), { calls })
}

test('only articles with headings get a table of contents, computed once', () => {
  const article = facts()
  assert.equal(article.showToc, true)
  assert.equal(article.tocHtml, '<ol class="toc"></ol>')
  assert.deepEqual(article.calls, [{ list_number: false }])
  assert.equal(facts({ headings: false }).showToc, false)
})

test('pages never claim a table of contents they do not render', () => {
  const page = facts({ post: false, pageToc: true })
  assert.equal(page.showToc, false)
  assert.deepEqual(page.calls, [])
})

test('front matter and the aside switch can turn the article contents off', () => {
  assert.equal(facts({ pageToc: false }).showToc, false)
  assert.equal(facts({ aside: false }).showToc, false)
  assert.equal(facts({ pageToc: false }).calls.length, 0)
})

test('the article contents card prints the precomputed list', () => {
  const html = pug.compileFile(path.join(root, 'layout/includes/post/toc.pug'))({
    tocHtml: '<ol class="toc-child"></ol>', page: {}, theme: { toc: { expand: true } }, _p: key => key
  })
  assert.match(html, /<div class="toc-content is-expand"><ol class="toc-child"><\/ol><\/div>/)
})

test('the inline page config is valid script for any title', () => {
  const render = pug.compileFile(path.join(root, 'layout/includes/head/config_site.pug'))
  const title = 'It\'s "quoted" \\ </script><script>alert(1)</script> next'
  const html = render({ pageTitle: title, showToc: false, page: {}, theme: { highlight_shrink: false }, is_post: () => true, is_home: () => false })
  const script = html.match(/<script id="config-diff">([\s\S]*)<\/script>/)[1]
  assert.doesNotMatch(script, /<\/script/i)
  assert.doesNotMatch(script, /postUpdate/)
  const context = {}
  vm.runInNewContext(script + '\nthis.site = GLOBAL_CONFIG_SITE', context)
  assert.equal(context.site.title, title)
  assert.equal(context.site.isToc, false)
  assert.equal(context.site.isPost, true)
})
