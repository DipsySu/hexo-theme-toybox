/** Select a fallback cover for Toybox article cards. */

'use strict'

hexo.extend.filter.register('before_post_render', function (data) {
  const imgTestReg = /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i
  let coverVal = data.cover

  // Hexo can reuse the same post model across incremental renders. A cover
  // assigned by this filter must stay a fallback on the next pass instead of
  // being mistaken for an author-supplied cover.
  if (data.toybox_cover_source === 'fallback') {
    coverVal = undefined
    data.cover = undefined
    delete data.cover_type
  }

  data.toybox_cover_source = coverVal === false ? 'disabled' : coverVal ? 'explicit' : 'none'

  // Add path to top_img and cover if post_asset_folder is enabled
  if (hexo.config.post_asset_folder) {
    const topImg = data.top_img
    if (topImg && topImg.indexOf('/') === -1 && imgTestReg.test(topImg)) data.top_img = data.path + topImg
    if (coverVal && coverVal.indexOf('/') === -1 && imgTestReg.test(coverVal)) {
      data.cover = data.path + coverVal
      coverVal = data.cover
    }
  }

  const fallbackCoverFn = () => {
    const theme = hexo.theme.config
    const configured = theme.cover && theme.cover.default_cover
    const homeCovers = theme.toybox && theme.toybox.home && theme.toybox.home.fallback_covers
    const covers = (Array.isArray(configured) && configured.length ? configured :
      typeof configured === 'string' && configured ? [configured] : homeCovers || [])
      .map(cover => typeof cover === 'string' ? cover : cover && (cover.src || cover.primary || cover.fallback))
      .filter(Boolean)
    if (!covers.length) return false

    const identity = String(data.path || data.slug || data.source || data.title || '')
    let hash = 2166136261
    for (let index = 0; index < identity.length; index++) {
      hash ^= identity.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return covers[(hash >>> 0) % covers.length]
  }

  if (coverVal === false) return data

  // If cover is not set, use a stable fallback derived from the post identity.
  if (!coverVal) {
    const fallbackCover = fallbackCoverFn()
    data.cover = fallbackCover
    coverVal = fallbackCover
    data.toybox_cover_source = fallbackCover ? 'fallback' : 'none'
  }

  if (coverVal) {
    if (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal)) {
      data.cover_type = 'img'
      return data
    }
  }

  return data
})
