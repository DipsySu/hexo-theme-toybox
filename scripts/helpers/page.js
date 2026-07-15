'use strict'

const { prettyUrls } = require('hexo-util')

hexo.extend.helper.register('cloudTags', function (options = {}) {
  const source = options.limit > 0 ? options.source.limit(options.limit) : options.source
  const lengths = [...new Set(source.sort('length').map(tag => tag.length))]
  const maxIndex = Math.max(lengths.length - 1, 1)
  const min = options.minfontsize || 1
  const max = options.maxfontsize || min
  const unit = options.unit || 'em'

  return source.sort(options.orderby || 'name', options.order || 1).map(tag => {
    const ratio = lengths.indexOf(tag.length) / maxIndex
    const size = (min + ((max - min) * ratio)).toFixed(2)
    return `<a href="${this.url_for(tag.path)}" style="font-size:${size}${unit}">${tag.name}</a>`
  }).join('')
})

hexo.extend.helper.register('urlNoIndex', function (url = null, trailingIndex = false, trailingHtml = false) {
  return prettyUrls(url || this.url, {
    trailing_index: trailingIndex,
    trailing_html: trailingHtml
  })
})

hexo.extend.helper.register('findArchivesTitle', function (page, menu, date) {
  if (page.year) {
    const dateStr = page.month ? `${page.year}-${page.month}` : `${page.year}`
    const dateFormat = page.month ? hexo.theme.config.archive_date_format : 'YYYY'
    return date(dateStr, dateFormat)
  }

  const defaultTitle = this._p('page.archives')
  if (!menu) return defaultTitle

  for (const key in menu) {
    if (typeof menu[key] === 'string' && /\/archives\//.test(menu[key])) return key
  }

  return defaultTitle
})

hexo.extend.helper.register('isImgOrUrl', function (path) {
  if (!path) return false
  return path.includes('//') || /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i.test(path)
})
