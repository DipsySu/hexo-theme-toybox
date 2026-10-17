/** Mark Toybox posts that need fallback cover artwork. */

'use strict'

const { IMAGE, fallbackCovers, pickCover } = require('../../lib/covers')

// The toybox_cover helper chooses the artwork every template and social
// preview shows. This filter only marks the post and stores a stable
// provisional cover, so code reading page.cover still sees an image.
hexo.extend.filter.register('before_post_render', function (data) {
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
    if (topImg && topImg.indexOf('/') === -1 && IMAGE.test(topImg)) data.top_img = data.path + topImg
    if (coverVal && coverVal.indexOf('/') === -1 && IMAGE.test(coverVal)) {
      data.cover = data.path + coverVal
      coverVal = data.cover
    }
  }

  if (coverVal === false) return data

  if (!coverVal) {
    const identity = data.path || data.slug || data.source || data.title || ''
    const fallbackCover = pickCover(fallbackCovers(hexo.theme.config), identity) || false
    data.cover = fallbackCover
    coverVal = fallbackCover
    data.toybox_cover_source = fallbackCover ? 'fallback' : 'none'
  }

  if (coverVal && (coverVal.indexOf('//') !== -1 || IMAGE.test(coverVal))) data.cover_type = 'img'

  return data
})
