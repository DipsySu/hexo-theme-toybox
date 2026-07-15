;(function () {
  'use strict'

  var dictionaries = {
    en: {
      'settings.open': 'Appearance and language',
      'settings.title': 'Settings',
      'settings.close': 'Close settings',
      'settings.color': 'Color mode',
      'settings.language': 'Language',
      'settings.tools': 'Quick controls',
      'mode.light': 'Light',
      'mode.dark': 'Dark',
      'mode.auto': 'Auto',
      'locale.en': 'English',
      'locale.zh-CN': 'Simplified',
      'locale.zh-TW': 'Traditional',
      'nav.home': 'Home',
      'nav.archives': 'Archives',
      'nav.tags': 'Tags',
      'nav.categories': 'Categories',
      'nav.github': 'GitHub',
      'nav.search': 'Search',
      'home.recent': 'Recent Posts',
      'home.current': 'Selected',
      'home.pageCurrent': 'Page Pick',
      'home.read': 'Read Article',
      'home.readTitle': 'Read article: {{title}}',
      'home.previous': 'Previous article',
      'home.next': 'Next article',
      'home.select': 'Select article',
      'home.articles': 'Posts',
      'home.tags': 'Tags',
      'home.categories': 'Categories',
      'home.localSave': 'Local Save',
      'home.saveSlot': 'SAVE SLOT',
      'home.cartridgePage': 'POST CARTRIDGE {{current}} / {{total}}',
      'home.previousBox': 'Previous Box',
      'home.nextBox': 'Next Box',
      'home.console': 'Site console',
      'home.contentShelf': 'Content shelf',
      'home.articlePosition': 'Post {{current}} / {{total}}',
      'home.selectionStatus': 'Post {{current}} of {{total}} selected',
      'home.selectionEmpty': 'No selectable posts',
      'home.currentArticle': 'Current article: {{title}}',
      'home.latest': 'Latest posts',
      'home.carousel': 'Looping post carousel',
      'home.selectIndex': 'Select post {{index}}',
      'home.cartridgePagination': 'Post cartridges, page {{current}} of {{total}}',
      'status.cleared': 'Cleared',
      'status.uncleared': 'Unread',
      'status.localSave': 'Local save: {{count}} posts cleared',
      'post.info': 'Article Info',
      'post.words': '{{count}} words',
      'post.created': 'Created',
      'post.updated': 'Updated',
      'post.wordcount': 'Word count',
      'post.readingTime': 'Reading time',
      'post.minute': ' min',
      'post.pageViews': 'Post views',
      'post.comments': 'Comments',
      'post.tagsAndShare': 'Tags and sharing',
      'post.previous': 'Previous post',
      'post.next': 'Next post',
      'post.record': 'Record {{index}}',
      'post.recommendation': 'Pick {{index}}',
      'post.copyrightAuthor': 'Author:',
      'post.copyrightLink': 'Permalink:',
      'post.copyrightNotice': 'Copyright:',
      'post.progress': 'Reading Progress',
      'post.toc': 'Chapter Bookmarks',
      'post.related': 'Related Posts',
      'post.collectionInfo': 'Collection Info',
      'post.cartridge': 'POST CARTRIDGE',
      'post.body': 'ARTICLE BODY',
      'page.archive': 'Archive Box',
      'page.tags': 'Tag Drawer',
      'page.categories': 'Category Map',
      'page.links': 'Link Port',
      'page.gallery': 'Screenshot Cartridge',
      'page.records': '{{count}} records',
      'page.posts': '{{count}} posts',
      'page.tagCount': '{{count}} tags',
      'page.categoryCount': '{{count}} categories',
      'page.profile': 'Player profile',
      'page.friends': 'Linked friend sites',
      'page.screenshots': 'Game screenshot collection',
      'page.lost': 'Return to the last save point',
      'page.siteCard': 'Site card',
      'aside.announcement': 'Announcement',
      'aside.siteInfo': 'Site Info',
      'aside.archives': 'Archives',
      'aside.categories': 'Categories',
      'aside.tags': 'Tags',
      'aside.siteArticles': 'Posts:',
      'aside.runtime': 'Uptime:',
      'aside.wordcount': 'Total words:',
      'aside.visitors': 'Visitors:',
      'aside.views': 'Total views:',
      'aside.lastUpdate': 'Last updated:',
      'archive.recent': 'Recent {{index}}',
      'archive.title': 'Post Archive',
      'archive.categoryTitle': 'Category Index',
      'archive.tagTitle': 'Tag Index',
      'archive.overview': 'Overview',
      'archive.category': 'Category',
      'archive.tag': 'Tag',
      'archive.year': 'Year',
      'archive.entry': 'Entry {{index}}',
      'archive.categoryEntry': 'Category {{index}}',
      'archive.timeline': 'Reading history',
      'search.title': 'Search',
      'search.close': 'Close search',
      'search.loading': 'Loading database',
      'search.placeholder': 'Search posts',
      'search.empty': 'No results for: {{query}}',
      'search.stats': '{{hits}} posts found',
      'footer.framework': 'Framework',
      'footer.theme': 'Theme',
      'rightside.motionOn': 'Motion On',
      'rightside.motionOff': 'Motion Off',
      'rightside.enableMotion': 'Enable pixel motion',
      'rightside.disableMotion': 'Disable pixel motion',
      'rightside.spriteLab': 'Sprite Lab',
      'rightside.closeSpriteLab': 'Close Sprite Lab',
      'rightside.settings': 'Settings',
      'rightside.backTop': 'Back to top',
      'rightside.readMode': 'Reading mode',
      'rightside.exitReadMode': 'Exit reading mode',
      'rightside.hideAside': 'Toggle sidebar',
      'rightside.toc': 'Table of contents',
      'rightside.collapseSettings': 'Collapse settings',
      'sprite.close': 'Close Sprite Lab',
      'sprite.runtimeCount': '{{count}} runtime sprites',
      'sprite.filterAll': 'All',
      'sprite.filterRetro': 'Arcade',
      'sprite.filterCute': 'Cute',
      'sprite.filterPlatform': 'Platform',
      'sprite.filterLabel': 'Filter sprites',
      'sprite.dropHint': 'Select a sprite to send it onto the side rails',
      'sprite.preview': 'Preview sprite {{index}}',
      'sprite.previewStatus': 'Previewing #{{index}} · {{group}}',
      'sprite.groupRetro': 'Arcade',
      'sprite.groupCute': 'Cute',
      'sprite.groupPlatform': 'Platform',
      'notFound.home': 'Return Home',
      'notFound.archives': 'View Archives',
      'notFound.title': 'Page Not Found',
      'empty.title': 'Nothing loaded here yet',
      'empty.hint': 'Waiting for the next cartridge',
      'common.previousPage': 'Previous page',
      'common.nextPage': 'Next page',
      'common.page': 'Page {{page}}',
      'common.catalog': 'Catalog'
    },
    'zh-CN': {
      'settings.open': '配色与语言',
      'settings.title': '偏好设置',
      'settings.close': '关闭设置',
      'settings.color': '配色模式',
      'settings.language': '界面语言',
      'settings.tools': '快捷功能',
      'mode.light': '浅色',
      'mode.dark': '深色',
      'mode.auto': '自动',
      'locale.en': 'English',
      'locale.zh-CN': '简体中文',
      'locale.zh-TW': '繁體中文',
      'nav.home': '主页',
      'nav.archives': '归档',
      'nav.tags': '标签',
      'nav.categories': '分类',
      'nav.github': 'GitHub',
      'nav.search': '搜索',
      'home.recent': '近期文章',
      'home.current': '当前选择',
      'home.pageCurrent': '本页选择',
      'home.read': '阅读文章',
      'home.readTitle': '阅读文章：{{title}}',
      'home.previous': '选择上一篇',
      'home.next': '选择下一篇',
      'home.select': '选择文章',
      'home.articles': '文章',
      'home.tags': '标签',
      'home.categories': '分类',
      'home.localSave': '本机存档',
      'home.saveSlot': '存档槽',
      'home.cartridgePage': '文章卡带 {{current}} / {{total}}',
      'home.previousBox': '上一盒',
      'home.nextBox': '下一盒',
      'home.console': '站点控制台',
      'home.contentShelf': '内容收藏架',
      'home.articlePosition': '文章 {{current}} / {{total}}',
      'home.selectionStatus': '已选择第 {{current}} 篇，共 {{total}} 篇',
      'home.selectionEmpty': '没有可选择的文章',
      'home.currentArticle': '当前文章：{{title}}',
      'home.latest': '最新文章',
      'home.carousel': '循环文章列表',
      'home.selectIndex': '选择第 {{index}} 篇',
      'home.cartridgePagination': '文章卡带分页，第 {{current}} 页，共 {{total}} 页',
      'status.cleared': '已通关',
      'status.uncleared': '未通关',
      'status.localSave': '本机存档：已读完 {{count}} 篇文章',
      'post.info': '文章信息',
      'post.words': '字数 {{count}}',
      'post.created': '发表于',
      'post.updated': '更新于',
      'post.wordcount': '字数总计',
      'post.readingTime': '阅读时长',
      'post.minute': '分钟',
      'post.pageViews': '阅读量',
      'post.comments': '评论数',
      'post.tagsAndShare': '标签与分享',
      'post.previous': '上一篇',
      'post.next': '下一篇',
      'post.record': '资料 {{index}}',
      'post.recommendation': '推荐 {{index}}',
      'post.copyrightAuthor': '文章作者：',
      'post.copyrightLink': '文章链接：',
      'post.copyrightNotice': '版权声明：',
      'post.progress': '阅读进度',
      'post.toc': '章节书签',
      'post.related': '相关推荐',
      'post.collectionInfo': '收藏信息',
      'post.cartridge': '文章卡带',
      'post.body': '正文区域',
      'page.archive': '资料盒',
      'page.tags': '标签抽屉',
      'page.categories': '分类地图',
      'page.links': '联机端口',
      'page.gallery': '截图卡带',
      'page.records': '{{count}} 篇记录',
      'page.posts': '{{count}} 篇文章',
      'page.tagCount': '{{count}} 个标签',
      'page.categoryCount': '{{count}} 个分类',
      'page.profile': '个人资料页',
      'page.friends': '好友联机站点',
      'page.screenshots': '游戏截图收藏',
      'page.lost': '返回存档点继续',
      'page.siteCard': '站点名片',
      'aside.announcement': '公告',
      'aside.siteInfo': '网站资讯',
      'aside.archives': '归档',
      'aside.categories': '分类',
      'aside.tags': '标签',
      'aside.siteArticles': '文章数目：',
      'aside.runtime': '已运行时间：',
      'aside.wordcount': '本站总字数：',
      'aside.visitors': '本站访客数：',
      'aside.views': '本站总访问量：',
      'aside.lastUpdate': '最后更新时间：',
      'archive.recent': '最近 {{index}}',
      'archive.title': '文章归档',
      'archive.categoryTitle': '分类索引',
      'archive.tagTitle': '标签索引',
      'archive.overview': '总览',
      'archive.category': '分类',
      'archive.tag': '标签',
      'archive.year': '年份',
      'archive.entry': '条目 {{index}}',
      'archive.categoryEntry': '分类 {{index}}',
      'archive.timeline': '阅读记录',
      'search.title': '搜索',
      'search.close': '关闭搜索',
      'search.loading': '数据库加载中',
      'search.placeholder': '搜索文章',
      'search.empty': '找不到您查询的内容：{{query}}',
      'search.stats': '共找到 {{hits}} 篇文章',
      'footer.framework': '框架',
      'footer.theme': '主题',
      'rightside.motionOn': '动效开启',
      'rightside.motionOff': '动效已关闭',
      'rightside.enableMotion': '开启像素动效',
      'rightside.disableMotion': '关闭像素动效',
      'rightside.spriteLab': 'Sprite 测试台',
      'rightside.closeSpriteLab': '关闭 Sprite 测试台',
      'rightside.settings': '设置',
      'rightside.backTop': '回到顶部',
      'rightside.readMode': '阅读模式',
      'rightside.exitReadMode': '退出阅读模式',
      'rightside.hideAside': '单栏和双栏切换',
      'rightside.toc': '目录',
      'rightside.collapseSettings': '收起设置',
      'sprite.close': '关闭 Sprite 测试台',
      'sprite.runtimeCount': '{{count}} 个运行时素材',
      'sprite.filterAll': '全部',
      'sprite.filterRetro': '街机',
      'sprite.filterCute': '可爱',
      'sprite.filterPlatform': '平台',
      'sprite.filterLabel': '筛选素材',
      'sprite.dropHint': '点击素材可投放到侧边轨道',
      'sprite.preview': '预览 Sprite {{index}}',
      'sprite.previewStatus': '正在预览 #{{index}} · {{group}}',
      'sprite.groupRetro': '街机',
      'sprite.groupCute': '可爱',
      'sprite.groupPlatform': '平台',
      'notFound.home': '返回主页',
      'notFound.archives': '查看归档',
      'notFound.title': '页面走丢了',
      'empty.title': '这里还没有装入内容',
      'empty.hint': '等待下一张卡带',
      'common.previousPage': '上一页',
      'common.nextPage': '下一页',
      'common.page': '第 {{page}} 页',
      'common.catalog': '目录'
    },
    'zh-TW': {
      'settings.open': '配色與語言',
      'settings.title': '偏好設定',
      'settings.close': '關閉設定',
      'settings.color': '配色模式',
      'settings.language': '介面語言',
      'settings.tools': '快捷功能',
      'mode.light': '淺色',
      'mode.dark': '深色',
      'mode.auto': '自動',
      'locale.en': 'English',
      'locale.zh-CN': '簡體中文',
      'locale.zh-TW': '繁體中文',
      'nav.home': '主頁',
      'nav.archives': '歸檔',
      'nav.tags': '標籤',
      'nav.categories': '分類',
      'nav.github': 'GitHub',
      'nav.search': '搜尋',
      'home.recent': '近期文章',
      'home.current': '目前選擇',
      'home.pageCurrent': '本頁選擇',
      'home.read': '閱讀文章',
      'home.readTitle': '閱讀文章：{{title}}',
      'home.previous': '選擇上一篇',
      'home.next': '選擇下一篇',
      'home.select': '選擇文章',
      'home.articles': '文章',
      'home.tags': '標籤',
      'home.categories': '分類',
      'home.localSave': '本機存檔',
      'home.saveSlot': '存檔槽',
      'home.cartridgePage': '文章卡帶 {{current}} / {{total}}',
      'home.previousBox': '上一盒',
      'home.nextBox': '下一盒',
      'home.console': '站點控制台',
      'home.contentShelf': '內容收藏架',
      'home.articlePosition': '文章 {{current}} / {{total}}',
      'home.selectionStatus': '已選擇第 {{current}} 篇，共 {{total}} 篇',
      'home.selectionEmpty': '沒有可選擇的文章',
      'home.currentArticle': '目前文章：{{title}}',
      'home.latest': '最新文章',
      'home.carousel': '循環文章列表',
      'home.selectIndex': '選擇第 {{index}} 篇',
      'home.cartridgePagination': '文章卡帶分頁，第 {{current}} 頁，共 {{total}} 頁',
      'status.cleared': '已通關',
      'status.uncleared': '未通關',
      'status.localSave': '本機存檔：已讀完 {{count}} 篇文章',
      'post.info': '文章資訊',
      'post.words': '字數 {{count}}',
      'post.created': '發表於',
      'post.updated': '更新於',
      'post.wordcount': '字數總計',
      'post.readingTime': '閱讀時長',
      'post.minute': '分鐘',
      'post.pageViews': '閱讀量',
      'post.comments': '評論數',
      'post.tagsAndShare': '標籤與分享',
      'post.previous': '上一篇',
      'post.next': '下一篇',
      'post.record': '資料 {{index}}',
      'post.recommendation': '推薦 {{index}}',
      'post.copyrightAuthor': '文章作者：',
      'post.copyrightLink': '文章連結：',
      'post.copyrightNotice': '版權聲明：',
      'post.progress': '閱讀進度',
      'post.toc': '章節書籤',
      'post.related': '相關推薦',
      'post.collectionInfo': '收藏資訊',
      'post.cartridge': '文章卡帶',
      'post.body': '正文區域',
      'page.archive': '資料盒',
      'page.tags': '標籤抽屜',
      'page.categories': '分類地圖',
      'page.links': '聯機連接埠',
      'page.gallery': '截圖卡帶',
      'page.records': '{{count}} 篇記錄',
      'page.posts': '{{count}} 篇文章',
      'page.tagCount': '{{count}} 個標籤',
      'page.categoryCount': '{{count}} 個分類',
      'page.profile': '個人資料頁',
      'page.friends': '好友聯機站點',
      'page.screenshots': '遊戲截圖收藏',
      'page.lost': '返回存檔點繼續',
      'page.siteCard': '站點名片',
      'aside.announcement': '公告',
      'aside.siteInfo': '網站資訊',
      'aside.archives': '歸檔',
      'aside.categories': '分類',
      'aside.tags': '標籤',
      'aside.siteArticles': '文章數目：',
      'aside.runtime': '已運行時間：',
      'aside.wordcount': '本站總字數：',
      'aside.visitors': '本站訪客數：',
      'aside.views': '本站總瀏覽量：',
      'aside.lastUpdate': '最後更新時間：',
      'archive.recent': '最近 {{index}}',
      'archive.title': '文章歸檔',
      'archive.categoryTitle': '分類索引',
      'archive.tagTitle': '標籤索引',
      'archive.overview': '總覽',
      'archive.category': '分類',
      'archive.tag': '標籤',
      'archive.year': '年份',
      'archive.entry': '條目 {{index}}',
      'archive.categoryEntry': '分類 {{index}}',
      'archive.timeline': '閱讀記錄',
      'search.title': '搜尋',
      'search.close': '關閉搜尋',
      'search.loading': '資料庫載入中',
      'search.placeholder': '搜尋文章',
      'search.empty': '找不到您查詢的內容：{{query}}',
      'search.stats': '共找到 {{hits}} 篇文章',
      'footer.framework': '框架',
      'footer.theme': '主題',
      'rightside.motionOn': '動效開啟',
      'rightside.motionOff': '動效已關閉',
      'rightside.enableMotion': '開啟像素動效',
      'rightside.disableMotion': '關閉像素動效',
      'rightside.spriteLab': 'Sprite 測試台',
      'rightside.closeSpriteLab': '關閉 Sprite 測試台',
      'rightside.settings': '設定',
      'rightside.backTop': '回到頂部',
      'rightside.readMode': '閱讀模式',
      'rightside.exitReadMode': '離開閱讀模式',
      'rightside.hideAside': '單欄和雙欄切換',
      'rightside.toc': '目錄',
      'rightside.collapseSettings': '收起設定',
      'sprite.close': '關閉 Sprite 測試台',
      'sprite.runtimeCount': '{{count}} 個運行時素材',
      'sprite.filterAll': '全部',
      'sprite.filterRetro': '街機',
      'sprite.filterCute': '可愛',
      'sprite.filterPlatform': '平台',
      'sprite.filterLabel': '篩選素材',
      'sprite.dropHint': '點擊素材可投放到側邊軌道',
      'sprite.preview': '預覽 Sprite {{index}}',
      'sprite.previewStatus': '正在預覽 #{{index}} · {{group}}',
      'sprite.groupRetro': '街機',
      'sprite.groupCute': '可愛',
      'sprite.groupPlatform': '平台',
      'notFound.home': '返回主頁',
      'notFound.archives': '查看歸檔',
      'notFound.title': '頁面走丟了',
      'empty.title': '這裡還沒有裝入內容',
      'empty.hint': '等待下一張卡帶',
      'common.previousPage': '上一頁',
      'common.nextPage': '下一頁',
      'common.page': '第 {{page}} 頁',
      'common.catalog': '目錄'
    }
  }

  var themeConfig = (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.toybox) || {}
  var defaultMode = themeConfig.colorMode || 'auto'
  var defaultLocale = themeConfig.locale || 'zh-CN'
  var supportedModes = ['light', 'dark', 'auto']
  var supportedLocales = ['en', 'zh-CN', 'zh-TW']
  var currentMode = 'auto'
  var currentLocale = 'zh-CN'
  var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  var observer
  var queued = false

  function readStorage (key) {
    try {
      if (window.saveToLocal) return window.saveToLocal.get(key)
      return window.localStorage.getItem(key) || undefined
    } catch (error) {
      return undefined
    }
  }

  function writeStorage (key, value) {
    try {
      if (window.saveToLocal) window.saveToLocal.set(key, value, 3650)
      else window.localStorage.setItem(key, value)
    } catch (error) {}
  }

  function removeStorage (key) {
    try {
      window.localStorage.removeItem(key)
    } catch (error) {}
  }

  function normalizeMode (mode) {
    return supportedModes.indexOf(mode) !== -1 ? mode : 'auto'
  }

  function normalizeLocale (locale) {
    if (locale === 'zh_cn' || locale === 'zh-cn') return 'zh-CN'
    if (locale === 'zh_tw' || locale === 'zh-tw') return 'zh-TW'
    return supportedLocales.indexOf(locale) !== -1 ? locale : 'zh-CN'
  }

  function interpolate (text, params) {
    return String(text).replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return params && params[key] !== undefined ? params[key] : ''
    })
  }

  function t (key, params) {
    var active = dictionaries[currentLocale] || dictionaries['zh-CN']
    var fallback = dictionaries['zh-CN']
    return interpolate(active[key] || fallback[key] || key, params || {})
  }

  function readParams (el) {
    try {
      return el.dataset.toyboxI18nParams ? JSON.parse(el.dataset.toyboxI18nParams) : {}
    } catch (error) {
      return {}
    }
  }

  function translateBoundElement (el) {
    var params = readParams(el)
    if (el.dataset.toyboxI18n) {
      var text = t(el.dataset.toyboxI18n, params)
      if (el.textContent !== text) el.textContent = text
    }
    if (el.dataset.toyboxI18nTitle) {
      var title = t(el.dataset.toyboxI18nTitle, params)
      if (el.getAttribute('title') !== title) el.setAttribute('title', title)
    }
    if (el.dataset.toyboxI18nAria) {
      var aria = t(el.dataset.toyboxI18nAria, params)
      if (el.getAttribute('aria-label') !== aria) el.setAttribute('aria-label', aria)
    }
    if (el.dataset.toyboxI18nPlaceholder) {
      var placeholder = t(el.dataset.toyboxI18nPlaceholder, params)
      if (el.getAttribute('placeholder') !== placeholder) el.setAttribute('placeholder', placeholder)
    }
  }

  function translateBound (root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return
    if (root.nodeType === 1 && root.matches('[data-toybox-i18n], [data-toybox-i18n-title], [data-toybox-i18n-aria], [data-toybox-i18n-placeholder]')) {
      translateBoundElement(root)
    }
    root.querySelectorAll('[data-toybox-i18n], [data-toybox-i18n-title], [data-toybox-i18n-aria], [data-toybox-i18n-placeholder]').forEach(translateBoundElement)
  }

  function bind (el, key, params, attribute) {
    if (!el) return el
    var suffix = attribute === 'title' ? 'Title' : attribute === 'aria-label' ? 'Aria' : attribute === 'placeholder' ? 'Placeholder' : ''
    el.dataset['toyboxI18n' + suffix] = key
    if (params) el.dataset.toyboxI18nParams = JSON.stringify(params)
    translateBoundElement(el)
    return el
  }

  function translateMenus () {
    var routeKeys = {
      '/': 'nav.home',
      '/archives/': 'nav.archives',
      '/tags/': 'nav.tags',
      '/categories/': 'nav.categories'
    }
    document.querySelectorAll('#menus .menus_items a.site-page, #sidebar-menus .menus_items a.site-page').forEach(function (anchor) {
      var span = anchor.querySelector('span')
      if (!span) return
      var key
      try {
        var url = new URL(anchor.href, window.location.origin)
        key = url.origin === window.location.origin ? routeKeys[url.pathname] : /github\.com$/i.test(url.hostname) ? 'nav.github' : ''
      } catch (error) {}
      if (key) bind(span, key)
    })
    bind(document.querySelector('#search-button .search span'), 'nav.search')
    bind(document.querySelector('#search-button .search'), 'nav.search', null, 'aria-label')
    bind(document.querySelector('#search-button .search'), 'nav.search', null, 'title')
  }

  function translateSearch () {
    bind(document.querySelector('#local-search .search-dialog-title'), 'search.title')
    bind(document.querySelector('#local-search-input input'), 'search.placeholder', null, 'placeholder')
    bind(document.querySelector('#local-search .search-close-button'), 'search.close', null, 'title')
    bind(document.querySelector('#local-search .search-close-button'), 'search.close', null, 'aria-label')
    var loading = document.querySelector('#loading-database span')
    if (loading) bind(loading, 'search.loading')
    if (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.localSearch && window.GLOBAL_CONFIG.localSearch.languages) {
      window.GLOBAL_CONFIG.localSearch.languages.hits_empty = t('search.empty', { query: '${query}' })
      window.GLOBAL_CONFIG.localSearch.languages.hits_stats = t('search.stats', { hits: '${hits}' })
    }
  }

  function translateChrome () {
    translateMenus()
    translateSearch()
    bind(document.getElementById('toybox-preferences-btn'), 'settings.open', null, 'title')
    bind(document.getElementById('toybox-preferences-btn'), 'settings.open', null, 'aria-label')
    bind(document.getElementById('toybox-preferences-close'), 'settings.close', null, 'title')
    bind(document.getElementById('toybox-preferences-close'), 'settings.close', null, 'aria-label')
    bind(document.getElementById('go-up'), 'rightside.backTop', null, 'title')
    bind(document.getElementById('go-up'), 'rightside.backTop', null, 'aria-label')
    bind(document.getElementById('rightside_config'), 'rightside.settings', null, 'title')
    bind(document.getElementById('rightside_config'), 'rightside.settings', null, 'aria-label')
    bind(document.getElementById('readmode'), 'rightside.readMode', null, 'title')
    bind(document.getElementById('readmode'), 'rightside.readMode', null, 'aria-label')
    bind(document.getElementById('hide-aside-btn'), 'rightside.hideAside', null, 'title')
    bind(document.getElementById('hide-aside-btn'), 'rightside.hideAside', null, 'aria-label')
    var asideButton = document.getElementById('hide-aside-btn')
    if (asideButton) asideButton.setAttribute('aria-pressed', String(document.documentElement.classList.contains('hide-aside')))
    bind(document.getElementById('mobile-toc-button'), 'rightside.toc', null, 'title')
    bind(document.getElementById('mobile-toc-button'), 'rightside.toc', null, 'aria-label')
    bind(document.querySelector('.card-archives .item-headline span'), 'aside.archives')
    bind(document.querySelector('.card-categories .item-headline span'), 'aside.categories')
    bind(document.querySelector('.card-tags .item-headline span'), 'aside.tags')
    bind(document.querySelector('.relatedPosts > .headline span'), 'post.related')
  }

  function updateCssLabels () {
    var root = document.documentElement
    var labels = {
      '--toybox-i18n-save-slot': 'home.saveSlot',
      '--toybox-i18n-related': 'post.related',
      '--toybox-i18n-collection-info': 'post.collectionInfo',
      '--toybox-i18n-page-archive': 'page.archive',
      '--toybox-i18n-page-tags': 'page.tags',
      '--toybox-i18n-page-categories': 'page.categories',
      '--toybox-i18n-page-links': 'page.links',
      '--toybox-i18n-page-gallery': 'page.gallery',
      '--toybox-i18n-post-cartridge': 'post.cartridge',
      '--toybox-i18n-post-body': 'post.body'
    }
    Object.keys(labels).forEach(function (property) {
      root.style.setProperty(property, JSON.stringify(t(labels[property])))
    })
  }

  function updateLocaleButtons () {
    document.querySelectorAll('[data-toybox-locale]').forEach(function (button) {
      var selected = button.dataset.toyboxLocale === currentLocale
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
  }

  function applyLocale (locale, persist) {
    currentLocale = normalizeLocale(locale)
    document.documentElement.lang = currentLocale
    document.documentElement.dataset.toyboxLocale = currentLocale
    if (persist !== false) writeStorage('toybox-locale', currentLocale)
    translateBound(document)
    translateChrome()
    updateCssLabels()
    updateLocaleButtons()
    document.dispatchEvent(new CustomEvent('toybox:locale-change', { detail: { locale: currentLocale } }))
  }

  function resolvedMode (mode) {
    return mode === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : mode
  }

  function notifyThemeIntegrations (mode) {
    if (!window.themeChange) return
    Object.keys(window.themeChange).forEach(function (key) {
      try { window.themeChange[key](mode) } catch (error) {}
    })
  }

  function updateModeButtons () {
    document.querySelectorAll('[data-toybox-color-mode]').forEach(function (button) {
      var selected = button.dataset.toyboxColorMode === currentMode
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
  }

  function applyColorMode (mode, persist) {
    currentMode = normalizeMode(mode)
    var resolved = resolvedMode(currentMode)
    document.documentElement.dataset.toyboxColorMode = currentMode
    if (resolved === 'dark' && window.activateDarkMode) window.activateDarkMode()
    if (resolved === 'light' && window.activateLightMode) window.activateLightMode()
    if (persist !== false) {
      writeStorage('toybox-color-mode', currentMode)
      if (currentMode === 'auto') removeStorage('theme')
      else writeStorage('theme', currentMode)
    }
    updateModeButtons()
    notifyThemeIntegrations(resolved)
    document.dispatchEvent(new CustomEvent('toybox:color-mode-change', { detail: { mode: currentMode, resolved: resolved } }))
  }

  function setPanelOpen (open) {
    var panel = document.getElementById('toybox-preferences-panel')
    var button = document.getElementById('toybox-preferences-btn')
    if (!panel || !button) return
    panel.hidden = !open
    button.classList.toggle('is-active', open)
    button.setAttribute('aria-expanded', String(open))
    if (open) {
      positionPanel(panel, button)
      var active = panel.querySelector('button.is-active') || panel.querySelector('button')
      if (active) active.focus()
    } else {
      button.focus()
    }
  }

  function positionPanel (panel, button) {
    var viewportGap = 12
    var anchor = button.getBoundingClientRect()
    var panelWidth = panel.offsetWidth
    var left = Math.min(window.innerWidth - panelWidth - viewportGap, Math.max(viewportGap, anchor.right - panelWidth))
    var top = Math.min(window.innerHeight - panel.offsetHeight - viewportGap, anchor.bottom + 12)
    panel.style.setProperty('--toybox-preferences-left', Math.round(left) + 'px')
    panel.style.setProperty('--toybox-preferences-top', Math.max(viewportGap, Math.round(top)) + 'px')
  }

  function setupPanel () {
    var panel = document.getElementById('toybox-preferences-panel')
    var openButton = document.getElementById('toybox-preferences-btn')
    var closeButton = document.getElementById('toybox-preferences-close')
    if (!panel || !openButton || panel.dataset.toyboxBound) return
    panel.dataset.toyboxBound = 'true'
    openButton.addEventListener('click', function () { setPanelOpen(panel.hidden) })
    closeButton.addEventListener('click', function () { setPanelOpen(false) })
    panel.querySelectorAll('[data-toybox-color-mode]').forEach(function (button) {
      button.addEventListener('click', function () { applyColorMode(button.dataset.toyboxColorMode, true) })
    })
    panel.querySelectorAll('[data-toybox-locale]').forEach(function (button) {
      button.addEventListener('click', function () { applyLocale(button.dataset.toyboxLocale, true) })
    })
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setPanelOpen(false)
    })
    window.addEventListener('resize', function () {
      if (!panel.hidden) positionPanel(panel, openButton)
    })
  }

  function queueTranslation () {
    if (queued) return
    queued = true
    window.requestAnimationFrame(function () {
      queued = false
      translateBound(document)
      translateChrome()
    })
  }

  function observeDynamicUi () {
    if (observer) observer.disconnect()
    observer = new MutationObserver(function (records) {
      if (records.some(function (record) { return record.addedNodes.length })) queueTranslation()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  function initialize () {
    currentLocale = normalizeLocale(readStorage('toybox-locale') || defaultLocale)
    currentMode = normalizeMode(readStorage('toybox-color-mode') || readStorage('theme') || defaultMode)
    setupPanel()
    applyColorMode(currentMode, false)
    applyLocale(currentLocale, false)
    observeDynamicUi()
  }

  window.ToyboxSettings = {
    t: t,
    bind: bind,
    applyLocale: applyLocale,
    applyColorMode: applyColorMode,
    getLocale: function () { return currentLocale },
    getColorMode: function () { return currentMode },
    closePanel: function () { setPanelOpen(false) },
    dictionaries: dictionaries
  }

  mediaQuery.addEventListener('change', function () {
    if (currentMode === 'auto') applyColorMode('auto', false)
  })
  document.addEventListener('pjax:complete', function () {
    window.requestAnimationFrame(function () {
      setupPanel()
      applyLocale(currentLocale, false)
      updateModeButtons()
    })
  })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true })
  else initialize()
})()
