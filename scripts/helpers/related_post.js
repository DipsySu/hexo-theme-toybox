/** Render Toybox related-post cards using shared tags. */

'use strict'

// More shared tags first, then newer posts, then path, so tied posts keep the
// same order in every build regardless of the order Hexo loaded the sources.
function byRelevance (a, b) {
  return b.weight - a.weight || b.post.date - a.post.date || (a.post.path < b.post.path ? -1 : a.post.path > b.post.path ? 1 : 0)
}

hexo.extend.helper.register('related_posts', function (currentPost) {
  const weights = new Map()
  currentPost.tags.forEach(tag => {
    tag.posts.forEach(post => {
      if (post.path === currentPost.path) return
      const entry = weights.get(post.path)
      if (entry) entry.weight++
      else weights.set(post.path, { post, weight: 1 })
    })
  })
  if (weights.size === 0) return ''

  const config = this.theme.related_post || {}
  const limit = config.limit || 6
  const dateType = config.date_type || 'created'
  const related = [...weights.values()].sort(byRelevance).slice(0, limit)

  let result = '<div class="relatedPosts">'
  result += `<div class="headline"><i class="fas fa-thumbs-up fa-fw"></i><span>${this._p('post.recommend')}</span></div>`
  result += '<div class="relatedPosts-list">'

  related.forEach(({ post }) => {
    const cover = this.toybox_cover(post) || 'var(--default-bg-color)'
    const title = this.escape_html(post.title)
    result += `<div><a href="${this.url_for(post.path)}" title="${title}">`
    if (post.cover_type === 'img') {
      result += `<img class="cover" src="${this.url_for(cover)}" alt="cover">`
    } else {
      result += `<div class="cover" style="background: ${cover}"></div>`
    }
    const created = dateType === 'created'
    result += `<div class="content is-center"><div class="date"><i class="${created ? 'far fa-calendar-alt' : 'fas fa-history'} fa-fw"></i> ${this.date(created ? post.date : post.updated, this.config.date_format)}</div>`
    result += `<div class="title">${title}</div>`
    result += '</div></a></div>'
  })

  result += '</div></div>'
  return result
})
