'use strict'

const { randomBytes } = require('node:crypto')

let revision = randomBytes(8).toString('hex')

// All pages in a build share one revision, including rendered Stylus assets.
hexo.extend.filter.register('before_generate', () => {
  revision = randomBytes(8).toString('hex')
})

hexo.extend.helper.register('toybox_asset', function (asset) {
  const resolved = this.url_for(asset)
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(resolved)) return resolved

  const url = new URL(resolved, 'https://toybox.invalid')
  url.searchParams.set('v', revision)
  return url.pathname + url.search + url.hash
})
