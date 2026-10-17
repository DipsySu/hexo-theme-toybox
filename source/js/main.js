// vanilla-lazyload loads async (additional-js.pug) and builds its instance from these
// options as soon as it arrives, so theme init never waits on the CDN. Anything using
// window.lazyLoadInstance must tolerate it arriving late, or (CDN blocked) being
// replaced by btf.lazyloadFallback.
if (GLOBAL_CONFIG.islazyload) {
  window.lazyLoadOptions = { elements_selector: 'img', threshold: 0, data_src: 'lazy-src' }
  window.addEventListener('LazyLoad::Initialized', e => { window.lazyLoadInstance = e.detail.instance }, { once: true })
}

document.addEventListener('DOMContentLoaded', function () {
  let headerContentWidth, $nav
  let mobileSidebarOpen = false

  const adjustMenu = init => {
    if (init) {
      const childrenWidth = ele => Array.from(ele.children).reduce((width, child) => width + child.offsetWidth, 0)
      headerContentWidth = childrenWidth(document.querySelector('#blog-info > a')) + childrenWidth(document.getElementById('menus'))
      $nav = document.getElementById('nav')
    }
    $nav.classList.toggle('hide-menu', window.innerWidth <= 768 || headerContentWidth > $nav.offsetWidth - 120)
  }

  // sidebar menus
  const sidebarFn = {
    open: () => {
      const $body = document.body
      const $mask = document.getElementById('menu-mask')
      const scrollbar = window.innerWidth - $body.clientWidth
      if (scrollbar) $body.style.paddingRight = scrollbar + 'px'
      $body.style.overflow = 'hidden'
      $mask.style.display = 'block'
      $mask.style.animation = 'to_show 0.5s'
      document.getElementById('sidebar-menus').classList.add('open')
      mobileSidebarOpen = true
    },
    close: () => {
      const $body = document.body
      const $mask = document.getElementById('menu-mask')
      $body.style.overflow = ''
      $body.style.paddingRight = ''
      $mask.addEventListener('animationend', () => { $mask.style.display = ''; $mask.style.animation = '' }, { once: true })
      $mask.style.animation = 'to_hide 0.5s'
      document.getElementById('sidebar-menus').classList.remove('open')
      mobileSidebarOpen = false
    }
  }

  /**
   * 代碼
   * 只適用於Hexo默認的代碼渲染
   */
  const addHighlightTool = function () {
    const highLight = GLOBAL_CONFIG.highlight
    if (!highLight) return

    const { highlightCopy, highlightLang, highlightHeightLimit, plugin } = highLight
    const isHighlightShrink = GLOBAL_CONFIG_SITE.isHighlightShrink
    const isShowTool = highlightCopy || highlightLang || isHighlightShrink !== undefined
    const $figureHighlight = plugin === 'highlightjs' ? document.querySelectorAll('figure.highlight') : document.querySelectorAll('pre[class*="language-"]')

    if (!((isShowTool || highlightHeightLimit) && $figureHighlight.length)) return

    const isPrismjs = plugin === 'prismjs'
    const highlightShrinkClass = isHighlightShrink === true ? 'closed' : ''
    const highlightShrinkEle = isHighlightShrink !== undefined ? `<button type="button" class="fas fa-angle-down expand ${highlightShrinkClass}" aria-label="展开或收起代码" title="展开或收起代码" data-toybox-i18n-title="post.toggleCode" data-toybox-i18n-aria="post.toggleCode" aria-expanded="${isHighlightShrink !== true}"></button>` : ''
    const highlightCopyEle = highlightCopy ? '<div class="copy-notice" role="status"></div><button type="button" class="fas fa-copy copy-button" aria-label="复制代码" title="复制代码" data-toybox-i18n-title="post.copyCode" data-toybox-i18n-aria="post.copyCode"></button>' : ''

    const copy = ctx => {
      if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        document.execCommand('copy')
        const prevEle = ctx.previousElementSibling
        prevEle.textContent = GLOBAL_CONFIG.copy.success
        prevEle.style.opacity = 1
        setTimeout(() => { prevEle.style.opacity = 0 }, 700)
      } else {
        ctx.previousElementSibling.textContent = GLOBAL_CONFIG.copy.noSupport
      }
    }

    // click events
    const highlightCopyFn = (ele) => {
      const $buttonParent = ele.parentNode
      $buttonParent.classList.add('copy-true')
      const selection = window.getSelection()
      const range = document.createRange()
      const preCodeSelector = isPrismjs ? 'pre code' : 'table .code pre'
      range.selectNodeContents($buttonParent.querySelectorAll(`${preCodeSelector}`)[0])
      selection.removeAllRanges()
      selection.addRange(range)
      copy(ele.lastChild)
      selection.removeAllRanges()
      $buttonParent.classList.remove('copy-true')
    }

    const highlightShrinkFn = (ele) => {
      const $nextEle = [...ele.parentNode.children].slice(1)
      ele.firstChild.classList.toggle('closed')
      ele.firstChild.setAttribute('aria-expanded', String(!ele.firstChild.classList.contains('closed')))
      if (btf.isHidden($nextEle[$nextEle.length - 1])) {
        $nextEle.forEach(e => { e.style.display = 'block' })
      } else {
        $nextEle.forEach(e => { e.style.display = 'none' })
      }
    }

    const highlightToolsFn = function (e) {
      const $target = e.target.classList
      if ($target.contains('expand')) highlightShrinkFn(this)
      else if ($target.contains('copy-button')) highlightCopyFn(this)
    }

    const expandCode = function () {
      this.classList.toggle('expand-done')
    }

    function createEle (lang, item, service) {
      const fragment = document.createDocumentFragment()

      if (isShowTool) {
        const hlTools = document.createElement('div')
        hlTools.className = `highlight-tools ${highlightShrinkClass}`
        hlTools.innerHTML = highlightShrinkEle + lang + highlightCopyEle
        hlTools.addEventListener('click', highlightToolsFn)
        fragment.appendChild(hlTools)
      }

      if (highlightHeightLimit && item.offsetHeight > highlightHeightLimit + 30) {
        const ele = document.createElement('div')
        ele.className = 'code-expand-btn'
        ele.innerHTML = '<i class="fas fa-angle-double-down"></i>'
        ele.addEventListener('click', expandCode)
        fragment.appendChild(ele)
      }

      if (service === 'hl') {
        item.insertBefore(fragment, item.firstChild)
      } else {
        item.parentNode.insertBefore(fragment, item)
      }
    }

    $figureHighlight.forEach(item => {
      let langName = isPrismjs ? item.getAttribute('data-language') || 'Code' : item.getAttribute('class').split(' ')[1]
      if (!isPrismjs && (langName === 'plain' || langName === undefined)) langName = 'Code'
      if (isPrismjs) btf.wrap(item, 'figure', { class: 'highlight' })
      createEle(highlightLang ? `<div class="code-lang">${langName}</div>` : '', item, isPrismjs ? undefined : 'hl')
    })
  }

  /**
   * PhotoFigcaption
   */
  function addPhotoFigcaption () {
    document.querySelectorAll('#article-container img').forEach(function (item) {
      const altValue = item.title || item.alt
      if (altValue) {
        const ele = document.createElement('div')
        ele.className = 'img-alt is-center'
        ele.textContent = altValue
        item.parentNode.insertBefore(ele, item.nextSibling)
      }
    })
  }

  /**
   * rightside scroll percent
   */
  const rightsideScrollPercent = perNum => {
    const $goUp = document.getElementById('go-up')
    if (perNum < 95) {
      const $percent = $goUp.querySelector('.scroll-percent')
      $goUp.classList.add('show-percent')
      if ($percent.textContent !== String(perNum)) $percent.textContent = perNum
    } else {
      $goUp.classList.remove('show-percent')
    }
  }

  /**
   * 滾動處理
   */
  const scrollFn = function () {
    const $rightside = document.getElementById('rightside')
    const innerHeight = window.innerHeight + 56
    let initTop = 0
    // whether cssText last made #rightside visible; replaces a getComputedStyle probe
    let isRightsideShown = false
    const $header = document.getElementById('page-header')
    const isShowPercent = GLOBAL_CONFIG.percent.rightside

    // 當滾動條小于 56 的時候
    if (document.body.scrollHeight <= innerHeight) {
      $rightside.style.cssText = 'opacity: 1; transform: translateX(-58px)'
      return
    }

    // find the scroll direction
    const scrollDirection = currentTop => {
      const result = currentTop > initTop // true is down & false is up
      initTop = currentTop
      return result
    }

    const showRightside = () => {
      $rightside.style.cssText = 'opacity: 0.8; transform: translateX(-58px)'
      isRightsideShown = true
    }

    const scrollTask = btf.throttle(() => {
      // read layout once, before any write in this tick
      const currentTop = window.scrollY || document.documentElement.scrollTop
      const isShort = document.body.scrollHeight <= innerHeight
      const perNum = isShowPercent && btf.getScrollPercent(currentTop, document.body)
      const isDown = scrollDirection(currentTop)
      if (currentTop > 56) {
        if (isDown) {
          if ($header.classList.contains('nav-visible')) $header.classList.remove('nav-visible')
        } else {
          if (!$header.classList.contains('nav-visible')) $header.classList.add('nav-visible')
        }
        $header.classList.add('nav-fixed')
        if (!isRightsideShown) showRightside()
      } else {
        if (currentTop === 0) {
          $header.classList.remove('nav-fixed', 'nav-visible')
        }
        $rightside.style.cssText = "opacity: ''; transform: ''"
        isRightsideShown = false
      }

      isShowPercent && rightsideScrollPercent(perNum)

      if (isShort) showRightside()
    }, 200)

    window.addEventListener('scroll', scrollTask)
  }

  /**
  * toc,anchor
  */
  const scrollFnToDo = function () {
    const isAnchor = GLOBAL_CONFIG.isAnchor
    const $article = document.getElementById('article-container')
    const $cardTocLayout = document.getElementById('card-toc')
    const $cardToc = $cardTocLayout && $cardTocLayout.querySelector('.toc-content')
    // Defensive: a custom layout can set isToc without rendering #card-toc
    const isToc = GLOBAL_CONFIG_SITE.isToc && !!$cardToc

    if (!($article && (isToc || isAnchor))) return

    let $tocLink, autoScrollToc, $tocPercentage, isExpand

    if (isToc) {
      $tocLink = $cardToc.querySelectorAll('.toc-link')
      $tocPercentage = $cardTocLayout.querySelector('.toc-percentage')
      isExpand = $cardToc.classList.contains('is-expand')

      window.mobileToc = {
        open: (trigger) => {
          $cardTocLayout.classList.add('is-open')
          window.mobileToc.trigger = trigger
          document.querySelectorAll('[data-reader-action="toc"]').forEach(button => button.setAttribute('aria-expanded', 'true'))
          const firstLink = $cardToc.querySelector('.toc-link')
          firstLink && firstLink.focus({ preventScroll: true })
        },
        close: (restoreFocus = false) => {
          $cardTocLayout.classList.remove('is-open')
          document.querySelectorAll('[data-reader-action="toc"]').forEach(button => button.setAttribute('aria-expanded', 'false'))
          if (restoreFocus && window.mobileToc.trigger) window.mobileToc.trigger.focus({ preventScroll: true })
        }
      }

      // toc元素點擊
      $cardToc.addEventListener('click', e => {
        const $target = e.target.closest('.toc-link')
        if (!$target) return
        const heading = document.getElementById(decodeURIComponent($target.getAttribute('href').slice(1)))
        if (!heading) return
        e.preventDefault()
        const offset = parseFloat(window.getComputedStyle(heading).scrollMarginTop) || 80
        window.scrollTo({ top: Math.max(0, btf.getEleTop(heading) - offset), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        if (window.innerWidth <= 900) {
          window.mobileToc.close()
          heading.setAttribute('tabindex', '-1')
          heading.focus({ preventScroll: true })
        }
      })

      autoScrollToc = item => {
        const activePosition = item.getBoundingClientRect().top
        const sidebarScrollTop = $cardToc.scrollTop
        if (activePosition > (document.documentElement.clientHeight - 100)) {
          $cardToc.scrollTop = sidebarScrollTop + 150
        }
        if (activePosition < 100) {
          $cardToc.scrollTop = sidebarScrollTop - 150
        }
      }
    }

    // find head position & add active class
    const list = $article.querySelectorAll('h1,h2,h3,h4,h5,h6')
    let detectItem = ''
    const findHeadPosition = function (top) {
      let currentId = ''
      let currentIndex = ''

      list.forEach(function (ele, index) {
        if (top >= btf.getEleTop(ele) - (parseFloat(window.getComputedStyle(ele).scrollMarginTop) || 80) - 4) {
          const id = ele.id
          currentId = id ? '#' + encodeURI(id) : ''
          currentIndex = index
        }
      })

      if (detectItem === currentIndex) return

      if (isAnchor) btf.updateAnchor(currentId)

      detectItem = currentIndex

      if (isToc) {
        $cardToc.querySelectorAll('.active').forEach(i => { i.classList.remove('active') })

        if (currentId === '') {
          return
        }

        const currentActive = Array.from($tocLink).find(link => link.getAttribute('href') === currentId)
        if (!currentActive) return
        currentActive.classList.add('active')

        setTimeout(() => {
          autoScrollToc(currentActive)
        }, 0)

        if (isExpand) return
        let parent = currentActive.parentNode

        for (; !parent.matches('.toc'); parent = parent.parentNode) {
          if (parent.matches('li')) parent.classList.add('active')
        }
      }
    }

    // main of scroll
    window.tocScrollFn = btf.throttle(() => {
      const currentTop = window.scrollY || document.documentElement.scrollTop
      const percent = isToc && $tocPercentage && GLOBAL_CONFIG.percent.toc ? String(btf.getScrollPercent(currentTop, $article)) : ''
      findHeadPosition(currentTop)
      // skip identical writes: each textContent write is a DOM mutation the i18n observer rescans
      if (percent && $tocPercentage.textContent !== percent) $tocPercentage.textContent = percent
    }, 100)

    window.addEventListener('scroll', tocScrollFn)
  }

  /**
   * Rightside
   */
  const rightSideFn = {
    switchReadMode: (trigger) => { // read-mode
      const $body = document.body
      if ($body.classList.contains('read-mode')) return
      const preservePosition = change => {
        const article = document.getElementById('article-container')
        const blocks = article ? Array.from(article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, img')) : []
        const anchor = blocks.find(node => {
          const rect = node.getBoundingClientRect()
          return rect.top >= 180 && rect.top < window.innerHeight
        }) || blocks.find(node => node.getBoundingClientRect().bottom > 180)
        const top = anchor && anchor.getBoundingClientRect().top
        change()
        if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - top)
      }
      window.mobileToc && window.mobileToc.close()
      preservePosition(() => $body.classList.add('read-mode'))
      const newEle = document.createElement('button')
      newEle.type = 'button'
      newEle.className = 'fas fa-times exit-readmode'
      newEle.title = window.ToyboxSettings ? window.ToyboxSettings.t('rightside.exitReadMode') : '退出阅读模式'
      newEle.setAttribute('aria-label', newEle.title)
      newEle.dataset.toyboxI18nTitle = 'rightside.exitReadMode'
      newEle.dataset.toyboxI18nAria = 'rightside.exitReadMode'
      $body.appendChild(newEle)

      const clickFn = () => {
        preservePosition(() => $body.classList.remove('read-mode'))
        newEle.remove()
        newEle.removeEventListener('click', clickFn)
        if (trigger && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
      }

      newEle.addEventListener('click', clickFn)
      newEle.focus({ preventScroll: true })
    },
    scrollToTop: () => { // Back to top
      btf.scrollToDest(0, 500)
    },
    hideAsideBtn: button => { // Hide aside
      const $htmlDom = document.documentElement.classList
      const saveStatus = $htmlDom.contains('hide-aside') ? 'show' : 'hide'
      $htmlDom.toggle('hide-aside')
      try { window.localStorage.setItem('toybox-aside', saveStatus) } catch (error) {}
      button && button.setAttribute('aria-pressed', String(saveStatus === 'hide'))
    },

    runMobileToc: (trigger) => {
      const toc = document.getElementById('card-toc')
      if (!toc || !window.mobileToc) return
      if (!toc.classList.contains('is-open')) window.mobileToc.open(trigger)
      else window.mobileToc.close(true)
    }
  }

  document.addEventListener('click', function (e) {
    const $target = e.target.closest && e.target.closest('button, a')
    const toc = document.getElementById('card-toc')
    if (toc && toc.classList.contains('is-open') && !e.target.closest('#card-toc, [data-reader-action="toc"], #mobile-toc-button')) window.mobileToc.close()
    if ($target && $target.dataset.readerAction) {
      if ($target.dataset.readerAction === 'toc') rightSideFn.runMobileToc($target)
      if ($target.dataset.readerAction === 'close-toc') window.mobileToc && window.mobileToc.close(true)
      if ($target.dataset.readerAction === 'focus') rightSideFn.switchReadMode($target)
      return
    }
    if (!$target || !$target.closest('#rightside, #toybox-preferences-panel')) return
    switch ($target.id) {
      case 'go-up':
        rightSideFn.scrollToTop()
        break
      case 'mobile-toc-button':
        rightSideFn.runMobileToc($target)
        break
      case 'readmode':
        window.ToyboxSettings && window.ToyboxSettings.closePanel()
        rightSideFn.switchReadMode($target)
        break
      case 'hide-aside-btn':
        rightSideFn.hideAsideBtn($target)
        break
      default:
        break
    }
  })

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return
    const exit = document.querySelector('.exit-readmode')
    if (exit) exit.click()
    else if (window.mobileToc && document.querySelector('#card-toc.is-open')) window.mobileToc.close(true)
  })

  /**
   * table overflow
   */
  const addTableWrap = () => {
    document.querySelectorAll('#article-container :not(.highlight) > table, #article-container > table').forEach(item => {
      btf.wrap(item, 'div', { class: 'table-wrap' })
    })
  }

  const relativeDate = function (selector) {
    selector.forEach(item => {
      const timeVal = item.getAttribute('datetime')
      item.textContent = btf.diffDate(timeVal)
      item.style.display = 'inline'
    })
  }

  adjustMenu(true)
  $nav.classList.add('show')

  if (GLOBAL_CONFIG_SITE.isPost) {
    document.querySelectorAll('.toybox-reader-toolbar button[hidden]').forEach(button => { button.hidden = false })
    GLOBAL_CONFIG.relativeDate.post && relativeDate(document.querySelectorAll('#post-meta time'))
  } else {
    GLOBAL_CONFIG.relativeDate.homepage && relativeDate(document.querySelectorAll('#recent-posts time'))
  }

  scrollFnToDo()
  addHighlightTool()
  GLOBAL_CONFIG.isPhotoFigcaption && addPhotoFigcaption()
  scrollFn()
  btf.loadLightbox(document.querySelectorAll('#article-container img:not(.no-lightbox)'))
  addTableWrap()
  document.getElementById('toggle-menu').addEventListener('click', () => { sidebarFn.open() })

  window.addEventListener('resize', () => {
    adjustMenu(false)
    btf.isHidden(document.getElementById('toggle-menu')) && mobileSidebarOpen && sidebarFn.close()
  })
  document.getElementById('menu-mask').addEventListener('click', () => { sidebarFn.close() })
  // Sidebar sub-menu groups expand and collapse.
  document.querySelectorAll('#sidebar-menus .site-page.group').forEach(item => {
    item.addEventListener('click', () => { item.classList.toggle('hide') })
  })
})
