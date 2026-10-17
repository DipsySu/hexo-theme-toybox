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
      'home.onThisPage': 'On this page',
      'home.library': 'Post library',
      'home.pageNumber': 'Page',
      'home.continueReading': 'Continue Reading',
      'home.resumeTitle': 'Continue reading {{title}}, {{progress}}% read',
      'home.clearSave': 'Clear reading save',
      'home.visibleRange': '{{start}}-{{end}} of {{total}} posts',
      'home.jumpPage': 'Jump to page',
      'home.pageOption': 'Page {{current}} of {{total}}',
      'home.read': 'Read Article',
      'home.readTitle': 'Read article: {{title}}',
      'home.previous': 'Previous article',
      'home.next': 'Next article',
      'home.select': 'Select article',
      'home.articles': 'Posts',
      'home.tags': 'Tags',
      'home.categories': 'Categories',
      'home.contentShelf': 'Content shelf',
      'home.articlePosition': 'Post {{current}} / {{total}}',
      'home.selectionStatus': 'Post {{current}} of {{total}} selected',
      'home.selectionEmpty': 'No selectable posts',
      'home.currentArticle': 'Current article: {{title}}',
      'home.selectIndex': 'Select post {{index}}',
      'home.cartridgePagination': 'Post cartridges, page {{current}} of {{total}}',
      'status.cleared': 'Read',
      'status.uncleared': 'Unread',
      'status.localSave': 'Local save: {{count}} posts read',
      'post.created': 'Created',
      'post.updated': 'Updated',
      'post.wordcount': 'Word count',
      'post.readingTime': 'Reading time',
      'post.minute': ' min',
      'post.pageViews': 'Post views',
      'post.tagsAndShare': 'Tags and sharing',
      'post.previous': 'Previous post',
      'post.next': 'Next post',
      'post.record': 'Record {{index}}',
      'post.recommendation': 'Pick {{index}}',
      'post.copyrightAuthor': 'Author:',
      'post.copyrightLink': 'Permalink:',
      'post.copyrightNotice': 'Copyright:',
      'post.progress': 'Reading Progress',
      'post.toc': 'Contents',
      'post.closeToc': 'Close contents',
      'post.copyCode': 'Copy code',
      'post.toggleCode': 'Expand or collapse code',
      'post.related': 'Related Posts',
      'post.cartridge': 'POST CARTRIDGE',
      'page.profile': 'Player profile',
      'page.friends': 'Linked friend sites',
      'page.screenshots': 'Game screenshot collection',
      'page.lost': 'Return to the last save point',
      'page.siteCard': 'Site card',
      'archive.recent': 'Recent {{index}}',
      'archive.timeline': 'Reading history',
      'search.title': 'Search',
      'search.close': 'Close search',
      'search.loading': 'Loading database',
      'search.error': 'Search could not load. Please try again.',
      'search.retry': 'Retry',
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
      'common.catalog': 'Catalog',
      'collection.home': 'Home',
      'collection.archives': 'Archives',
      'collection.tags': 'Tags',
      'collection.categories': 'Categories',
      'collection.breadcrumb': 'Breadcrumb',
      'collection.sections': 'Collections',
      'collection.posts': 'Posts: {{count}}',
      'collection.tagCount': 'Tags: {{count}}',
      'collection.categoryCount': 'Categories: {{count}}',
      'collection.itemLabel': '{{name}}, posts: {{count}}',
      'collection.filterTags': 'Filter tags',
      'collection.filterPlaceholder': 'Type a tag name',
      'collection.clearFilter': 'Clear filter',
      'collection.sort': 'Sort',
      'collection.sortCount': 'Most posts',
      'collection.sortName': 'Name (A–Z)',
      'collection.tagResults': '{{shown}} of {{total}} tags',
      'collection.tagAll': 'Showing all {{total}} tags',
      'collection.noTags': 'No tags match this filter.',
      'collection.resetFilter': 'Show all tags',
      'collection.emptyTags': 'No tags yet.',
      'collection.emptyCategories': 'No categories yet.',
      'collection.emptyPosts': 'No posts in this collection yet.',
      'collection.backToLibrary': 'Back to the library',
      'collection.latest': 'Latest: {{title}}',
      'collection.allPosts': 'All posts',
      'collection.allPostsOption': 'All posts ({{count}})',
      'collection.allTags': 'All tags',
      'collection.allCategories': 'All categories',
      'collection.archiveNav': 'Archive years',
      'collection.tagNav': 'Tag list',
      'collection.categoryNav': 'Category list',
      'collection.jump': 'Go to collection',
      'collection.pagination': 'Pages',
      'collection.range': '{{start}}–{{end}} of {{total}} posts',
      'collection.previousPage': 'Previous page',
      'collection.nextPage': 'Next page',
      'collection.jumpPage': 'Jump to page',
      'collection.pageOption': 'Page {{current}} of {{total}}'
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
      'home.onThisPage': '本页文章',
      'home.library': '文章库',
      'home.pageNumber': '页码',
      'home.continueReading': '继续阅读',
      'home.resumeTitle': '继续阅读《{{title}}》，已读 {{progress}}%',
      'home.clearSave': '清除阅读存档',
      'home.visibleRange': '{{start}}-{{end}} / {{total}} 篇文章',
      'home.jumpPage': '跳转到指定页',
      'home.pageOption': '第 {{current}} 页 / 共 {{total}} 页',
      'home.read': '阅读文章',
      'home.readTitle': '阅读文章：{{title}}',
      'home.previous': '选择上一篇',
      'home.next': '选择下一篇',
      'home.select': '选择文章',
      'home.articles': '文章',
      'home.tags': '标签',
      'home.categories': '分类',
      'home.contentShelf': '内容收藏架',
      'home.articlePosition': '文章 {{current}} / {{total}}',
      'home.selectionStatus': '已选择第 {{current}} 篇，共 {{total}} 篇',
      'home.selectionEmpty': '没有可选择的文章',
      'home.currentArticle': '当前文章：{{title}}',
      'home.selectIndex': '选择第 {{index}} 篇',
      'home.cartridgePagination': '文章卡带分页，第 {{current}} 页，共 {{total}} 页',
      'status.cleared': '已读',
      'status.uncleared': '未读',
      'status.localSave': '本机存档：已读完 {{count}} 篇文章',
      'post.created': '发表于',
      'post.updated': '更新于',
      'post.wordcount': '字数总计',
      'post.readingTime': '阅读时长',
      'post.minute': '分钟',
      'post.pageViews': '阅读量',
      'post.tagsAndShare': '标签与分享',
      'post.previous': '上一篇',
      'post.next': '下一篇',
      'post.record': '资料 {{index}}',
      'post.recommendation': '推荐 {{index}}',
      'post.copyrightAuthor': '文章作者：',
      'post.copyrightLink': '文章链接：',
      'post.copyrightNotice': '版权声明：',
      'post.progress': '阅读进度',
      'post.toc': '文章目录',
      'post.closeToc': '关闭目录',
      'post.copyCode': '复制代码',
      'post.toggleCode': '展开或收起代码',
      'post.related': '相关推荐',
      'post.cartridge': '文章卡带',
      'page.profile': '个人资料页',
      'page.friends': '好友联机站点',
      'page.screenshots': '游戏截图收藏',
      'page.lost': '返回存档点继续',
      'page.siteCard': '站点名片',
      'archive.recent': '最近 {{index}}',
      'archive.timeline': '阅读记录',
      'search.title': '搜索',
      'search.close': '关闭搜索',
      'search.loading': '数据库加载中',
      'search.error': '搜索暂时无法加载，请重试。',
      'search.retry': '重试',
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
      'common.catalog': '目录',
      'collection.home': '主页',
      'collection.archives': '归档',
      'collection.tags': '标签',
      'collection.categories': '分类',
      'collection.breadcrumb': '当前位置',
      'collection.sections': '收藏分区',
      'collection.posts': '{{count}} 篇文章',
      'collection.tagCount': '{{count}} 个标签',
      'collection.categoryCount': '{{count}} 个分类',
      'collection.itemLabel': '{{name}}，{{count}} 篇文章',
      'collection.filterTags': '筛选标签',
      'collection.filterPlaceholder': '输入标签名称',
      'collection.clearFilter': '清除筛选',
      'collection.sort': '排序',
      'collection.sortCount': '文章最多',
      'collection.sortName': '名称排序',
      'collection.tagResults': '显示 {{shown}} / {{total}} 个标签',
      'collection.tagAll': '显示全部 {{total}} 个标签',
      'collection.noTags': '没有符合筛选的标签。',
      'collection.resetFilter': '显示全部标签',
      'collection.emptyTags': '还没有标签。',
      'collection.emptyCategories': '还没有分类。',
      'collection.emptyPosts': '这个收藏里还没有文章。',
      'collection.backToLibrary': '返回文章库',
      'collection.latest': '最新：{{title}}',
      'collection.allPosts': '全部文章',
      'collection.allPostsOption': '全部文章（{{count}}）',
      'collection.allTags': '全部标签',
      'collection.allCategories': '全部分类',
      'collection.archiveNav': '归档年份',
      'collection.tagNav': '标签列表',
      'collection.categoryNav': '分类列表',
      'collection.jump': '切换收藏',
      'collection.pagination': '分页',
      'collection.range': '{{start}}-{{end}} / {{total}} 篇文章',
      'collection.previousPage': '上一页',
      'collection.nextPage': '下一页',
      'collection.jumpPage': '跳转到指定页',
      'collection.pageOption': '第 {{current}} 页 / 共 {{total}} 页'
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
      'home.onThisPage': '本頁文章',
      'home.library': '文章庫',
      'home.pageNumber': '頁碼',
      'home.continueReading': '繼續閱讀',
      'home.resumeTitle': '繼續閱讀《{{title}}》，已讀 {{progress}}%',
      'home.clearSave': '清除閱讀存檔',
      'home.visibleRange': '{{start}}-{{end}} / {{total}} 篇文章',
      'home.jumpPage': '跳轉到指定頁',
      'home.pageOption': '第 {{current}} 頁 / 共 {{total}} 頁',
      'home.read': '閱讀文章',
      'home.readTitle': '閱讀文章：{{title}}',
      'home.previous': '選擇上一篇',
      'home.next': '選擇下一篇',
      'home.select': '選擇文章',
      'home.articles': '文章',
      'home.tags': '標籤',
      'home.categories': '分類',
      'home.contentShelf': '內容收藏架',
      'home.articlePosition': '文章 {{current}} / {{total}}',
      'home.selectionStatus': '已選擇第 {{current}} 篇，共 {{total}} 篇',
      'home.selectionEmpty': '沒有可選擇的文章',
      'home.currentArticle': '目前文章：{{title}}',
      'home.selectIndex': '選擇第 {{index}} 篇',
      'home.cartridgePagination': '文章卡帶分頁，第 {{current}} 頁，共 {{total}} 頁',
      'status.cleared': '已讀',
      'status.uncleared': '未讀',
      'status.localSave': '本機存檔：已讀完 {{count}} 篇文章',
      'post.created': '發表於',
      'post.updated': '更新於',
      'post.wordcount': '字數總計',
      'post.readingTime': '閱讀時長',
      'post.minute': '分鐘',
      'post.pageViews': '閱讀量',
      'post.tagsAndShare': '標籤與分享',
      'post.previous': '上一篇',
      'post.next': '下一篇',
      'post.record': '資料 {{index}}',
      'post.recommendation': '推薦 {{index}}',
      'post.copyrightAuthor': '文章作者：',
      'post.copyrightLink': '文章連結：',
      'post.copyrightNotice': '版權聲明：',
      'post.progress': '閱讀進度',
      'post.toc': '文章目錄',
      'post.closeToc': '關閉目錄',
      'post.copyCode': '複製程式碼',
      'post.toggleCode': '展開或收起程式碼',
      'post.related': '相關推薦',
      'post.cartridge': '文章卡帶',
      'page.profile': '個人資料頁',
      'page.friends': '好友聯機站點',
      'page.screenshots': '遊戲截圖收藏',
      'page.lost': '返回存檔點繼續',
      'page.siteCard': '站點名片',
      'archive.recent': '最近 {{index}}',
      'archive.timeline': '閱讀記錄',
      'search.title': '搜尋',
      'search.close': '關閉搜尋',
      'search.loading': '資料庫載入中',
      'search.error': '搜尋暫時無法載入，請重試。',
      'search.retry': '重試',
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
      'common.catalog': '目錄',
      'collection.home': '主頁',
      'collection.archives': '歸檔',
      'collection.tags': '標籤',
      'collection.categories': '分類',
      'collection.breadcrumb': '目前位置',
      'collection.sections': '收藏分區',
      'collection.posts': '{{count}} 篇文章',
      'collection.tagCount': '{{count}} 個標籤',
      'collection.categoryCount': '{{count}} 個分類',
      'collection.itemLabel': '{{name}}，{{count}} 篇文章',
      'collection.filterTags': '篩選標籤',
      'collection.filterPlaceholder': '輸入標籤名稱',
      'collection.clearFilter': '清除篩選',
      'collection.sort': '排序',
      'collection.sortCount': '文章最多',
      'collection.sortName': '名稱排序',
      'collection.tagResults': '顯示 {{shown}} / {{total}} 個標籤',
      'collection.tagAll': '顯示全部 {{total}} 個標籤',
      'collection.noTags': '沒有符合篩選的標籤。',
      'collection.resetFilter': '顯示全部標籤',
      'collection.emptyTags': '還沒有標籤。',
      'collection.emptyCategories': '還沒有分類。',
      'collection.emptyPosts': '這個收藏裡還沒有文章。',
      'collection.backToLibrary': '返回文章庫',
      'collection.latest': '最新：{{title}}',
      'collection.allPosts': '全部文章',
      'collection.allPostsOption': '全部文章（{{count}}）',
      'collection.allTags': '全部標籤',
      'collection.allCategories': '全部分類',
      'collection.archiveNav': '歸檔年份',
      'collection.tagNav': '標籤列表',
      'collection.categoryNav': '分類列表',
      'collection.jump': '切換收藏',
      'collection.pagination': '分頁',
      'collection.range': '{{start}}-{{end}} / {{total}} 篇文章',
      'collection.previousPage': '上一頁',
      'collection.nextPage': '下一頁',
      'collection.jumpPage': '跳轉到指定頁',
      'collection.pageOption': '第 {{current}} 頁 / 共 {{total}} 頁'
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
      return window.localStorage.getItem(key) || undefined
    } catch (error) {
      return undefined
    }
  }

  function writeStorage (key, value) {
    try {
      window.localStorage.setItem(key, value)
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
    var root = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/'
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
        var pathname = url.pathname
        if (root !== '/' && pathname.indexOf(root) === 0) pathname = '/' + pathname.slice(root.length)
        key = url.origin === window.location.origin ? routeKeys[pathname] : /github\.com$/i.test(url.hostname) ? 'nav.github' : ''
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
    bind(document.getElementById('readmode'), 'rightside.readMode', null, 'title')
    bind(document.getElementById('readmode'), 'rightside.readMode', null, 'aria-label')
    bind(document.getElementById('hide-aside-btn'), 'rightside.hideAside', null, 'title')
    bind(document.getElementById('hide-aside-btn'), 'rightside.hideAside', null, 'aria-label')
    var asideButton = document.getElementById('hide-aside-btn')
    if (asideButton) asideButton.setAttribute('aria-pressed', String(document.documentElement.classList.contains('hide-aside')))
    bind(document.getElementById('mobile-toc-button'), 'rightside.toc', null, 'title')
    bind(document.getElementById('mobile-toc-button'), 'rightside.toc', null, 'aria-label')
    bind(document.querySelector('.relatedPosts > .headline span'), 'post.related')
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
    updateLocaleButtons()
    document.dispatchEvent(new CustomEvent('toybox:locale-change', { detail: { locale: currentLocale } }))
  }

  function resolvedMode (mode) {
    return mode === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : mode
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
    document.documentElement.setAttribute('data-theme', resolved)
    if (persist !== false) {
      writeStorage('toybox-color-mode', currentMode)
      if (currentMode === 'auto') removeStorage('theme')
      else writeStorage('theme', currentMode)
    }
    updateModeButtons()
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
    if (!panel || !openButton) return
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true })
  else initialize()
})()
