;(function () {
  'use strict'

  var PALETTES = [
    { name: 'ember', bg: ['#ffb25b', '#d95f12'], cover: ['#ffd166', '#ef476f', '#7c2d12'], shadow: '#78350f', highlight: '#ffe8a3', sprite: 'ember_compass', relic: 'relic-ember.png', item: 'TRAVEL CHARM', props: ['flame', 'star_shard'] },
    { name: 'aqua', bg: ['#5eead4', '#0e7490'], cover: ['#67e8f9', '#0f766e', '#164e63'], shadow: '#164e63', highlight: '#cffafe', sprite: 'code_shrine', relic: 'relic-aqua.png', item: 'CODE RELIC', props: ['go_block', 'code_braces'] },
    { name: 'violet', bg: ['#c4b5fd', '#6d28d9'], cover: ['#c084fc', '#4f46e5', '#312e81'], shadow: '#3b0764', highlight: '#ede9fe', sprite: 'hero_sword', relic: 'relic-violet.png', item: 'MOON QUILL', props: ['moon_talisman', 'sword_relic'] },
    { name: 'rose', bg: ['#f9a8d4', '#be185d'], cover: ['#f9a8d4', '#db2777', '#831843'], shadow: '#831843', highlight: '#fce7f3', sprite: 'quill_book', relic: 'relic-rose.png', item: 'MEMORY REEL', props: ['lotus', 'film'] },
    { name: 'jade', bg: ['#86efac', '#15803d'], cover: ['#bbf7d0', '#16a34a', '#14532d'], shadow: '#14532d', highlight: '#dcfce7', sprite: 'tea_charm', relic: 'relic-jade.png', item: 'PRISM WING', props: ['xp_orb', 'bamboo_leaf'] },
    { name: 'amber', bg: ['#fcd34d', '#b45309'], cover: ['#fde68a', '#d97706', '#78350f'], shadow: '#713f12', highlight: '#fff7ed', sprite: 'scroll_code', relic: 'relic-amber.png', item: 'ALGORITHM KEY', props: ['scroll', 'gear'] },
    { name: 'vermillion', bg: ['#fca5a5', '#b91c1c'], cover: ['#fca5a5', '#dc2626', '#7f1d1d'], shadow: '#7f1d1d', highlight: '#fee2e2', sprite: 'talisman', relic: 'relic-vermillion.png', item: 'SERVER KIT', props: ['lantern', 'flame'] },
    { name: 'cobalt', bg: ['#93c5fd', '#1d4ed8'], cover: ['#93c5fd', '#2563eb', '#1e3a8a'], shadow: '#1e3a8a', highlight: '#dbeafe', sprite: 'crystal_chest', relic: 'relic-cobalt.png', item: 'CIRCUIT CORE', props: ['chest', 'sword_relic'] },
  ]

  var TAG_MATCHERS = [
    { re: /ios|swift|objective|uikit/i, palette: 7 },
    { re: /go|golang|gin|后端/i, palette: 1 },
    { re: /flutter|前端|css|javascript|js|html/i, palette: 4 },
    { re: /电影/i, palette: 3 },
    { re: /随笔/i, palette: 0 },
    { re: /夜炉诗话|散文|青春|回忆|武侠|赛博/i, palette: 2 },
    { re: /读书|读书笔记|英雄志/i, palette: 3 },
    { re: /巧篆|实用|工具|算法|python/i, palette: 5 },
  ]

  var spriteCache = {}
  var readingProgressTarget = null
  var readingProgressFrame = 0
  var readingProgressBound = false
  var CLEARED_POSTS_KEY = 'toyboxClearedPosts:v1'
  var CLEARED_POSTS_LIMIT = 200
  var clearedPostsCache = null
  var clearedStorageBound = false
  var toyboxCarouselCleanup = null
  var toyboxHistoryBound = false
  var TOYBOX_PAGE_MOTION_KEY = 'toyboxPageMotion:v1'
  var DEFAULT_HOME_FALLBACK_COVERS = [
    { src: '/img/home-toybox/featured-island.webp', fallback: '/img/home-toybox/featured-island.png' },
    { src: '/img/home-toybox/card-aqua-scene.jpg' },
    { src: '/img/home-toybox/card-yellow-scene.jpg' },
    { src: '/img/home-toybox/card-coral-scene.jpg' },
    { src: '/img/home-toybox/card-mint-wing-scene.png' }
  ]

  function rootPath(path) {
    var root = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/'
    return root.replace(/\/?$/, '/') + String(path || '').replace(/^\/+/, '')
  }

  function relativePath(path) {
    var root = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/'
    root = root.replace(/\/?$/, '/')
    if (root !== '/' && path.indexOf(root) === 0) return '/' + path.slice(root.length)
    return path
  }

  function themeAssetUrl(path) {
    if (!path) return ''
    if (/^(?:(?:[a-z][a-z\d+.-]*:)?\/\/|data:|blob:)/i.test(path)) return path
    return rootPath(path)
  }

  function homeFallbackCovers() {
    var toybox = window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.toybox || {}
    var home = toybox.home || {}
    return Array.isArray(home.fallbackCovers) && home.fallbackCovers.length
      ? home.fallbackCovers
      : DEFAULT_HOME_FALLBACK_COVERS
  }

  function toyboxText(key, params, fallback) {
    if (window.ToyboxSettings) return window.ToyboxSettings.t(key, params)
    return fallback || key
  }

  function bindToyboxText(el, key, params, attribute, fallback) {
    if (!el) return el
    if (window.ToyboxSettings) return window.ToyboxSettings.bind(el, key, params, attribute)
    var value = fallback || key
    if (attribute) el.setAttribute(attribute, value)
    else el.textContent = value
    return el
  }

  function bindToyboxDataset(el, property, key, params, fallback) {
    if (!el) return el
    el.dataset.toyboxI18nDataset = property
    el.dataset.toyboxI18nDatasetKey = key
    el.dataset.toyboxI18nDatasetParams = JSON.stringify(params || {})
    el.dataset[property] = toyboxText(key, params, fallback)
    return el
  }

  function refreshToyboxDatasets(root) {
    var scope = root || document
    scope.querySelectorAll('[data-toybox-i18n-dataset]').forEach(function(el) {
      var params = {}
      try { params = JSON.parse(el.dataset.toyboxI18nDatasetParams || '{}') } catch (error) {}
      el.dataset[el.dataset.toyboxI18nDataset] = toyboxText(el.dataset.toyboxI18nDatasetKey, params)
    })
  }

  function getSpriteDataUrl(name, scale) {
    var assets = window.PixelSpriteAssets && window.PixelSpriteAssets.sprites
    var sprite = assets && assets[name]
    if (!sprite) return ''

    var key = name + ':' + scale
    if (spriteCache[key]) return spriteCache[key]

    var canvas = document.createElement('canvas')
    canvas.width = sprite.w * scale
    canvas.height = sprite.h * scale
    var ctx = canvas.getContext('2d')
    for (var row = 0; row < sprite.h; row++) {
      for (var col = 0; col < sprite.w; col++) {
        var idx = sprite.pixels[row][col]
        if (!idx) continue
        ctx.fillStyle = sprite.palette[idx]
        ctx.fillRect(col * scale, row * scale, scale, scale)
      }
    }
    spriteCache[key] = canvas.toDataURL('image/png')
    return spriteCache[key]
  }

  function paletteForText(text, index) {
    for (var i = 0; i < TAG_MATCHERS.length; i++) {
      if (TAG_MATCHERS[i].re.test(text)) return PALETTES[TAG_MATCHERS[i].palette]
    }
    return PALETTES[index % PALETTES.length]
  }

  function applyPalette(el, palette) {
    el.dataset.pixelTheme = palette.name
    el.style.setProperty('--tag-bg-start', palette.bg[0])
    el.style.setProperty('--tag-bg-end', palette.bg[1])
    el.style.setProperty('--tag-shadow', palette.shadow)
    el.style.setProperty('--tag-highlight', palette.highlight)
    el.style.setProperty('--tag-sprite', 'url("' + getSpriteDataUrl(palette.sprite, 3) + '")')
  }

  function spriteUrl(name, scale) {
    var dataUrl = getSpriteDataUrl(name, scale)
    return dataUrl ? 'url("' + dataUrl + '")' : 'none'
  }

  function coverRelicUrl(palette) {
    return palette.relic ? 'url("' + rootPath('img/pixel-relics/' + palette.relic) + '")' : spriteUrl(palette.sprite, 6)
  }

  function ensureSprite(el, className, palette) {
    if (!getSpriteDataUrl(palette.sprite, 3) || el.querySelector('.' + className)) return
    var sprite = document.createElement('span')
    sprite.className = className
    sprite.setAttribute('aria-hidden', 'true')
    el.insertBefore(sprite, el.firstChild)
  }

  function colorTags() {
    var tags = document.querySelectorAll('.card-tag-cloud a, .tag-cloud-list a, a.tag, .article-meta__tags, .post-meta__tags')
    tags.forEach(function(el, i) {
      // 容器级早退：调色 + 5 次 setProperty 是确定性的，已处理过的标签无需重跑
      // （ensureSprite 本就幂等，此处省去重复遍历与样式写入）
      if (el.dataset.pixelTheme) return
      var p = paletteForText(el.textContent || '', i)
      applyPalette(el, p)
      ensureSprite(el, 'pixel-tag-sprite', p)
    })
  }

  function addSpan(el, className, text) {
    // 用最具体（最后一个）class 去重：prop-a / prop-b 都以 pixel-cover-prop 开头，
    // 若只看第一个 class，prop-b 会被 prop-a 命中而永不创建。
    var classes = className.split(' ')
    if (el.querySelector('.' + classes[classes.length - 1])) return
    var span = document.createElement('span')
    span.className = className
    span.setAttribute('aria-hidden', 'true')
    if (text != null) span.textContent = text
    el.appendChild(span)
  }

  function decorateCover(el, i, compact) {
    if (el.dataset.pixelCoverReady) return

    var text = [
      el.dataset.coverCategory || '',
      el.dataset.coverTag || '',
      el.dataset.coverTitle || ''
    ].join(' ').trim()
    // related / pagination 封面没有 data 属性，从最近的 a[title] 取标题
    if (!text) {
      var anchor = el.closest ? el.closest('a[title]') : null
      if (anchor) text = anchor.getAttribute('title') || ''
    }

    var p = paletteForText(text, i)
    applyPalette(el, p)
    el.style.setProperty('--cover-bg-start', p.cover[0])
    el.style.setProperty('--cover-bg-end', p.cover[1])
    el.style.setProperty('--cover-shadow', p.cover[2])
    el.style.setProperty('--cover-highlight', p.highlight)
    el.style.setProperty('--cover-sprite', coverRelicUrl(p))
    el.dataset.coverTheme = p.name
    el.dataset.coverRelic = p.item

    addSpan(el, 'pixel-cover-sprite')

    if (!compact) {
      // 完整"关卡牌"场景仅用于首页大封面
      el.style.setProperty('--cover-prop-a', spriteUrl(p.props[0], 4))
      el.style.setProperty('--cover-prop-b', spriteUrl(p.props[1], 4))
      addSpan(el, 'pixel-cover-platform')
      addSpan(el, 'pixel-cover-slot')
      addSpan(el, 'pixel-cover-prop pixel-cover-prop-a')
      addSpan(el, 'pixel-cover-prop pixel-cover-prop-b')
      addSpan(el, 'pixel-cover-badge', el.dataset.coverCategory || el.dataset.coverTag || 'LV')
      addSpan(el, 'pixel-cover-relic-label', p.item)
    }

    el.dataset.pixelCoverReady = '1'
  }

  function enhanceCovers() {
    // 首页大封面（完整场景）
    document.querySelectorAll('.pixel-cover-fallback').forEach(function(el, i) {
      decorateCover(el, i, el.classList.contains('is-compact'))
    })

    // 相关文章 / 上下篇缩略封面（紧凑模式，跳过真实图片 <img>）
    document.querySelectorAll('.relatedPosts .cover, #pagination .cover').forEach(function(el, i) {
      if (el.tagName === 'IMG') return
      if (!el.classList.contains('pixel-cover-fallback')) {
        el.classList.add('pixel-cover-fallback', 'is-compact')
      }
      decorateCover(el, i + 997, true)
    })

    // 侧栏 Recent Post 的非图片 cover 是裸 div background，补成小型像素缩略图。
    document.querySelectorAll('.card-recent-post .thumbnail > div').forEach(function(el, i) {
      el.classList.add('pixel-cover-fallback', 'is-compact', 'is-aside-thumb')
      if (!el.dataset.coverTitle) {
        var anchor = el.closest ? el.closest('a[title]') : null
        if (anchor) el.dataset.coverTitle = anchor.getAttribute('title') || ''
      }
      decorateCover(el, i + 1499, true)
    })
  }

  function getText(root, selector) {
    var el = root.querySelector(selector)
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''
  }

  function readClearedPosts() {
    if (clearedPostsCache !== null) return clearedPostsCache

    var posts = {}
    try {
      var raw = localStorage.getItem(CLEARED_POSTS_KEY)
      var parsed = raw ? JSON.parse(raw) : null
      if (parsed && parsed.posts && typeof parsed.posts === 'object' && !Array.isArray(parsed.posts)) {
        Object.keys(parsed.posts).forEach(function(path) {
          var timestamp = Number(parsed.posts[path])
          if (path && Number.isFinite(timestamp)) posts[normPath(path)] = timestamp
        })
      }
    } catch (e) {}

    clearedPostsCache = posts
    return clearedPostsCache
  }

  function clearedPostCount() {
    return Object.keys(readClearedPosts()).length
  }

  function internalPathForLink(link) {
    if (!link) return ''
    var raw = link.getAttribute('href')
    if (!raw || /^javascript:/i.test(raw)) return ''

    try {
      var url = new URL(raw, location.origin)
      return url.origin === location.origin ? normPath(url.pathname) : ''
    } catch (e) {
      return ''
    }
  }

  function isClearedPath(path) {
    return Boolean(path && readClearedPosts()[normPath(path)])
  }

  function markClearedPath(path) {
    path = normPath(path || '')
    if (!path || path === '/' || isClearedPath(path)) return false

    var next = Object.assign({}, readClearedPosts())
    next[path] = Date.now()

    var trimmed = {}
    Object.keys(next)
      .sort(function(a, b) { return next[b] - next[a] })
      .slice(0, CLEARED_POSTS_LIMIT)
      .forEach(function(key) { trimmed[key] = next[key] })

    try {
      localStorage.setItem(CLEARED_POSTS_KEY, JSON.stringify({ version: 1, posts: trimmed }))
      clearedPostsCache = trimmed
      return true
    } catch (e) {
      return false
    }
  }

  function syncClearedBadge(card, cleared) {
    if (!card) return
    card.classList.toggle('is-cleared', cleared)

    var badge = card.querySelector('.toybox-cleared-badge')
    var usesCartridgeShell = card.classList.contains('toybox-featured') || card.classList.contains('toybox-cartridge-card')
    if (cleared && usesCartridgeShell && !badge) {
      badge = document.createElement('span')
      badge.className = 'toybox-cleared-badge'
      bindToyboxText(badge, 'status.cleared', null, null, '已通关')
      card.appendChild(badge)
    } else if ((!cleared || !usesCartridgeShell) && badge) {
      badge.remove()
    }

    var progressChip = card.querySelector('.pixel-post-hud-progress')
    if (progressChip) {
      bindToyboxText(progressChip, cleared ? 'status.cleared' : 'status.uncleared', null, null, cleared ? '已通关' : '未通关')
      progressChip.classList.toggle('is-cleared', cleared)
      var hud = progressChip.closest('.pixel-post-hud')
      if (hud) {
        var stage = getText(hud, '.pixel-post-hud-stage')
        var date = getText(hud, '.pixel-post-hud-date')
        hud.setAttribute('aria-label', toyboxText(cleared ? 'status.cleared' : 'status.uncleared', null, cleared ? '已通关' : '未通关') + (stage ? ', ' + stage : '') + (date ? ', ' + date : ''))
      }
    }
  }

  function applyClearedState() {
    var posts = readClearedPosts()

    document.querySelectorAll('.recent-post-item:not(.ads-wrap)').forEach(function(card) {
      var path = internalPathForLink(card.querySelector('.article-title'))
      syncClearedBadge(card, Boolean(path && posts[path]))
    })

    document.querySelectorAll('.article-sort-item:not(.year)').forEach(function(item) {
      var path = internalPathForLink(item.querySelector('.article-sort-item-title'))
      var cleared = Boolean(path && posts[path])
      if (!item.dataset.pixelNodeDefault) item.dataset.pixelNodeDefault = item.dataset.pixelNode || ''
      item.dataset.pixelNode = cleared ? '✓ ' + toyboxText('status.cleared', null, '已通关') : item.dataset.pixelNodeDefault
      item.classList.toggle('is-cleared', cleared)
    })

    var savedCount = Object.keys(posts).length
    var saveSlot = document.querySelector('.toybox-save-progress')
    if (saveSlot) {
      var count = saveSlot.querySelector('span')
      if (count) count.textContent = String(savedCount)
      bindToyboxText(saveSlot, 'status.localSave', { count: savedCount }, 'aria-label', '本机存档：已读完 ' + savedCount + ' 篇文章')
    }

    var post = document.querySelector('#body-wrap.post #post')
    var status = post && post.querySelector('.pixel-article-status')
    var currentCleared = Boolean(posts[normPath(location.pathname)])
    if (post) post.classList.toggle('is-cleared', currentCleared)
    if (status) {
      var chip = status.querySelector('.pixel-article-status-chip.is-cleared')
      if (currentCleared && !chip) {
        bindToyboxText(addHudChip(status, 'pixel-article-status-chip is-cleared', ''), 'status.cleared', null, null, '已通关')
      } else if (!currentCleared && chip) {
        chip.remove()
      }
    }
  }

  function bindClearedStorage() {
    if (clearedStorageBound) return
    clearedStorageBound = true
    window.addEventListener('storage', function(event) {
      if (event.key !== CLEARED_POSTS_KEY) return
      clearedPostsCache = null
      applyClearedState()
    })
  }

  function setToyboxCover(cover, sources) {
    if (!cover || !sources) return

    var sourceList = Array.isArray(sources)
      ? sources
      : typeof sources === 'string'
        ? [sources]
        : [sources.src || sources.primary, sources.fallback]
    var primaryAsset = themeAssetUrl(sourceList[0])
    var fallbackAsset = themeAssetUrl(sourceList[1] || sourceList[0])
    if (!primaryAsset) return
    cover.classList.add('toybox-cover')

    if (cover.tagName === 'IMG') {
      if (primaryAsset !== fallbackAsset) {
        cover.addEventListener('error', function useFallback() {
          cover.removeEventListener('error', useFallback)
          cover.src = fallbackAsset
        })
      }
      cover.src = primaryAsset
      cover.removeAttribute('data-lazy-src')
      return
    }

    var fallbackImage = 'url("' + fallbackAsset + '")'
    cover.style.setProperty('background-image', fallbackImage, 'important')
    if (primaryAsset !== fallbackAsset) {
      var imageSet = 'image-set(url("' + primaryAsset + '") type("image/webp"), ' + fallbackImage + ' type("image/png"))'
      if (window.CSS && CSS.supports('background-image', imageSet)) {
        cover.style.setProperty('background-image', imageSet, 'important')
      }
    }
    cover.style.setProperty('background-position', 'center', 'important')
  }

  function setCartridgeCardMode(card, featured, currentPage, totalCards) {
    var title = card.querySelector('.article-title')
    var info = card.querySelector('.recent-post-info')
    var oldBadge = card.querySelector('.toybox-featured-badge')
    var oldOpen = card.querySelector('.toybox-open-button')
    var oldArrow = card.querySelector('.toybox-card-arrow')
    if (oldBadge) oldBadge.remove()
    if (oldOpen) oldOpen.remove()
    if (oldArrow) oldArrow.remove()

    card.classList.remove('toybox-featured', 'toybox-cartridge-card', 'toybox-tone-featured', 'toybox-tone-aqua', 'toybox-tone-yellow', 'toybox-tone-coral')
    card.classList.add(featured ? 'toybox-featured' : 'toybox-cartridge-card')
    card.setAttribute('role', 'listitem')
    bindToyboxText(card, 'home.articlePosition', { current: card.dataset.toyboxNumber, total: totalCards }, 'aria-label', '文章 ' + card.dataset.toyboxNumber + ' / ' + totalCards)

    if (featured) {
      card.classList.add('toybox-tone-featured')
      card.setAttribute('aria-current', 'true')
      card.removeAttribute('aria-hidden')
      card.removeAttribute('inert')

      var badge = document.createElement('span')
      badge.className = 'toybox-featured-badge'
      bindToyboxText(badge, currentPage === 1 ? 'home.current' : 'home.pageCurrent', null, null, currentPage === 1 ? '当前选择' : '本页选择')
      card.insertBefore(badge, card.firstChild)

      if (title && info) {
        var open = document.createElement('a')
        open.className = 'toybox-open-button'
        open.href = title.href
        bindToyboxText(open, 'home.readTitle', { title: (title.textContent || '').trim() }, 'aria-label')
        open.innerHTML = '<span aria-hidden="true">A</span><span class="toybox-open-label"></span>'
        bindToyboxText(open.querySelector('.toybox-open-label'), 'home.read', null, null, '阅读文章')
        info.appendChild(open)
      }
      return
    }

    card.classList.add('toybox-tone-' + card.dataset.toyboxTone)
    card.removeAttribute('aria-current')
    if (title && info) {
      var arrow = document.createElement('a')
      arrow.className = 'toybox-card-arrow'
      arrow.href = title.href
      bindToyboxText(arrow, 'home.readTitle', { title: (title.textContent || '').trim() }, 'aria-label')
      arrow.innerHTML = '<i class="fas fa-arrow-right" aria-hidden="true"></i>'
      info.appendChild(arrow)
    }
  }

  function setupToyboxCarousel(stage, deck, viewport, track, cards, currentPage) {
    if (toyboxCarouselCleanup) toyboxCarouselCleanup()

    var previousButton = deck.querySelector('[data-toybox-direction="previous"]')
    var nextButton = deck.querySelector('[data-toybox-direction="next"]')
    var counter = deck.querySelector('.toybox-deck-counter')
    var numberButtons = Array.prototype.slice.call(deck.querySelectorAll('[data-toybox-index]'))
    var currentIndex = 0
    var switching = false
    var switchTimer = 0
    var pointerStart = null
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function updateCounter() {
      if (counter) {
        bindToyboxText(
          counter,
          cards.length ? 'home.selectionStatus' : 'home.selectionEmpty',
          cards.length ? { current: currentIndex + 1, total: cards.length } : null,
          null,
          cards.length ? '已选择第 ' + String(currentIndex + 1) + ' 篇，共 ' + String(cards.length) + ' 篇' : '没有可选择的文章'
        )
      }
      numberButtons.forEach(function(button, index) {
        var current = index === currentIndex
        button.classList.toggle('is-current', current)
        button.setAttribute('aria-pressed', current ? 'true' : 'false')
      })
    }

    function updateSlideState() {
      var slides = Array.prototype.slice.call(track.children)
      slides.forEach(function(slide, index) {
        slide.setAttribute('aria-posinset', String(index + 1))
        slide.setAttribute('aria-setsize', String(slides.length))
      })
    }

    function centerSelected(card, behavior) {
      if (!card || !viewport.scrollTo) return
      var targetLeft = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2
      var maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      viewport.scrollTo({
        left: Math.max(0, Math.min(maxLeft, targetLeft)),
        behavior: behavior || 'smooth'
      })
    }

    function selectIndex(nextIndex) {
      if (switching || cards.length < 2 || nextIndex === currentIndex) return

      switching = true
      window.clearTimeout(switchTimer)
      var previousCard = cards[currentIndex]
      currentIndex = (nextIndex + cards.length) % cards.length
      var selectedCard = cards[currentIndex]

      setCartridgeCardMode(previousCard, false, currentPage, cards.length)
      setCartridgeCardMode(selectedCard, true, currentPage, cards.length)
      updateCounter()
      updateSlideState()
      bindToyboxText(stage, 'home.currentArticle', { title: ((selectedCard.querySelector('.article-title') || {}).textContent || '').trim() }, 'aria-label')

      selectedCard.classList.remove('is-toybox-selected')
      if (!reducedMotion) {
        void selectedCard.offsetWidth
        selectedCard.classList.add('is-toybox-selected')
      }

      window.requestAnimationFrame(function() {
        centerSelected(selectedCard, reducedMotion ? 'auto' : 'smooth')
      })

      switchTimer = window.setTimeout(function() {
        selectedCard.classList.remove('is-toybox-selected')
        centerSelected(selectedCard, reducedMotion ? 'auto' : 'smooth')
        switching = false
      }, reducedMotion ? 0 : 340)
    }

    function select(direction) {
      selectIndex((currentIndex + direction + cards.length) % cards.length)
    }

    function onKeydown(event) {
      if (!deck.isConnected || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      var target = event.target
      if (target && ((target.matches && target.matches('input, textarea, select')) || target.isContentEditable)) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        select(event.key === 'ArrowLeft' ? -1 : 1)
        return
      }
      // Gamepad "A": open the selected cartridge, mirroring its Ⓐ button.
      if ((event.key === 'a' || event.key === 'A') && !event.repeat) {
        var selected = cards[currentIndex]
        var link = selected && selected.querySelector('.toybox-open-button, a.article-title, .toybox-card-arrow')
        if (!link) return
        event.preventDefault()
        link.click()
      }
    }

    function onPointerDown(event) {
      if (!event.isPrimary || event.pointerType === 'mouse') return
      pointerStart = { x: event.clientX, y: event.clientY }
    }

    function onPointerUp(event) {
      if (!pointerStart || !event.isPrimary) return
      var deltaX = event.clientX - pointerStart.x
      var deltaY = event.clientY - pointerStart.y
      pointerStart = null
      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return
      select(deltaX > 0 ? -1 : 1)
    }

    function cancelPointer() {
      pointerStart = null
    }

    if (previousButton) previousButton.addEventListener('click', function() { select(-1) })
    if (nextButton) nextButton.addEventListener('click', function() { select(1) })
    numberButtons.forEach(function(button, index) {
      button.addEventListener('click', function() { selectIndex(index) })
    })
    if (cards.length < 2) {
      if (previousButton) previousButton.disabled = true
      if (nextButton) nextButton.disabled = true
    }
    document.addEventListener('keydown', onKeydown)
    var onResize = function() {
      updateSlideState()
      centerSelected(cards[currentIndex], 'auto')
    }
    window.addEventListener('resize', onResize)
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointerup', onPointerUp)
    viewport.addEventListener('pointercancel', cancelPointer)
    updateCounter()
    updateSlideState()
    bindToyboxText(stage, 'home.currentArticle', { title: (((cards[0] && cards[0].querySelector('.article-title')) || {}).textContent || '').trim() }, 'aria-label')
    window.requestAnimationFrame(function() { centerSelected(cards[0], 'auto') })

    toyboxCarouselCleanup = function() {
      document.removeEventListener('keydown', onKeydown)
      window.removeEventListener('resize', onResize)
      viewport.removeEventListener('pointerdown', onPointerDown)
      viewport.removeEventListener('pointerup', onPointerUp)
      viewport.removeEventListener('pointercancel', cancelPointer)
      window.clearTimeout(switchTimer)
      pointerStart = null
      toyboxCarouselCleanup = null
    }
  }

  // Gamepad "B": back out one level, matching the console metaphor site-wide.
  // In read mode it exits read mode; on any non-home page it returns to the
  // previous same-origin page (falling back to the homepage); on the homepage
  // it stays quiet so visitors are never yanked off the site.
  function onToyboxGamepadBack(event) {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'b' && event.key !== 'B') return
    var target = event.target
    if (target && ((target.matches && target.matches('input, textarea, select')) || target.isContentEditable)) return

    if (document.body.classList.contains('read-mode')) {
      var exitButton = document.querySelector('.exit-readmode')
      if (exitButton) {
        event.preventDefault()
        exitButton.click()
      }
      return
    }

    if (document.body.classList.contains('toybox-home')) return

    event.preventDefault()
    var cameFromThisSite = false
    try {
      cameFromThisSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin
    } catch (error) {}
    if (cameFromThisSite && window.history.length > 1) window.history.back()
    else window.location.href = (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root) || '/'
  }

  document.addEventListener('keydown', onToyboxGamepadBack)

  function setupToyboxPageMotion(body, pagination, currentPage) {
    var incomingDirection = ''
    var recentPosts = body.querySelector('#recent-posts')
    try {
      incomingDirection = sessionStorage.getItem(TOYBOX_PAGE_MOTION_KEY) || ''
      sessionStorage.removeItem(TOYBOX_PAGE_MOTION_KEY)
    } catch (error) {}

    if (incomingDirection === 'next' || incomingDirection === 'previous') {
      var reducedEntryMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      body.dataset.toyboxPageDirection = incomingDirection
      body.classList.remove('toybox-page-leaving')
      body.classList.add('toybox-page-entering')
      if (recentPosts) recentPosts.setAttribute('aria-busy', 'false')
      if (pagination) {
        pagination.classList.add('is-toybox-arrived')
        pagination.setAttribute('aria-busy', 'false')
      }
      window.setTimeout(function() {
        body.classList.remove('toybox-page-entering')
        if (pagination) pagination.classList.remove('is-toybox-arrived')
        delete body.dataset.toyboxPageDirection
      }, reducedEntryMotion ? 0 : 560)
    }

    if (!pagination || pagination.dataset.toyboxMotionReady) return
    pagination.dataset.toyboxMotionReady = '1'

    if (!toyboxHistoryBound) {
      toyboxHistoryBound = true
      window.addEventListener('popstate', function() {
        location.reload()
      })
    }

    pagination.querySelectorAll('a[href]').forEach(function(link) {
      link.addEventListener('click', function(event) {
        if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || link.target === '_blank') return
        if (body.classList.contains('toybox-page-leaving')) {
          event.preventDefault()
          return
        }

        var targetUrl
        try {
          targetUrl = new URL(link.href, location.href)
        } catch (error) {
          return
        }
        if (targetUrl.origin !== location.origin) return
        targetUrl.hash = ''

        var pageMatch = targetUrl.pathname.match(/\/page\/(\d+)/)
        var targetPage = pageMatch ? parseInt(pageMatch[1], 10) : 1
        var direction = targetPage < currentPage ? 'previous' : 'next'
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

        event.preventDefault()
        event.stopPropagation()
        body.dataset.toyboxPageDirection = direction
        body.classList.remove('toybox-page-entering')
        body.classList.add('toybox-page-leaving')
        link.classList.add('is-toybox-activating')
        pagination.dataset.toyboxMotionDirection = direction
        pagination.setAttribute('aria-busy', 'true')
        if (recentPosts) recentPosts.setAttribute('aria-busy', 'true')
        try {
          sessionStorage.setItem(TOYBOX_PAGE_MOTION_KEY, direction)
        } catch (error) {}

        var previousScrollTop = window.scrollY
        if (!window.fetch) {
          window.setTimeout(function() { location.assign(targetUrl.href) }, reducedMotion ? 0 : 360)
          return
        }
        var transitionDelay = new Promise(function(resolve) {
          window.setTimeout(resolve, reducedMotion ? 0 : 360)
        })
        var pageRequest = window.fetch(targetUrl.pathname + targetUrl.search, {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'toybox-pagination' }
        }).then(function(response) {
          if (!response.ok) throw new Error('分页加载失败：' + response.status)
          return response.text()
        })

        Promise.all([transitionDelay, pageRequest]).then(function(results) {
          var parsed = new DOMParser().parseFromString(results[1], 'text/html')
          var nextPosts = parsed.querySelector('#recent-posts')
          if (!nextPosts || !recentPosts || !recentPosts.isConnected) throw new Error('分页内容缺失')

          var importedPosts = document.importNode(nextPosts, true)
          if (toyboxCarouselCleanup) toyboxCarouselCleanup()
          recentPosts.replaceWith(importedPosts)
          history.pushState({ toyboxPage: targetPage }, '', targetUrl.pathname + targetUrl.search)
          if (parsed.title) document.title = parsed.title
          window.scrollTo({ top: previousScrollTop, left: 0, behavior: 'auto' })
          enhancePixelUi()
          window.requestAnimationFrame(function() {
            window.scrollTo({ top: previousScrollTop, left: 0, behavior: 'auto' })
          })
        }).catch(function() {
          location.assign(targetUrl.href)
        })
      })
    })
  }

  function enhanceToyboxHome() {
    var body = document.body
    var wrap = document.getElementById('body-wrap')
    var posts = document.getElementById('recent-posts')
    var path = relativePath(location.pathname).replace(/index\.html?$/i, '').replace(/\/+$/, '') || '/'
    var isHomePath = path === '/' || /^\/page\/\d+$/.test(path)
    var isToyboxHome = Boolean(body && wrap && posts && isHomePath && wrap.querySelector('#page-header.full_page'))

    if (body) body.classList.toggle('toybox-home', isToyboxHome)
    if (!isToyboxHome && toyboxCarouselCleanup) toyboxCarouselCleanup()
    if (!isToyboxHome || posts.dataset.toyboxReady) return

    var articleAssets = homeFallbackCovers()
    var tones = ['aqua', 'yellow', 'coral']
    var cards = Array.prototype.slice.call(posts.querySelectorAll('.recent-post-item:not(.ads-wrap)'))
    var featuredCard = cards[0]
    var pagination = posts.querySelector('#pagination')
    var footer = posts.querySelector(':scope > #footer')
    var currentPageEl = pagination && pagination.querySelector('.page-number.current')
    var currentPage = parseInt(currentPageEl && currentPageEl.textContent, 10) || 1
    var pageNumbers = pagination ? Array.prototype.slice.call(pagination.querySelectorAll('.page-number')) : []
    var totalPage = pageNumbers.reduce(function(max, el) {
      var value = parseInt(el.textContent, 10)
      return Number.isFinite(value) ? Math.max(max, value) : max
    }, currentPage)

    cards.forEach(function(card, i) {
      card.classList.remove('toybox-standby')
      card.dataset.toyboxSlot = String(i)
      card.dataset.toyboxNumber = String(i + 1)
      card.dataset.toyboxTone = tones[i % tones.length]

      var cover = card.querySelector('.post-bg, .post_cover img')
      if (cover && cover.dataset.toyboxCoverSource === 'fallback' && articleAssets[i]) {
        setToyboxCover(cover, articleAssets[i])
      }

      var oldHud = card.querySelector('.pixel-post-hud')
      if (oldHud) oldHud.remove()
      setCartridgeCardMode(card, i === 0, currentPage, cards.length)
    })

    var stage = document.createElement('section')
    stage.className = 'toybox-stage'
    bindToyboxText(stage, 'home.latest', null, 'aria-label', '最新文章')

    var recentDeck = document.createElement('section')
    recentDeck.className = 'toybox-recent-deck'
    recentDeck.setAttribute('aria-labelledby', 'toybox-recent-title')
    recentDeck.setAttribute('aria-roledescription', toyboxText('home.carousel', null, '循环文章列表'))
    recentDeck.setAttribute('tabindex', '0')

    var deckHeader = document.createElement('div')
    deckHeader.className = 'toybox-deck-header'

    var recentTitle = document.createElement('h2')
    recentTitle.id = 'toybox-recent-title'
    recentTitle.className = 'toybox-recent-title'
    recentTitle.innerHTML = '<i class="far fa-clock" aria-hidden="true"></i><span>近期文章</span>'
    bindToyboxText(recentTitle.querySelector('span'), 'home.recent', null, null, '近期文章')

    var cardRow = document.createElement('div')
    cardRow.className = 'toybox-card-row'

    var cardTrack = document.createElement('div')
    cardTrack.className = 'toybox-card-track'
    cardTrack.setAttribute('role', 'list')
    bindToyboxText(cardTrack, 'home.recent', null, 'aria-label', '近期文章')

    var controls = document.createElement('div')
    controls.className = 'toybox-deck-controls'
    controls.innerHTML = [
      '<button type="button" data-toybox-direction="previous"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>',
      '<div class="toybox-selector-numbers" role="group">' + cards.map(function(card, index) {
        return '<button type="button" data-toybox-index="' + index + '">' + (index + 1) + '</button>'
      }).join('') + '</div>',
      '<button type="button" data-toybox-direction="next"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>',
      '<span class="toybox-deck-counter" aria-live="polite"></span>'
    ].join('')
    var previousControl = controls.querySelector('[data-toybox-direction="previous"]')
    var nextControl = controls.querySelector('[data-toybox-direction="next"]')
    bindToyboxText(previousControl, 'home.previous', null, 'aria-label', '选择上一篇')
    bindToyboxText(previousControl, 'home.previous', null, 'title', '选择上一篇')
    bindToyboxText(nextControl, 'home.next', null, 'aria-label', '选择下一篇')
    bindToyboxText(nextControl, 'home.next', null, 'title', '选择下一篇')
    bindToyboxText(controls.querySelector('.toybox-selector-numbers'), 'home.select', null, 'aria-label', '选择文章')
    controls.querySelectorAll('[data-toybox-index]').forEach(function(button, index) {
      bindToyboxText(button, 'home.selectIndex', { index: index + 1 }, 'aria-label', '选择第 ' + (index + 1) + ' 篇')
    })

    posts.insertBefore(stage, featuredCard || pagination)
    stage.appendChild(recentDeck)
    recentDeck.appendChild(deckHeader)
    deckHeader.appendChild(recentTitle)
    deckHeader.appendChild(controls)
    recentDeck.appendChild(cardRow)
    cardRow.appendChild(cardTrack)
    cards.forEach(function(card) {
      cardTrack.appendChild(card)
    })
    setupToyboxCarousel(stage, recentDeck, cardRow, cardTrack, cards, currentPage)

    var dock = document.createElement('nav')
    var statNodes = document.querySelectorAll('#sidebar .site-data .length-num')
    var statValues = Array.prototype.slice.call(statNodes).map(function(el) {
      return (el.textContent || '').trim()
    })
    dock.className = 'toybox-collection-dock'
    bindToyboxText(dock, 'home.contentShelf', null, 'aria-label', '内容收藏架')
    dock.innerHTML = [
      '<a href="' + rootPath('archives/') + '"><i class="fas fa-book-open" aria-hidden="true"></i><span>' + (statValues[0] || '0') + '</span><small></small></a>',
      '<a href="' + rootPath('tags/') + '"><i class="fas fa-tag" aria-hidden="true"></i><span>' + (statValues[1] || '0') + '</span><small></small></a>',
      '<a href="' + rootPath('categories/') + '"><i class="fas fa-folder-open" aria-hidden="true"></i><span>' + (statValues[2] || '0') + '</span><small></small></a>',
      '<a class="toybox-save-progress" href="' + rootPath('archives/') + '"><i class="fas fa-save" aria-hidden="true"></i><span>' + clearedPostCount() + '</span><small></small></a>'
    ].join('')
    var dockItems = dock.querySelectorAll('a')
    bindToyboxText(dockItems[0].querySelector('small'), 'home.articles', null, null, '文章')
    bindToyboxText(dockItems[1].querySelector('small'), 'home.tags', null, null, '标签')
    bindToyboxText(dockItems[2].querySelector('small'), 'home.categories', null, null, '分类')
    bindToyboxText(dockItems[3].querySelector('small'), 'home.localSave', null, null, '本机存档')
    bindToyboxText(dockItems[3], 'status.localSave', { count: clearedPostCount() }, 'aria-label')

    if (pagination) {
      bindToyboxDataset(pagination, 'toyboxPage', 'home.cartridgePage', { current: String(currentPage).padStart(2, '0'), total: String(totalPage).padStart(2, '0') })
      bindToyboxText(pagination, 'home.cartridgePagination', { current: currentPage, total: totalPage }, 'aria-label')
      pagination.querySelectorAll('.extend').forEach(function(link) {
        var key = link.classList.contains('prev') ? 'home.previousBox' : 'home.nextBox'
        bindToyboxDataset(link, 'toyboxNav', key, null)
        bindToyboxText(link, key, null, 'aria-label')
      })
    }

    setupToyboxPageMotion(body, pagination, currentPage)

    var bottomConsole = document.createElement('section')
    bottomConsole.className = 'toybox-bottom-console'
    bindToyboxText(bottomConsole, 'home.console', null, 'aria-label', '站点控制台')
    posts.insertBefore(bottomConsole, pagination || footer || null)
    bottomConsole.appendChild(dock)
    if (pagination) bottomConsole.appendChild(pagination)
    if (footer) bottomConsole.appendChild(footer)
    posts.dataset.toyboxReady = '1'
  }

  function addHudChip(root, className, text) {
    var chip = document.createElement('span')
    chip.className = className
    chip.textContent = text
    root.appendChild(chip)
    return chip
  }

  function decoratePostCards() {
    if (document.body.classList.contains('toybox-home')) return
    document.querySelectorAll('#recent-posts .recent-post-item:not(.ads-wrap)').forEach(function(card, i) {
      if (card.dataset.pixelHudReady) return

      var info = card.querySelector('.recent-post-info')
      if (!info) return

      var title = getText(card, '.article-title')
      var category = getText(card, '.article-meta__categories')
      var tag = getText(card, '.article-meta__tags')
      var date = getText(card, 'time')
      var stage = category || tag || 'BLOG'
      var articlePath = internalPathForLink(card.querySelector('.article-title'))
      var cleared = isClearedPath(articlePath)
      var p = paletteForText([title, category, tag].join(' '), i)

      card.style.setProperty('--hud-bg-start', p.bg[0])
      card.style.setProperty('--hud-bg-end', p.bg[1])
      card.style.setProperty('--hud-shadow', p.shadow)
      card.style.setProperty('--hud-highlight', p.highlight)
      card.style.setProperty('--hud-sprite', spriteUrl(p.sprite, 3))

      var hud = document.createElement('div')
      hud.className = 'pixel-post-hud'
      hud.setAttribute('aria-label', toyboxText(cleared ? 'status.cleared' : 'status.uncleared') + ', ' + stage + (date ? ', ' + date : ''))

      var icon = document.createElement('span')
      icon.className = 'pixel-post-hud-icon'
      hud.appendChild(icon)

      bindToyboxText(addHudChip(hud, 'pixel-post-hud-chip pixel-post-hud-progress' + (cleared ? ' is-cleared' : ''), ''), cleared ? 'status.cleared' : 'status.uncleared')
      addHudChip(hud, 'pixel-post-hud-chip pixel-post-hud-stage', stage)
      if (date) addHudChip(hud, 'pixel-post-hud-chip pixel-post-hud-date', date)

      info.insertBefore(hud, info.firstChild)
      card.dataset.pixelHudReady = '1'
    })
  }

  function applySidePalette(el, palette, scale) {
    el.style.setProperty('--side-bg-start', palette.bg[0])
    el.style.setProperty('--side-bg-end', palette.bg[1])
    el.style.setProperty('--side-shadow', palette.shadow)
    el.style.setProperty('--side-highlight', palette.highlight)
    el.style.setProperty('--side-sprite', spriteUrl(palette.sprite, scale || 3))
  }

  function decorateSidebarHud() {
    var profile = document.querySelector('#aside-content .card-info')
    if (profile && !profile.dataset.pixelProfileReady) {
      var profileText = [
        getText(profile, '.author-info__name'),
        getText(profile, '.author-info__description')
      ].join(' ')
      applySidePalette(profile, paletteForText(profileText, 2), 4)

      var badge = document.createElement('div')
      badge.className = 'pixel-profile-badge'
      badge.setAttribute('aria-hidden', 'true')

      var sprite = document.createElement('span')
      sprite.className = 'pixel-profile-sprite'
      badge.appendChild(sprite)

      var label = document.createElement('span')
      label.className = 'pixel-profile-label'
      bindToyboxText(label, 'page.siteCard', null, null, '站点名片')
      badge.appendChild(label)

      profile.insertBefore(badge, profile.firstChild)
      profile.dataset.pixelProfileReady = '1'
    }

    document.querySelectorAll('#aside-content .card-info-data a').forEach(function(link, i) {
      var text = getText(link, '.headline') || link.textContent || ''
      applySidePalette(link, paletteForText(text, i), 3)
      link.dataset.pixelStat = 'S' + String(i + 1).padStart(2, '0')
    })

    document.querySelectorAll('#aside-content .card-recent-post .aside-list-item').forEach(function(item, i) {
      var text = getText(item, '.title')
      var p = paletteForText(text, i + 4)
      item.style.setProperty('--quest-bg-start', p.bg[0])
      item.style.setProperty('--quest-bg-end', p.bg[1])
      item.style.setProperty('--quest-shadow', p.shadow)
      bindToyboxDataset(item, 'pixelQuest', 'archive.recent', { index: String(i + 1).padStart(2, '0') })
    })

    document.querySelectorAll('#aside-content .card-category-list-link, #aside-content .card-archive-list-link').forEach(function(link, i) {
      var text = link.textContent || ''
      var p = paletteForText(text, i + 8)
      link.style.setProperty('--list-bg-start', p.bg[0])
      link.style.setProperty('--list-bg-end', p.bg[1])
      link.style.setProperty('--list-shadow', p.shadow)
    })

    document.querySelectorAll('#aside-content .webinfo-item').forEach(function(item, i) {
      var p = PALETTES[(i + 1) % PALETTES.length]
      item.style.setProperty('--info-bg-start', p.bg[0])
      item.style.setProperty('--info-bg-end', p.bg[1])
      item.style.setProperty('--info-shadow', p.shadow)
      item.dataset.pixelInfo = 'I' + String(i + 1).padStart(2, '0')
    })
  }

  function decoratePagination() {
    document.querySelectorAll('#pagination:not(.pagination-post) .page-number, #pagination:not(.pagination-post) .extend').forEach(function(el) {
      if (el.dataset.pixelPageReady) return

      var label = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (el.classList.contains('prev')) bindToyboxDataset(el, 'pixelPage', 'common.previousPage')
      else if (el.classList.contains('next')) bindToyboxDataset(el, 'pixelPage', 'common.nextPage')
      else if (/^\d+$/.test(label)) bindToyboxDataset(el, 'pixelPage', 'common.page', { page: String(parseInt(label, 10)).padStart(2, '0') })
      else bindToyboxDataset(el, 'pixelPage', 'common.catalog')
      el.dataset.pixelPageReady = '1'
    })
  }

  function decorateCollectionPages() {
    [
      ['#archive', 'archive.title', 'archive.overview'],
      ['#category', 'archive.categoryTitle', 'archive.category'],
      ['#tag', 'archive.tagTitle', 'archive.tag']
    ].forEach(function(config) {
      var shell = document.querySelector(config[0])
      if (!shell || shell.dataset.pixelCollectionReady) return

      bindToyboxDataset(shell, 'pixelMapShell', config[1])
      var title = shell.querySelector('.article-sort-title')
      if (title) bindToyboxDataset(title, 'pixelMapTitle', config[2])
      shell.dataset.pixelCollectionReady = '1'
    })

    document.querySelectorAll('.article-sort-title').forEach(function(title) {
      if (!title.dataset.pixelMapTitle) bindToyboxDataset(title, 'pixelMapTitle', 'common.catalog')
    })

    document.querySelectorAll('.article-sort').forEach(function(sort) {
      var nodeIndex = 0
      sort.querySelectorAll('.article-sort-item').forEach(function(item) {
        if (item.classList.contains('year')) {
          bindToyboxDataset(item, 'pixelYear', 'archive.year')
          return
        }

        nodeIndex += 1
        var text = [
          getText(item, '.article-sort-item-title'),
          getText(item, '.article-sort-item-time')
        ].join(' ')
        var p = paletteForText(text, nodeIndex)
        item.style.setProperty('--map-bg-start', p.bg[0])
        item.style.setProperty('--map-bg-end', p.bg[1])
        item.style.setProperty('--map-shadow', p.shadow)
        item.style.setProperty('--map-highlight', p.highlight)
        item.style.setProperty('--map-sprite', spriteUrl(p.sprite, 3))
        bindToyboxDataset(item, 'pixelNode', 'archive.entry', { index: String(nodeIndex).padStart(2, '0') })
      })
    })

    document.querySelectorAll('.category-lists .category-list-link').forEach(function(link, i) {
      var text = link.textContent || ''
      var p = paletteForText(text, i + 3)
      link.style.setProperty('--category-bg-start', p.bg[0])
      link.style.setProperty('--category-bg-end', p.bg[1])
      link.style.setProperty('--category-shadow', p.shadow)
      link.style.setProperty('--category-highlight', p.highlight)
      link.style.setProperty('--category-sprite', spriteUrl(p.sprite, 3))
      bindToyboxDataset(link, 'pixelCategory', 'archive.categoryEntry', { index: String(i + 1).padStart(2, '0') })
    })
  }

  function decorateArticleWidgets() {
    var article = document.querySelector('#article-container')
    if (!article) return

    article.querySelectorAll('.tabs').forEach(function(tabs) {
      if (tabs.dataset.pixelTabsReady) return
      tabs.dataset.pixelPanel = 'ITEM MENU'
      tabs.querySelectorAll('.nav-tabs > .tab').forEach(function(tab, i) {
        var button = tab.querySelector('button')
        if (button) button.dataset.pixelSlot = 'SLOT ' + String(i + 1).padStart(2, '0')
      })
      tabs.dataset.pixelTabsReady = '1'
    })

    article.querySelectorAll('.timeline').forEach(function(timeline) {
      if (timeline.dataset.pixelTimelineReady) return
      bindToyboxDataset(timeline, 'pixelTimeline', 'archive.timeline')
      var itemIndex = 0
      timeline.querySelectorAll('.timeline-item').forEach(function(item) {
        if (item.classList.contains('headline')) {
          item.dataset.pixelLog = 'START'
          return
        }
        itemIndex += 1
        item.dataset.pixelLog = 'LOG ' + String(itemIndex).padStart(2, '0')
      })
      timeline.dataset.pixelTimelineReady = '1'
    })

    article.querySelectorAll('.hide-inline, .hide-block, .toggle').forEach(function(box, i) {
      if (box.dataset.pixelSecretReady) return
      box.dataset.pixelSecret = box.classList.contains('toggle') ? 'DROP' : 'SECRET'
      var trigger = box.querySelector('.hide-button, .toggle-button')
      if (trigger) trigger.dataset.pixelKey = 'KEY ' + String(i + 1).padStart(2, '0')
      box.dataset.pixelSecretReady = '1'
    })

    article.querySelectorAll('figure.gallery-group').forEach(function(group, i) {
      if (group.dataset.pixelAlbumReady) return
      group.dataset.pixelAlbum = 'ALBUM ' + String(i + 1).padStart(2, '0')
      group.dataset.pixelAlbumReady = '1'
    })

    article.querySelectorAll('.gallery').forEach(function(gallery) {
      if (gallery.dataset.pixelGalleryReady) return
      gallery.dataset.pixelGallery = 'GALLERY'
      var button = gallery.querySelector('.gallery-load-more')
      if (button) button.dataset.pixelAction = 'LOAD'
      gallery.dataset.pixelGalleryReady = '1'
    })

    article.querySelectorAll('.mermaid-wrap').forEach(function(diagram) {
      if (diagram.dataset.pixelDiagramReady) return
      diagram.dataset.pixelDiagram = 'DIAGRAM'
      diagram.dataset.pixelDiagramReady = '1'
    })
  }

  function markMediaFrame(el, label) {
    if (!el || el.dataset.pixelMediaReady) return
    el.classList.add('pixel-media-frame')
    el.dataset.pixelMedia = label
    el.dataset.pixelMediaReady = '1'
  }

  function wrapMediaElement(el, label) {
    if (!el || el.closest('.pixel-media-frame')) return
    var wrapper = document.createElement('div')
    wrapper.className = 'pixel-media-frame'
    wrapper.dataset.pixelMedia = label
    wrapper.dataset.pixelMediaReady = '1'
    el.parentNode.insertBefore(wrapper, el)
    wrapper.appendChild(el)
  }

  function mediaSourceOf(img) {
    return img.getAttribute('data-lazy-src') || img.getAttribute('src') || ''
  }

  function decorateArticleMedia() {
    var article = document.querySelector('#article-container')
    if (!article) return

    article.querySelectorAll('img').forEach(function(img) {
      if (
        img.dataset.pixelMediaReady ||
        img.closest('.gallery, figure.gallery-group, .flink, .highlight, .avatar-img, .pixel-media-frame')
      ) return

      var src = mediaSourceOf(img)
      var label = /\.gif(?:$|\?)/i.test(src) ? 'GIF' : 'SCREEN'
      var anchor = img.parentElement && img.parentElement.tagName === 'A' ? img.parentElement : null
      var frame = anchor && anchor.parentElement && anchor.parentElement.tagName === 'P'
        ? anchor.parentElement
        : (img.parentElement && img.parentElement.tagName === 'P' ? img.parentElement : null)

      if (frame) {
        markMediaFrame(frame, label)
      } else {
        wrapMediaElement(anchor || img, label)
      }
      img.dataset.pixelMediaReady = '1'
    })

    article.querySelectorAll('.video-container').forEach(function(video) {
      markMediaFrame(video, 'VIDEO')
    })

    article.querySelectorAll('iframe').forEach(function(frame) {
      if (frame.closest('.video-container, .pixel-media-frame')) return
      if (frame.parentElement && frame.parentElement.tagName === 'P') {
        markMediaFrame(frame.parentElement, 'IFRAME')
      } else {
        wrapMediaElement(frame, 'IFRAME')
      }
    })

    article.querySelectorAll('video, .aplayer').forEach(function(media) {
      if (media.closest('.pixel-media-frame')) return
      wrapMediaElement(media, media.classList.contains('aplayer') ? 'AUDIO' : 'VIDEO')
    })
  }

  function decoratePostPage() {
    var post = document.querySelector('#body-wrap.post #post')
    var article = post && post.querySelector('#article-container')
    if (!post || !article || post.dataset.pixelQuestReady) return

    var title = getText(document, '#post-info .post-title') || getText(article, 'h1')
    var category = getText(document, '#post-meta a.post-meta-categories')
    var tag = getText(document, '.post-meta__tags')
    var date = getText(document, '#post-meta .post-meta-date-created')
    var wordCount = getText(document, '#post-meta .word-count')
    var readTime = getText(document, '#post-meta .post-meta-wordcount > span:last-child')
    var stage = category || tag || 'BLOG'
    var headingCount = article.querySelectorAll('h1, h2, h3').length
    var visualSeed = title.length + headingCount * 7
    var p = paletteForText([title, category, tag].join(' '), visualSeed)

    post.style.setProperty('--article-quest-bg-start', p.bg[0])
    post.style.setProperty('--article-quest-bg-end', p.bg[1])
    post.style.setProperty('--article-quest-shadow', p.shadow)
    post.style.setProperty('--article-quest-highlight', p.highlight)
    post.style.setProperty('--article-quest-sprite', spriteUrl(p.sprite, 4))
    post.style.setProperty('--article-sleeve-relic', 'url("' + rootPath('img/pixel-relics/' + p.relic) + '")')
    post.classList.add('pixel-article-manual')

    var postInfo = document.querySelector('#post-info')
    if (postInfo) {
      postInfo.style.setProperty('--article-quest-bg-start', p.bg[0])
      postInfo.style.setProperty('--article-quest-bg-end', p.bg[1])
      postInfo.style.setProperty('--article-quest-shadow', p.shadow)
      postInfo.style.setProperty('--article-quest-highlight', p.highlight)
      postInfo.style.setProperty('--article-sleeve-relic', 'url("' + rootPath('img/pixel-relics/' + p.relic) + '")')
      bindToyboxDataset(postInfo, 'pixelQuestTitle', 'post.cartridge')
      postInfo.dataset.pixelQuestLevel = stage
      postInfo.dataset.pixelQuestStage = stage

      var sleeveArt = document.createElement('span')
      sleeveArt.className = 'pixel-article-sleeve-art'
      sleeveArt.setAttribute('aria-hidden', 'true')
      postInfo.insertBefore(sleeveArt, postInfo.firstChild)
    }

    var status = document.createElement('div')
    status.className = 'pixel-article-status'
    status.setAttribute('role', 'group')
    bindToyboxText(status, 'post.info', null, 'aria-label', '文章信息')

    var icon = document.createElement('span')
    icon.className = 'pixel-article-status-icon'
    status.appendChild(icon)

    bindToyboxText(addHudChip(status, 'pixel-article-status-chip is-main', ''), 'post.info', null, null, '文章信息')
    if (stage) addHudChip(status, 'pixel-article-status-chip', stage)
    if (wordCount) bindToyboxText(addHudChip(status, 'pixel-article-status-chip', ''), 'post.words', { count: wordCount }, null, '字数 ' + wordCount)
    if (readTime) addHudChip(status, 'pixel-article-status-chip', readTime)
    if (date) addHudChip(status, 'pixel-article-status-chip is-date', date)

    post.insertBefore(status, article)

    var meter = document.createElement('div')
    meter.className = 'pixel-reading-meter'
    meter.setAttribute('role', 'progressbar')
    bindToyboxText(meter, 'post.progress', null, 'aria-label', '文章阅读进度')
    meter.setAttribute('aria-valuemin', '0')
    meter.setAttribute('aria-valuemax', '100')
    meter.setAttribute('aria-valuenow', '0')

    var meterLabel = document.createElement('span')
    meterLabel.className = 'pixel-reading-meter-label'
    bindToyboxText(meterLabel, 'post.progress', null, null, '阅读进度')
    meter.appendChild(meterLabel)

    var meterTrack = document.createElement('span')
    meterTrack.className = 'pixel-reading-meter-track'
    meterTrack.setAttribute('aria-hidden', 'true')
    var meterFill = document.createElement('span')
    meterFill.className = 'pixel-reading-meter-fill'
    meterTrack.appendChild(meterFill)
    meter.appendChild(meterTrack)

    var meterValue = document.createElement('span')
    meterValue.className = 'pixel-reading-meter-value'
    meterValue.textContent = '0%'
    meter.appendChild(meterValue)

    status.insertAdjacentElement('afterend', meter)

    var manualBody = document.createElement('div')
    manualBody.className = 'pixel-manual-body'
    meter.insertAdjacentElement('afterend', manualBody)

    var toc = document.getElementById('card-toc')
    if (toc) {
      toc.classList.add('pixel-manual-index')
      bindToyboxText(toc, 'post.toc', null, 'aria-label', '文章章节书签')
      var tocTitle = toc.querySelector('.item-headline span:not(.toc-percentage)')
      bindToyboxText(tocTitle, 'post.toc', null, null, '章节书签')
      manualBody.appendChild(toc)
    } else {
      manualBody.classList.add('is-single-page')
    }
    manualBody.appendChild(article)

    readingProgressTarget = {
      article: article,
      meter: meter,
      value: meterValue,
      path: normPath(location.pathname)
    }
    bindReadingProgress()
    scheduleReadingProgress()

    document.querySelectorAll('.post-copyright > div').forEach(function(row, i) {
      bindToyboxDataset(row, 'pixelSave', 'post.record', { index: String(i + 1).padStart(2, '0') })
    })

    var tagShare = document.querySelector('.tag_share')
    if (tagShare) bindToyboxDataset(tagShare, 'pixelItems', 'post.tagsAndShare')

    document.querySelectorAll('#pagination.pagination-post .prev-post, #pagination.pagination-post .next-post').forEach(function(item) {
      bindToyboxDataset(item, 'pixelGate', item.classList.contains('prev-post') ? 'post.previous' : 'post.next')
    })

    document.querySelectorAll('.relatedPosts-list > div').forEach(function(card, i) {
      var text = getText(card, '.title') || card.textContent || ''
      var relatedPalette = paletteForText(text, i + 11)
      card.style.setProperty('--related-bg-start', relatedPalette.bg[0])
      card.style.setProperty('--related-bg-end', relatedPalette.bg[1])
      card.style.setProperty('--related-shadow', relatedPalette.shadow)
      card.style.setProperty('--related-highlight', relatedPalette.highlight)
      bindToyboxDataset(card, 'pixelRelated', 'post.recommendation', { index: String(i + 1).padStart(2, '0') })
    })

    post.dataset.pixelQuestReady = '1'
  }

  function updateReadingProgress() {
    readingProgressFrame = 0
    var target = readingProgressTarget
    if (!target || !target.article.isConnected || !target.meter.isConnected) return

    var rect = target.article.getBoundingClientRect()
    var startLine = window.innerHeight * 0.28
    var travel = Math.max(1, target.article.scrollHeight - window.innerHeight * 0.55)
    var progress = Math.max(0, Math.min(100, Math.round(((startLine - rect.top) / travel) * 100)))

    target.meter.style.setProperty('--reading-progress', String(progress / 100))
    target.meter.setAttribute('aria-valuenow', String(progress))
    target.meter.dataset.pixelState = progress >= 98 ? 'COMPLETE' : 'IN PROGRESS'
    target.value.textContent = progress + '%'

    if (progress >= 98 && markClearedPath(target.path)) applyClearedState()
  }

  function scheduleReadingProgress() {
    if (readingProgressFrame) return
    readingProgressFrame = window.requestAnimationFrame(updateReadingProgress)
  }

  function bindReadingProgress() {
    if (readingProgressBound) return
    readingProgressBound = true
    window.addEventListener('scroll', scheduleReadingProgress, { passive: true })
    window.addEventListener('resize', scheduleReadingProgress, { passive: true })
  }

  function decorateFlinkPage() {
    var hub = document.querySelector('#article-container .flink')
    if (!hub) return

    hub.dataset.pixelHub = 'PORTAL HUB'

    hub.querySelectorAll('h2').forEach(function(title, i) {
      title.dataset.pixelZone = 'ZONE ' + String(i + 1).padStart(2, '0')
    })

    hub.querySelectorAll('.flink-desc').forEach(function(desc) {
      desc.dataset.pixelDesc = 'NPC LOG'
    })

    hub.querySelectorAll('.flink-list-item').forEach(function(item, i) {
      if (item.dataset.pixelFlinkReady) return

      var name = getText(item, '.flink-item-name')
      var desc = getText(item, '.flink-item-desc')
      var p = paletteForText([name, desc].join(' '), i + 23)
      item.style.setProperty('--flink-bg-start', p.bg[0])
      item.style.setProperty('--flink-bg-end', p.bg[1])
      item.style.setProperty('--flink-shadow', p.shadow)
      item.style.setProperty('--flink-highlight', p.highlight)
      item.style.setProperty('--flink-sprite', spriteUrl(p.sprite, 3))
      item.dataset.pixelPortal = 'PORTAL ' + String(i + 1).padStart(2, '0')

      var anchor = item.querySelector('a')
      if (anchor && !anchor.querySelector('.pixel-flink-sprite')) {
        var sprite = document.createElement('span')
        sprite.className = 'pixel-flink-sprite'
        sprite.setAttribute('aria-hidden', 'true')
        anchor.appendChild(sprite)
      }

      item.dataset.pixelFlinkReady = '1'
    })

    if (!hub.dataset.pixelObserverReady && window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        var hasAddedNode = mutations.some(function(mutation) {
          return mutation.addedNodes && mutation.addedNodes.length > 0
        })
        if (hasAddedNode) {
          var schedule = window.requestAnimationFrame || function(callback) { window.setTimeout(callback, 0) }
          schedule(decorateFlinkPage)
        }
      })
      observer.observe(hub, { childList: true, subtree: true })
      hub.dataset.pixelObserverReady = '1'
    }
  }

  function decorateErrorPage() {
    var wrap = document.querySelector('#body-wrap.error404')
    var content = wrap && wrap.querySelector('.error-content')
    if (!wrap || !content || content.dataset.pixelErrorReady) return

    var p = PALETTES[2]
    content.style.setProperty('--error-bg-start', p.bg[0])
    content.style.setProperty('--error-bg-end', p.bg[1])
    content.style.setProperty('--error-shadow', p.shadow)
    content.style.setProperty('--error-highlight', p.highlight)
    content.style.setProperty('--error-sprite', spriteUrl('moon_talisman', 5))
    content.style.setProperty('--error-prop-a', spriteUrl('hero_sword', 4))
    content.style.setProperty('--error-prop-b', spriteUrl('chest', 4))
    content.dataset.pixelError = 'GAME OVER'

    var image = content.querySelector('.error-img')
    if (image && !image.querySelector('.pixel-error-scene')) {
      var scene = document.createElement('div')
      scene.className = 'pixel-error-scene'
      scene.setAttribute('aria-hidden', 'true')
      addSpan(scene, 'pixel-error-sprite')
      addSpan(scene, 'pixel-error-prop pixel-error-prop-a')
      addSpan(scene, 'pixel-error-prop pixel-error-prop-b')
      addSpan(scene, 'pixel-error-ground')
      image.appendChild(scene)
    }

    var info = content.querySelector('.error-info')
    if (info && !info.querySelector('.pixel-error-actions')) {
      var actions = document.createElement('div')
      actions.className = 'pixel-error-actions'

      var home = document.createElement('a')
      home.href = rootPath('')
      home.className = 'pixel-error-action is-home'
      bindToyboxText(home, 'notFound.home', null, null, '返回主页')
      home.dataset.pixelAction = 'RESPAWN'
      actions.appendChild(home)

      var archive = document.createElement('a')
      archive.href = rootPath('archives/')
      archive.className = 'pixel-error-action'
      bindToyboxText(archive, 'notFound.archives', null, null, '查看归档')
      archive.dataset.pixelAction = 'MAP'
      actions.appendChild(archive)

      info.appendChild(actions)
    }

    content.dataset.pixelErrorReady = '1'
  }

  function syncRightsideTips() {
    document.querySelectorAll('#rightside button, #rightside a').forEach(function(el) {
      var tip = el.getAttribute('title') || el.getAttribute('aria-label') || (el.textContent || '').trim()
      if (!tip) return
      el.dataset.pixelTip = tip
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', tip)
    })

  }

  function syncAnimButtonState(btn, off) {
    var labelKey = off ? 'rightside.motionOff' : 'rightside.motionOn'
    var actionKey = off ? 'rightside.enableMotion' : 'rightside.disableMotion'
    var label = toyboxText(labelKey, null, off ? '动效已关闭' : '动效开启')
    btn.classList.toggle('anim-off', off)
    btn.setAttribute('aria-pressed', String(!off))
    bindToyboxText(btn, labelKey, null, 'title', label)
    bindToyboxText(btn, actionKey, null, 'aria-label', off ? '开启像素动效' : '关闭像素动效')
    bindToyboxText(btn.querySelector('.toybox-action-label'), labelKey, null, null, label)
    btn.dataset.pixelTip = label
  }

  function setupSpriteTest() {
    var button = document.getElementById('pixel-sprite-test-btn')
    var panel = document.getElementById('pixel-sprite-test-panel')
    if (!button) {
      if (panel) panel.hidden = true
      return
    }

    var isHome = document.body && document.body.classList.contains('toybox-home')
    if (!isHome) {
      if (panel) panel.hidden = true
      button.setAttribute('aria-expanded', 'false')
      return
    }

    if (!panel) {
      panel = document.createElement('section')
      panel.id = 'pixel-sprite-test-panel'
      panel.className = 'pixel-sprite-test-panel'
      panel.hidden = true
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-modal', 'false')
      panel.setAttribute('aria-labelledby', 'pixel-sprite-test-title')

      var cells = []
      for (var index = 0; index < 123; index++) {
        var group = index < 30 ? 'retro' : index < 80 ? 'cute' : 'platform'
        cells.push(
          '<button class="pixel-sprite-test-cell" type="button" data-sprite-index="' + index + '" data-sprite-group="' + group + '">' +
            '<span class="pixel-sprite-test-icon" style="--sprite-x:' + ((index % 8) * -32) + 'px;--sprite-y:' + (Math.floor(index / 8) * -32) + 'px" aria-hidden="true"></span>' +
            '<small>' + String(index).padStart(3, '0') + '</small>' +
          '</button>'
        )
      }

      panel.innerHTML = [
        '<header class="pixel-sprite-test-header">',
          '<div><strong id="pixel-sprite-test-title">SPRITE TEST</strong><span></span></div>',
          '<button class="pixel-sprite-test-close" type="button"><i class="fas fa-times" aria-hidden="true"></i></button>',
        '</header>',
        '<div class="pixel-sprite-test-filters" role="group">',
          '<button type="button" class="is-active" data-sprite-filter="all"></button>',
          '<button type="button" data-sprite-filter="retro"></button>',
          '<button type="button" data-sprite-filter="cute"></button>',
          '<button type="button" data-sprite-filter="platform"></button>',
        '</div>',
        '<div class="pixel-sprite-test-status" aria-live="polite"></div>',
        '<div class="pixel-sprite-test-grid">' + cells.join('') + '</div>'
      ].join('')
      document.body.appendChild(panel)

      bindToyboxText(panel.querySelector('.pixel-sprite-test-header span'), 'sprite.runtimeCount', { count: 123 }, null, '123 个运行时素材')
      var closeButton = panel.querySelector('.pixel-sprite-test-close')
      bindToyboxText(closeButton, 'sprite.close', null, 'aria-label', '关闭 Sprite 测试台')
      bindToyboxText(closeButton, 'sprite.close', null, 'title', '关闭 Sprite 测试台')
      bindToyboxText(panel.querySelector('.pixel-sprite-test-filters'), 'sprite.filterLabel', null, 'aria-label', '筛选素材')
      bindToyboxText(panel.querySelector('[data-sprite-filter="all"]'), 'sprite.filterAll', null, null, '全部')
      bindToyboxText(panel.querySelector('[data-sprite-filter="retro"]'), 'sprite.filterRetro', null, null, '街机')
      bindToyboxText(panel.querySelector('[data-sprite-filter="cute"]'), 'sprite.filterCute', null, null, '可爱')
      bindToyboxText(panel.querySelector('[data-sprite-filter="platform"]'), 'sprite.filterPlatform', null, null, '平台')
      bindToyboxText(panel.querySelector('.pixel-sprite-test-status'), 'sprite.dropHint', null, null, '点击素材可投放到侧边轨道')
      panel.querySelectorAll('.pixel-sprite-test-cell').forEach(function(cell) {
        bindToyboxText(cell, 'sprite.preview', { index: String(cell.dataset.spriteIndex).padStart(3, '0') }, 'aria-label')
      })

      panel.querySelector('.pixel-sprite-test-close').addEventListener('click', function() {
        panel.hidden = true
        var currentButton = document.getElementById('pixel-sprite-test-btn')
        if (currentButton) {
          currentButton.classList.remove('is-active')
          currentButton.setAttribute('aria-expanded', 'false')
          bindToyboxText(currentButton.querySelector('.toybox-action-label'), 'rightside.spriteLab', null, null, 'Sprite 测试台')
          currentButton.focus()
        }
      })

      panel.querySelectorAll('[data-sprite-filter]').forEach(function(filterButton) {
        filterButton.addEventListener('click', function() {
          var filter = filterButton.dataset.spriteFilter
          panel.querySelectorAll('[data-sprite-filter]').forEach(function(item) {
            item.classList.toggle('is-active', item === filterButton)
          })
          panel.querySelectorAll('.pixel-sprite-test-cell').forEach(function(cell) {
            cell.hidden = filter !== 'all' && cell.dataset.spriteGroup !== filter
          })
        })
      })

      panel.querySelectorAll('.pixel-sprite-test-cell').forEach(function(cell) {
        cell.addEventListener('click', function() {
          var index = Number(cell.dataset.spriteIndex)
          var groupKeys = { retro: 'sprite.groupRetro', cute: 'sprite.groupCute', platform: 'sprite.groupPlatform' }
          panel.querySelectorAll('.pixel-sprite-test-cell.is-active').forEach(function(item) {
            item.classList.remove('is-active')
          })
          cell.classList.add('is-active')
          bindToyboxText(panel.querySelector('.pixel-sprite-test-status'), 'sprite.previewStatus', {
            index: String(index).padStart(3, '0'),
            group: toyboxText(groupKeys[cell.dataset.spriteGroup])
          })
          window.dispatchEvent(new CustomEvent('pixel-sprite-preview', { detail: { index: index } }))
        })
      })

      document.addEventListener('keydown', function(event) {
        if (event.key !== 'Escape' || panel.hidden) return
        panel.querySelector('.pixel-sprite-test-close').click()
      })
    }

    if (button.dataset.spriteTestBound) return
    button.dataset.spriteTestBound = 'true'
    button.addEventListener('click', function() {
      var open = panel.hidden
      panel.hidden = !open
      button.classList.toggle('is-active', open)
      button.setAttribute('aria-expanded', String(open))
      bindToyboxText(button, open ? 'rightside.closeSpriteLab' : 'rightside.spriteLab', null, 'aria-label')
      bindToyboxText(button.querySelector('.toybox-action-label'), open ? 'rightside.closeSpriteLab' : 'rightside.spriteLab', null, null, open ? '关闭 Sprite 测试台' : 'Sprite 测试台')
      button.dataset.pixelTip = toyboxText(open ? 'rightside.closeSpriteLab' : 'rightside.spriteLab')
      if (open) {
        if (window.ToyboxSettings && window.ToyboxSettings.closePanel) window.ToyboxSettings.closePanel()
        panel.querySelector('.pixel-sprite-test-cell:not([hidden])').focus()
      }
    })
  }

  // ── 同步 rightside 手柄按钮初始状态 ─────────────────────────
  function syncBtn() {
    var b = document.getElementById('pixel-anim-btn')
    if (!b) return
    var off = localStorage.getItem('pixelAnim') === 'off'
    syncAnimButtonState(b, off)
    if (b.dataset.pixelToggleBound) return
    b.dataset.pixelToggleBound = 'true'
    b.addEventListener('click', function() {
      var wasOff = localStorage.getItem('pixelAnim') === 'off'
      localStorage.setItem('pixelAnim', wasOff ? 'on' : 'off')
      syncAnimButtonState(b, !wasOff)
      window.dispatchEvent(new CustomEvent('pixel-animation-toggle', {
        detail: { enabled: wasOff }
      }))
    })
  }

  // 把路径归一化：去掉 index.html、去掉尾部斜杠（根路径除外）
  function normPath(p) {
    p = p.replace(/index\.html?$/i, '')
    if (p.length > 1) p = p.replace(/\/+$/, '')
    return p || '/'
  }

  // Mark the current item in both the desktop navigation and mobile drawer.
  function markActiveNav() {
    var here = normPath(location.pathname)
    document.querySelectorAll('#nav .site-page, #sidebar-menus .site-page').forEach(function(a) {
      a.classList.remove('pixel-active')
      var raw = a.getAttribute('href')
      if (!raw || /^javascript:/i.test(raw)) return
      var lp
      try {
        var u = new URL(raw, location.origin)
        // 跳过站外链接，避免外站路径误命中本站路径（如外链 /about 撞本站 /about）
        if (u.origin !== location.origin) return
        lp = normPath(u.pathname)
      } catch (e) { return }
      // 精确匹配（含首页），或当前页是该导航项的子路径（如 /archives/page/2 命中 /archives）
      var isPaginatedHome = lp === '/' && /^\/page\/\d+$/.test(here)
      if (lp === here || isPaginatedHome || (lp !== '/' && here.indexOf(lp + '/') === 0)) {
        a.classList.add('pixel-active')
      }
    })
  }

  function enhanceSearchButton() {
    var search = document.querySelector('#search-button .search')
    if (!search) return
    bindToyboxText(search, 'search.placeholder', null, 'aria-label', '搜索文章')
    bindToyboxText(search, 'search.placeholder', null, 'title', '搜索文章')
  }

  function revealToyboxUi() {
    var body = document.body
    if (!body || !body.classList.contains('toybox-ui-pending')) return
    window.requestAnimationFrame(function() {
      body.classList.remove('toybox-ui-pending')
      body.classList.add('toybox-ui-ready')
      window.setTimeout(function() { body.classList.remove('toybox-ui-ready') }, 320)
    })
  }

  function enhancePixelUi() {
    try {
      enhanceToyboxHome()
      colorTags()
      enhanceCovers()
      decoratePostCards()
      decorateSidebarHud()
      decoratePagination()
      decorateCollectionPages()
      decorateArticleWidgets()
      decorateArticleMedia()
      decoratePostPage()
      decorateFlinkPage()
      decorateErrorPage()
      applyClearedState()
      bindClearedStorage()
      enhanceSearchButton()
      syncBtn()
      setupSpriteTest()
      syncRightsideTips()
      markActiveNav()
    } finally {
      revealToyboxUi()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhancePixelUi)
  } else {
    enhancePixelUi()
  }

  document.addEventListener('pjax:complete', enhancePixelUi)
  document.addEventListener('pjax:success', enhancePixelUi)
  document.addEventListener('toybox:locale-change', function() {
    refreshToyboxDatasets(document)
    applyClearedState()
    syncBtn()
    syncRightsideTips()
  })
})()
