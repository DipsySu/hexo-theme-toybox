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
    if (!(theme.cover && theme.cover.default_cover)) return false
    if (!Array.isArray(theme.cover.default_cover)) return theme.cover.default_cover
    if (theme.cover.default_cover.length === 0) return false

    const identity = String(data.path || data.slug || data.source || data.title || '')
    let hash = 2166136261
    for (let index = 0; index < identity.length; index++) {
      hash ^= identity.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return theme.cover.default_cover[(hash >>> 0) % theme.cover.default_cover.length]
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
