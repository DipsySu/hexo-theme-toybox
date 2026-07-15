/** Register Toybox's 404 page. */

'use strict'

hexo.extend.generator.register('404', function (locals) {
  if (!hexo.theme.config.error_404.enable) return
  return {
    path: '404.html',
    layout: ['page'],
    data: {
      type: '404',
      top_img: false
    }
  }
})
