/** Apply the configured lazy-loading attributes to article images. */

'use strict'

const urlFor = require('hexo-util').url_for.bind(hexo)

// One whole <img> tag, including quoted attributes that contain ">".
const IMAGE_TAG = /<img\b(?:"[^"]*"|'[^']*'|[^"'<>])*>/ig
// The tag up to its real src attribute, never a "src=" inside a quoted value.
const IMAGE_SRC = /^(<img\b(?:"[^"]*"|'[^']*'|[^"'<>])*?\ssrc\s*=)/i
// Images that already choose native loading, or opt out, keep their src.
const OPT_OUT = /\s(?:loading\s*=|data-no-lazy(?=[\s=/>]))/i

function lazyload (htmlContent) {
  const bg = hexo.theme.config.lazyload.placeholder ? urlFor(hexo.theme.config.lazyload.placeholder) : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  return htmlContent.replace(IMAGE_TAG, tag => {
    if (OPT_OUT.test(tag.replace(/"[^"]*"|'[^']*'/g, '""'))) return tag
    return tag.replace(IMAGE_SRC, `$1 "${bg}" data-lazy-src=`)
  })
}

hexo.extend.filter.register('after_render:html', function (data) {
  const config = hexo.theme.config.lazyload
  if (!config.enable) return
  if (config.field !== 'site') return
  return lazyload.call(this, data)
})

hexo.extend.filter.register('after_post_render', data => {
  const config = hexo.theme.config.lazyload
  if (!config.enable) return
  if (config.field !== 'post') return
  data.content = lazyload.call(this, data.content)
  return data
})
