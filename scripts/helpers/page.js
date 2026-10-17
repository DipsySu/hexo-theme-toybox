'use strict'

const { prettyUrls } = require('hexo-util')
const { IMAGE } = require('../../lib/covers')

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
  return path.includes('//') || IMAGE.test(path)
})
