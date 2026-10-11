'use strict'

let coverByPath
hexo.extend.filter.register('before_generate', () => { coverByPath = null })

// Spread fallback artwork across the shelf while keeping a post's cover
// identical on home, archive, detail, and related-post views in this build.
hexo.extend.helper.register('toybox_cover', function (article) {
  if (article.toybox_cover_source !== 'fallback') return article.cover
  if (!coverByPath) {
    const configured = this.theme.cover && this.theme.cover.default_cover
    const defaults = this.theme.toybox && this.theme.toybox.home && this.theme.toybox.home.fallback_covers
    const covers = (typeof configured === 'string' ? [configured] :
      Array.isArray(configured) && configured.length ? configured : defaults || [])
      .map(cover => typeof cover === 'string' ? cover : cover && (cover.src || cover.primary || cover.fallback))
      .filter(Boolean)
    coverByPath = new Map()
    if (covers.length) this.site.posts.sort('-date').forEach((post, index) => {
      coverByPath.set(post.path, covers[index % covers.length])
    })
  }
  return coverByPath.get(article.path) || article.cover
})
