'use strict'

const { fallbackCovers } = require('../../lib/covers')

let coverByPath
hexo.extend.filter.register('before_generate', () => { coverByPath = null })

// The single cover selector. Spread fallback artwork across the shelf while
// keeping a post's cover identical on home, archive, detail, related-post
// and social-preview output in this build.
hexo.extend.helper.register('toybox_cover', function (article) {
  if (article.toybox_cover_source !== 'fallback') return article.cover
  if (!coverByPath) {
    const covers = fallbackCovers(this.theme)
    coverByPath = new Map()
    // Path breaks date ties so the assignment never depends on load order.
    if (covers.length) this.site.posts.sort('-date path').forEach((post, index) => {
      coverByPath.set(post.path, covers[index % covers.length])
    })
  }
  return coverByPath.get(article.path) || article.cover
})
