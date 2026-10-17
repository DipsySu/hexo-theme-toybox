;(function () {
  'use strict'

  var readingProgressTarget = null
  var readingProgressFrame = 0
  var readingProgressBound = false
  var readingProgressObserver = null
  var CLEARED_POSTS_KEY = 'toyboxClearedPosts:v1'
  var CLEARED_POSTS_LIMIT = 200
  var clearedPostsCache = null
  var clearedStorageBound = false
  var toyboxCarouselCleanup = null
  var toyboxHistoryBound = false
  var TOYBOX_PAGE_MOTION_KEY = 'toyboxPageMotion:v1'
  var ANIMATION_KEY = 'pixelAnim'
  // Holds the motion choice only while browser storage refuses writes.
  var animationPreference = null

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

  // Colour and gradient thumbnails share the cover sizing rule in toybox-theme.css.
  function markCoverFallbacks() {
    document.querySelectorAll('.relatedPosts .cover, #pagination .cover').forEach(function(el) {
      if (el.tagName !== 'IMG') el.classList.add('pixel-cover-fallback')
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
  }

  function applyClearedState() {
    var posts = readClearedPosts()

    document.querySelectorAll('.recent-post-item:not(.ads-wrap)').forEach(function(card) {
      var path = internalPathForLink(card.querySelector('.article-title'))
      syncClearedBadge(card, Boolean(path && posts[path]))
    })

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

  function setCartridgeCardMode(card, featured, currentPage, totalCards) {
    card.classList.toggle('toybox-featured', featured)
    card.classList.toggle('toybox-cartridge-card', !featured)
    if (featured) card.setAttribute('aria-current', 'true')
    else card.removeAttribute('aria-current')
    bindToyboxText(card, 'home.articlePosition', { current: card.dataset.toyboxNumber, total: totalCards }, 'aria-label')
    var title = getText(card, '.article-title')
    card.querySelectorAll('.toybox-open-button, .toybox-card-arrow').forEach(function(link) {
      bindToyboxText(link, 'home.readTitle', { title: title }, 'aria-label')
    })
  }

  // Arrow keys also work while a rack selector is focused; A never activates a form control.
  function toyboxShortcutsBlocked(event) {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true
    var target = event.target
    var rackArrow = (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && target && target.closest && target.closest('.toybox-deck-controls button')
    if (target && (target.isContentEditable || (!rackArrow && target.closest && target.closest('input, textarea, select, button, a, [role="dialog"], [contenteditable="true"]')))) return true
    return Array.prototype.some.call(document.querySelectorAll('[role="dialog"], #sidebar-menus.open'), function(panel) {
      return !panel.hidden && panel.getAttribute('aria-hidden') !== 'true' && panel.getClientRects().length > 0 && getComputedStyle(panel).visibility !== 'hidden'
    })
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
      if (!deck.isConnected || toyboxShortcutsBlocked(event)) return
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
    if (event.repeat || toyboxShortcutsBlocked(event)) return
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
    var incomingDirection = body.classList.contains('toybox-page-leaving') ? body.dataset.toyboxPageDirection || '' : ''
    var recentPosts = body.querySelector('#recent-posts')
    try {
      incomingDirection = sessionStorage.getItem(TOYBOX_PAGE_MOTION_KEY) || incomingDirection
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
      // Reached only after AJAX replacement or a full-page fallback succeeds.
      document.dispatchEvent(new CustomEvent('toybox:page-arrived', {
        detail: {
          current: currentPage,
          total: pagination && parseInt(pagination.dataset.totalPages, 10) || currentPage,
          direction: incomingDirection
        }
      }))
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

    function navigateToPage(href, targetPage, trigger) {
      if (body.classList.contains('toybox-page-leaving') || targetPage === currentPage) return
      var targetUrl
      try {
        targetUrl = new URL(href, location.href)
      } catch (error) {
        return
      }
      if (targetUrl.origin !== location.origin) return
      targetUrl.hash = ''

      var direction = targetPage < currentPage ? 'previous' : 'next'
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      body.dataset.toyboxPageDirection = direction
      body.classList.remove('toybox-page-entering')
      body.classList.add('toybox-page-leaving')
      trigger.classList.add('is-toybox-activating')
      var pageSelect = pagination.querySelector('#toybox-page-select')
      if (pageSelect) pageSelect.disabled = true
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
        if (window.lazyLoadInstance) window.lazyLoadInstance.update()
        var focusSelector = trigger.tagName === 'SELECT' ? '#toybox-page-select' : trigger.classList.contains('prev') ? '.toybox-page-step.prev' : '.toybox-page-step.next'
        var focusTarget = importedPosts.querySelector(focusSelector) || importedPosts.querySelector('#toybox-page-select')
        if (focusTarget && focusTarget.disabled) focusTarget = importedPosts.querySelector('#toybox-page-select')
        if (focusTarget) focusTarget.focus({ preventScroll: true })
        window.requestAnimationFrame(function() {
          window.scrollTo({ top: previousScrollTop, left: 0, behavior: 'auto' })
        })
      }).catch(function() {
        location.assign(targetUrl.href)
      })
    }

    pagination.querySelectorAll('a[data-toybox-page]').forEach(function(link) {
      link.addEventListener('click', function(event) {
        if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || link.target === '_blank') return
        event.preventDefault()
        event.stopPropagation()
        navigateToPage(link.href, parseInt(link.dataset.toyboxPage, 10), link)
      })
    })
    var picker = pagination.querySelector('#toybox-page-select')
    if (picker) picker.addEventListener('change', function() {
      var selected = picker.options[picker.selectedIndex]
      navigateToPage(selected.value, parseInt(selected.dataset.page, 10), picker)
    })
  }

  function enhanceToyboxHome() {
    var body = document.body
    var posts = document.getElementById('recent-posts')
    var stage = posts && posts.querySelector('.toybox-stage')
    if (!stage || posts.dataset.toyboxReady) return
    var deck = stage.querySelector('.toybox-recent-deck')
    var viewport = deck.querySelector('.toybox-card-row')
    var track = deck.querySelector('.toybox-card-track')
    var cards = Array.prototype.slice.call(track.querySelectorAll('.recent-post-item'))
    var pagination = posts.querySelector('#pagination')
    var currentPage = parseInt(pagination.dataset.currentPage, 10) || 1
    var totalPage = parseInt(pagination.dataset.totalPages, 10) || 1
    cards.forEach(function(card, index) {
      setCartridgeCardMode(card, index === 0, currentPage, cards.length)
    })
    deck.querySelectorAll('[data-toybox-index]').forEach(function(button, index) {
      bindToyboxText(button, 'home.selectIndex', { index: index + 1 }, 'aria-label')
    })
    setupToyboxCarousel(stage, deck, viewport, track, cards, currentPage)
    bindToyboxText(pagination, 'home.cartridgePagination', { current: currentPage, total: totalPage }, 'aria-label')
    pagination.querySelectorAll('.toybox-page-step').forEach(function(link) {
      var key = link.classList.contains('prev') ? 'common.previousPage' : 'common.nextPage'
      bindToyboxText(link, key, null, 'aria-label')
      bindToyboxText(link, key, null, 'title')
    })
    deck.querySelectorAll('[data-toybox-direction]').forEach(function(button) {
      bindToyboxText(button, button.dataset.toyboxDirection === 'previous' ? 'home.previous' : 'home.next', null, 'title')
    })
    setupToyboxPageMotion(body, pagination, currentPage)
    posts.dataset.toyboxReady = '1'
  }

  function addHudChip(root, className, text) {
    var chip = document.createElement('span')
    chip.className = className
    chip.textContent = text
    root.appendChild(chip)
    return chip
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

  function setupReadingProgress() {
    var post = document.querySelector('#body-wrap.post #post')
    var article = post && post.querySelector('#article-container')
    var meter = article && post.querySelector('.pixel-reading-meter')
    if (!meter || (readingProgressTarget && readingProgressTarget.meter === meter)) return

    // The reading layout is rendered by Hexo; only progress is enhanced here.
    readingProgressTarget = {
      article: article,
      meter: meter,
      value: meter.querySelector('.pixel-reading-meter-value'),
      path: normPath(location.pathname)
    }
    bindReadingProgress()
    if (readingProgressObserver) readingProgressObserver.disconnect()
    if (window.ResizeObserver) {
      readingProgressObserver = new window.ResizeObserver(scheduleReadingProgress)
      readingProgressObserver.observe(article)
    }
    scheduleReadingProgress()
  }

  function updateReadingProgress() {
    readingProgressFrame = 0
    var target = readingProgressTarget
    if (!target || !target.article.isConnected || !target.meter.isConnected) return

    var rect = target.article.getBoundingClientRect()
    var startLine = window.innerHeight * 0.28
    var travel = Math.max(1, target.article.scrollHeight - window.innerHeight * 0.55)
    var progress = Math.max(0, Math.min(100, Math.round(((startLine - rect.top) / travel) * 100)))

    // Unchanged text writes would still replace the text node and wake DOM observers.
    if (target.lastProgress !== progress) {
      target.lastProgress = progress
      target.meter.style.setProperty('--reading-progress', String(progress / 100))
      target.meter.setAttribute('aria-valuenow', String(progress))
      target.value.textContent = progress + '%'
    }

    if (progress >= 98 && markClearedPath(target.path)) applyClearedState()
    if (window.ToyboxSave) window.ToyboxSave.update({ article: target.article, path: target.path, progress: progress })
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

  function decorateErrorPage() {
    var info = document.querySelector('#body-wrap.error404 .error-content .error-info')
    if (!info || info.querySelector('.pixel-error-actions')) return

    var actions = document.createElement('div')
    actions.className = 'pixel-error-actions'

    var home = document.createElement('a')
    home.href = rootPath('')
    home.className = 'pixel-error-action is-home'
    bindToyboxText(home, 'notFound.home', null, null, '返回主页')
    actions.appendChild(home)

    var archive = document.createElement('a')
    archive.href = rootPath('archives/')
    archive.className = 'pixel-error-action'
    bindToyboxText(archive, 'notFound.archives', null, null, '查看归档')
    actions.appendChild(archive)

    info.appendChild(actions)
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
  }

  // Built on first open: the 123-cell lab stays out of the homepage DOM until used.
  function buildSpritePanel() {
    var panel = document.createElement('section')
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

    var closeButton = panel.querySelector('.pixel-sprite-test-close')
    var filters = panel.querySelector('.pixel-sprite-test-filters')
    var status = panel.querySelector('.pixel-sprite-test-status')
    var grid = panel.querySelector('.pixel-sprite-test-grid')
    bindToyboxText(panel.querySelector('.pixel-sprite-test-header span'), 'sprite.runtimeCount', { count: 123 }, null, '123 个运行时素材')
    bindToyboxText(closeButton, 'sprite.close', null, 'aria-label', '关闭 Sprite 测试台')
    bindToyboxText(closeButton, 'sprite.close', null, 'title', '关闭 Sprite 测试台')
    bindToyboxText(filters, 'sprite.filterLabel', null, 'aria-label', '筛选素材')
    bindToyboxText(panel.querySelector('[data-sprite-filter="all"]'), 'sprite.filterAll', null, null, '全部')
    bindToyboxText(panel.querySelector('[data-sprite-filter="retro"]'), 'sprite.filterRetro', null, null, '街机')
    bindToyboxText(panel.querySelector('[data-sprite-filter="cute"]'), 'sprite.filterCute', null, null, '可爱')
    bindToyboxText(panel.querySelector('[data-sprite-filter="platform"]'), 'sprite.filterPlatform', null, null, '平台')
    bindToyboxText(status, 'sprite.dropHint', null, null, '点击素材可投放到侧边轨道')
    grid.querySelectorAll('.pixel-sprite-test-cell').forEach(function(cell) {
      bindToyboxText(cell, 'sprite.preview', { index: String(cell.dataset.spriteIndex).padStart(3, '0') }, 'aria-label')
    })

    closeButton.addEventListener('click', function() {
      panel.hidden = true
      var currentButton = document.getElementById('pixel-sprite-test-btn')
      if (currentButton) {
        currentButton.classList.remove('is-active')
        currentButton.setAttribute('aria-expanded', 'false')
        bindToyboxText(currentButton.querySelector('.toybox-action-label'), 'rightside.spriteLab', null, null, 'Sprite 测试台')
        currentButton.focus()
      }
    })

    filters.addEventListener('click', function(event) {
      var filterButton = event.target.closest('[data-sprite-filter]')
      if (!filterButton) return
      var filter = filterButton.dataset.spriteFilter
      filters.querySelectorAll('[data-sprite-filter]').forEach(function(item) {
        item.classList.toggle('is-active', item === filterButton)
      })
      grid.querySelectorAll('.pixel-sprite-test-cell').forEach(function(cell) {
        cell.hidden = filter !== 'all' && cell.dataset.spriteGroup !== filter
      })
    })

    grid.addEventListener('click', function(event) {
      var cell = event.target.closest('.pixel-sprite-test-cell')
      if (!cell) return
      var index = Number(cell.dataset.spriteIndex)
      var groupKeys = { retro: 'sprite.groupRetro', cute: 'sprite.groupCute', platform: 'sprite.groupPlatform' }
      grid.querySelectorAll('.pixel-sprite-test-cell.is-active').forEach(function(item) {
        item.classList.remove('is-active')
      })
      cell.classList.add('is-active')
      bindToyboxText(status, 'sprite.previewStatus', {
        index: String(index).padStart(3, '0'),
        group: toyboxText(groupKeys[cell.dataset.spriteGroup])
      })
      window.dispatchEvent(new CustomEvent('pixel-sprite-preview', { detail: { index: index } }))
    })

    document.addEventListener('keydown', function(event) {
      if (event.key !== 'Escape' || panel.hidden) return
      closeButton.click()
    })
    return panel
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

    if (button.dataset.spriteTestBound) return
    button.dataset.spriteTestBound = 'true'
    button.addEventListener('click', function() {
      var lab = document.getElementById('pixel-sprite-test-panel') || buildSpritePanel()
      var open = lab.hidden
      lab.hidden = !open
      button.classList.toggle('is-active', open)
      button.setAttribute('aria-expanded', String(open))
      bindToyboxText(button, open ? 'rightside.closeSpriteLab' : 'rightside.spriteLab', null, 'aria-label')
      bindToyboxText(button.querySelector('.toybox-action-label'), open ? 'rightside.closeSpriteLab' : 'rightside.spriteLab', null, null, open ? '关闭 Sprite 测试台' : 'Sprite 测试台')
      if (open) {
        if (window.ToyboxSettings && window.ToyboxSettings.closePanel) window.ToyboxSettings.closePanel()
        lab.querySelector('.pixel-sprite-test-cell:not([hidden])').focus()
      }
    })
  }

  // Storage can be blocked entirely or refuse writes; the toggle then keeps its choice in memory.
  function readAnimationOff() {
    if (animationPreference !== null) return animationPreference === 'off'
    try {
      return window.localStorage.getItem(ANIMATION_KEY) === 'off'
    } catch (error) {
      return false
    }
  }

  function writeAnimationPreference(value) {
    try {
      window.localStorage.setItem(ANIMATION_KEY, value)
      animationPreference = null
    } catch (error) {
      animationPreference = value
    }
  }

  // ── 同步 rightside 手柄按钮初始状态 ─────────────────────────
  function syncBtn() {
    var b = document.getElementById('pixel-anim-btn')
    if (!b) return
    syncAnimButtonState(b, readAnimationOff())
    if (b.dataset.pixelToggleBound) return
    b.dataset.pixelToggleBound = 'true'
    b.addEventListener('click', function() {
      var wasOff = readAnimationOff()
      writeAnimationPreference(wasOff ? 'on' : 'off')
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

  function enhancePixelUi() {
    enhanceToyboxHome()
    markCoverFallbacks()
    decorateArticleMedia()
    setupReadingProgress()
    decorateErrorPage()
    applyClearedState()
    bindClearedStorage()
    enhanceSearchButton()
    syncBtn()
    setupSpriteTest()
    markActiveNav()
    if (window.ToyboxSave) window.ToyboxSave.refresh()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhancePixelUi)
  } else {
    enhancePixelUi()
  }

  document.addEventListener('toybox:locale-change', function() {
    applyClearedState()
    syncBtn()
  })
})()
