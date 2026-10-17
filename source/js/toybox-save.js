;(function () {
  'use strict'

  // Local "Continue Reading" save: one in-progress article per Hexo root,
  // stored only in this browser and restored only from the resume link.
  if (window.ToyboxSave) return

  var VERSION = 1
  var COMPLETE_PROGRESS = 98
  var WRITE_DELAY = 1000
  var RESTORE_WAIT = 1500
  var COMPLETION_TTL = 30 * 60 * 1000
  var TEXT_LIMIT = 160
  var RESUME_HASH = '#toybox-resume'
  var IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i
  var CONTROL_CHARS = /[\u0000-\u001f\u007f]/
  var INTERRUPT_EVENTS = ['wheel', 'touchstart', 'keydown']
  var NAVIGATION_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']

  var reading = null
  var pending = null
  var writeTimer = 0

  function siteRoot() {
    var root = String(window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root || '/')
    if (root.charAt(0) !== '/') root = '/' + root
    return root.replace(/\/?$/, '/')
  }

  function saveKey() {
    return 'toyboxResume:v1:' + siteRoot()
  }

  function completionKey() {
    return 'toyboxResumeClear:v1:' + siteRoot()
  }

  function normPath(path) {
    path = String(path || '').replace(/index\.html?$/i, '')
    if (path.length > 1) path = path.replace(/\/+$/, '')
    return path || '/'
  }

  function cleanText(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim().slice(0, TEXT_LIMIT)
  }

  function isNumberBetween(value, min, max) {
    return typeof value === 'number' && isFinite(value) && value >= min && value <= max
  }

  function validAnchor(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= 200 && !CONTROL_CHARS.test(id)
  }

  // Only root-relative URLs inside the Hexo root are accepted; absolute,
  // protocol-relative and scriptable values never reach the page.
  function siteUrl(raw) {
    if (typeof raw !== 'string' || !raw || raw.length > 2048 || CONTROL_CHARS.test(raw)) return null
    if (raw.charAt(0) !== '/' || /^\/[\/\\]/.test(raw) || raw.indexOf('\\') !== -1) return null
    try {
      var url = new URL(raw, window.location.origin)
      var decoded = decodeURIComponent(url.pathname)
      if (CONTROL_CHARS.test(decoded) || decoded.indexOf('\\') !== -1 || /(?:^|\/)\.\.?(?:\/|$)/.test(decoded)) return null
      return url.origin === window.location.origin && url.pathname.indexOf(siteRoot()) === 0 ? url : null
    } catch (error) {
      return null
    }
  }

  function postPath(raw) {
    var url = siteUrl(raw)
    if (!url || normPath(url.pathname) === normPath(siteRoot())) return ''
    return url.pathname
  }

  function coverPath(raw) {
    if (typeof raw !== 'string') return ''
    if (/^https?:\/\//i.test(raw)) {
      try {
        var absolute = new URL(raw)
        if (absolute.origin !== window.location.origin) return ''
        raw = absolute.pathname + absolute.search
      } catch (error) {
        return ''
      }
    }
    var url = siteUrl(raw)
    return url && IMAGE_PATH.test(url.pathname) ? url.pathname + url.search : ''
  }

  function validRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== VERSION) return null
    var path = postPath(value.path)
    var title = typeof value.title === 'string' ? cleanText(value.title) : ''
    if (!path || !title || !isNumberBetween(value.progress, 1, COMPLETE_PROGRESS - 1)) return null
    if (!isNumberBetween(value.updatedAt, 1, 8640000000000000)) return null

    var record = {
      version: VERSION,
      path: path,
      title: title,
      progress: Math.min(COMPLETE_PROGRESS - 1, Math.round(value.progress)),
      updatedAt: value.updatedAt
    }
    if (value.cover !== undefined) {
      record.cover = coverPath(value.cover)
      if (!record.cover) return null
    }
    if (value.anchorId !== undefined) {
      if (!validAnchor(value.anchorId) || !isNumberBetween(value.anchorRatio, 0, 1)) return null
      record.anchorId = value.anchorId
      record.anchorRatio = value.anchorRatio
    }
    return record
  }

  function readSave() {
    try {
      var raw = window.localStorage.getItem(saveKey())
      return raw ? validRecord(JSON.parse(raw)) : null
    } catch (error) {
      return null
    }
  }

  function writeSave(record) {
    try {
      window.localStorage.setItem(saveKey(), JSON.stringify(record))
    } catch (error) {}
  }

  function removeSave() {
    try {
      window.localStorage.removeItem(saveKey())
    } catch (error) {}
  }

  function emit(type, detail) {
    try {
      document.dispatchEvent(new window.CustomEvent(type, { detail: detail }))
    } catch (error) {}
  }

  function readingLine() {
    return (window.innerHeight || 0) * 0.28
  }

  function headingsOf(article) {
    return Array.prototype.slice.call(article.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
  }

  // Position is stored as heading + fraction of that section so it survives
  // font, viewport and image layout changes better than a pixel offset.
  function sectionPosition(article) {
    var line = readingLine()
    var headings = headingsOf(article)
    var current = -1
    for (var index = 0; index < headings.length; index++) {
      if (headings[index].getBoundingClientRect().top > line) break
      current = index
    }
    if (current < 0 || !validAnchor(headings[current].id)) return null

    var top = headings[current].getBoundingClientRect().top
    var end = current + 1 < headings.length
      ? headings[current + 1].getBoundingClientRect().top
      : article.getBoundingClientRect().bottom
    var span = end - top
    var ratio = span > 0 ? Math.max(0, Math.min(1, (line - top) / span)) : 0
    return { anchorId: headings[current].id, anchorRatio: Math.round(ratio * 10000) / 10000 }
  }

  function restoreTop(article, saved) {
    var scrollY = window.pageYOffset || window.scrollY || 0
    var line = readingLine()
    if (saved.anchorId) {
      var headings = headingsOf(article)
      for (var index = 0; index < headings.length; index++) {
        if (headings[index].id !== saved.anchorId) continue
        var top = headings[index].getBoundingClientRect().top
        var end = index + 1 < headings.length
          ? headings[index + 1].getBoundingClientRect().top
          : article.getBoundingClientRect().bottom
        return scrollY + top + Math.max(0, end - top) * saved.anchorRatio - line
      }
    }

    // Inverse of the reading meter formula in pixel-anim-toggle.js.
    var rect = article.getBoundingClientRect()
    var travel = Math.max(1, article.scrollHeight - (window.innerHeight || 0) * 0.55)
    return scrollY + rect.top - line + travel * saved.progress / 100
  }

  function articleTitle() {
    var heading = document.querySelector('#post-info h1')
    return heading ? cleanText(heading.textContent) : ''
  }

  function articleCover() {
    var image = document.querySelector('#post-info .pixel-article-sleeve-art')
    return image ? coverPath(image.getAttribute('data-lazy-src') || image.getAttribute('src') || '') : ''
  }

  function flush() {
    if (writeTimer) window.clearTimeout(writeTimer)
    writeTimer = 0
    var next = pending
    pending = null
    if (!next) return

    var state = next.state
    var record = { version: VERSION, path: state.path, title: state.title, progress: next.progress, updatedAt: Date.now() }
    if (state.cover) record.cover = state.cover
    var position = state.article.isConnected === false ? null : sectionPosition(state.article)
    if (position) {
      record.anchorId = position.anchorId
      record.anchorRatio = position.anchorRatio
    }
    record = validRecord(record)
    if (record) writeSave(record)
  }

  function clearMarker() {
    if (window.location.hash !== RESUME_HASH) return
    try {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    } catch (error) {}
  }

  // One restore attempt per explicit resume link: wait for fonts (bounded),
  // then scroll once. Any reader input cancels the pending jump.
  function restore(state) {
    var saved = readSave()
    if (!saved || normPath(saved.path) !== normPath(state.path)) {
      clearMarker()
      return
    }

    var done = false
    var settled = false
    var waitTimer = 0
    state.restoring = true

    function finish() {
      if (done) return
      done = true
      window.clearTimeout(waitTimer)
      INTERRUPT_EVENTS.forEach(function (type) {
        window.removeEventListener(type, interrupt, true)
      })
      state.restoring = false
      state.cancelRestore = null
      clearMarker()
    }

    function interrupt(event) {
      if (event && event.type === 'keydown' && NAVIGATION_KEYS.indexOf(event.key) === -1) return
      finish()
    }

    function apply() {
      if (done) return
      if (reading === state && state.article.isConnected !== false && window.location.hash === RESUME_HASH && normPath(window.location.pathname) === normPath(state.path)) {
        var top = restoreTop(state.article, saved)
        if (isFinite(top)) window.scrollTo({ top: Math.max(0, Math.round(top)), left: 0, behavior: 'auto' })
      }
      finish()
    }

    function layoutReady() {
      if (settled || done) return
      settled = true
      window.requestAnimationFrame(apply)
    }

    INTERRUPT_EVENTS.forEach(function (type) {
      window.addEventListener(type, interrupt, { capture: true, passive: true })
    })
    state.cancelRestore = finish
    waitTimer = window.setTimeout(layoutReady, RESTORE_WAIT)
    var fonts = document.fonts && document.fonts.ready
    if (fonts && typeof fonts.then === 'function') fonts.then(layoutReady, layoutReady)
    else layoutReady()
  }

  function beginReading(article, path) {
    flush()
    if (reading && reading.cancelRestore) reading.cancelRestore()
    reading = {
      article: article,
      path: path,
      title: articleTitle(),
      cover: articleCover(),
      restoring: false,
      completed: false,
      cancelRestore: null
    }
    if (window.location.hash === RESUME_HASH) restore(reading)
  }

  function complete(state) {
    if (state.completed) return
    state.completed = true
    if (pending && pending.state === state) pending = null
    var saved = readSave()
    if (saved && normPath(saved.path) === normPath(state.path)) removeSave()
    try {
      window.sessionStorage.setItem(completionKey(), JSON.stringify({ path: state.path, at: Date.now() }))
    } catch (error) {}
    emit('toybox:reading-complete', { path: state.path, title: state.title, returned: false })
  }

  function trackProgress(detail) {
    if (!detail || !detail.article) return
    var path = postPath(window.location.pathname)
    if (!path || (detail.path && normPath(detail.path) !== normPath(path))) return
    if (!reading || reading.article !== detail.article || reading.path !== path) beginReading(detail.article, path)

    var progress = Number(detail.progress)
    if (!isFinite(progress) || reading.restoring) return
    progress = Math.max(0, Math.min(100, Math.round(progress)))
    if (progress >= COMPLETE_PROGRESS) {
      complete(reading)
      return
    }
    // 0% never replaces an existing save, and a finished article is not
    // resurrected when the reader scrolls back up.
    if (progress < 1 || reading.completed) return
    pending = { state: reading, progress: progress }
    if (!writeTimer) writeTimer = window.setTimeout(flush, WRITE_DELAY)
  }

  function update(detail) {
    try {
      trackProgress(detail)
    } catch (error) {}
  }

  function takeCompletion() {
    var raw = null
    try {
      raw = window.sessionStorage.getItem(completionKey())
      if (raw === null) return null
      window.sessionStorage.removeItem(completionKey())
      var value = JSON.parse(raw)
      var path = value && postPath(value.path)
      var now = Date.now()
      if (!path || !isNumberBetween(value.at, now - COMPLETION_TTL, now + 60000)) return null
      return { path: path }
    } catch (error) {
      return null
    }
  }

  function setText(el, text) {
    if (el) el.textContent = text
  }

  function renderCover(image, cover) {
    if (!image) return
    if (!cover) {
      image.hidden = true
      image.removeAttribute('src')
      return
    }
    if (!image.dataset.toyboxResumeBound) {
      image.dataset.toyboxResumeBound = '1'
      image.addEventListener('error', function () {
        image.hidden = true
        image.removeAttribute('src')
      })
    }
    if (image.getAttribute('src') !== cover) image.setAttribute('src', cover)
    image.hidden = false
  }

  function focusHomeHeading() {
    var heading = document.getElementById('toybox-recent-title')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }

  function bindClear(mount) {
    var button = mount.querySelector('.toybox-resume-clear')
    if (!button || button.dataset.toyboxResumeBound) return
    button.dataset.toyboxResumeBound = '1'
    button.addEventListener('click', function (event) {
      if (event && event.preventDefault) event.preventDefault()
      removeSave()
      mount.hidden = true
      focusHomeHeading()
    })
  }

  function renderResume(mount) {
    if (!mount) return
    bindClear(mount)
    var record = readSave()
    var link = mount.querySelector('.toybox-resume-link')
    if (!record || !link) {
      mount.hidden = true
      return
    }

    var params = { title: record.title, progress: record.progress }
    link.setAttribute('href', record.path + RESUME_HASH)
    if (window.ToyboxSettings) window.ToyboxSettings.bind(link, 'home.resumeTitle', params, 'aria-label')
    else link.setAttribute('aria-label', record.title + ' · ' + record.progress + '%')
    setText(mount.querySelector('.toybox-resume-title'), record.title)
    setText(mount.querySelector('.toybox-resume-value'), record.progress + '%')
    var fill = mount.querySelector('.toybox-resume-fill')
    if (fill) fill.style.width = record.progress + '%'
    mount.style.setProperty('--resume-progress', record.progress + '%')
    renderCover(mount.querySelector('.toybox-resume-cover'), record.cover)
    mount.hidden = false
  }

  function homeMount() {
    var posts = document.getElementById('recent-posts')
    return posts ? posts.querySelector('.toybox-resume') : null
  }

  function refresh() {
    try {
      var mount = homeMount()
      if (!mount) return
      renderResume(mount)
      var completed = takeCompletion()
      if (completed) emit('toybox:reading-complete', { path: completed.path, returned: true })
    } catch (error) {}
  }

  window.addEventListener('pagehide', function () {
    flush()
    if (reading && reading.cancelRestore) reading.cancelRestore()
  })
  window.addEventListener('pageshow', refresh)
  window.addEventListener('storage', function (event) {
    if (event.key !== null && event.key !== saveKey()) return
    try {
      renderResume(homeMount())
    } catch (error) {}
  })
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) flush()
  })

  window.ToyboxSave = {
    update: update,
    refresh: refresh
  }
})()
