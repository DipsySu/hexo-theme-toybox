/**
 * Refer to hexo-generator-searchdb
 * https://github.com/next-theme/hexo-generator-searchdb/blob/main/dist/search.js
 * Adapted for Hexo Theme Toybox.
 */

class LocalSearch {
  constructor ({
    path = '',
    unescape = false,
    top_n_per_article = 1
  }) {
    this.path = path
    this.unescape = unescape
    this.top_n_per_article = top_n_per_article
    this.isfetched = false
    this.datas = null
  }

  getIndexByWord (words, text, caseSensitive = false) {
    const index = []
    const included = new Set()

    if (!caseSensitive) {
      text = text.toLowerCase()
    }
    words.forEach(word => {
      if (this.unescape) {
        const div = document.createElement('div')
        div.innerText = word
        word = div.innerHTML
      }
      const wordLen = word.length
      if (wordLen === 0) return
      let startPosition = 0
      let position = -1
      if (!caseSensitive) {
        word = word.toLowerCase()
      }
      while ((position = text.indexOf(word, startPosition)) > -1) {
        index.push({ position, word })
        included.add(word)
        startPosition = position + wordLen
      }
    })
    // Sort index by position of keyword
    index.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position
      }
      return right.word.length - left.word.length
    })
    return [index, included]
  }

  // Merge hits into slices
  mergeIntoSlice (start, end, index) {
    let item = index[0]
    let { position, word } = item
    const hits = []
    const count = new Set()
    while (position + word.length <= end && index.length !== 0) {
      count.add(word)
      hits.push({
        position,
        length: word.length
      })
      const wordEnd = position + word.length

      // Move to next position of hit
      index.shift()
      while (index.length !== 0) {
        item = index[0]
        position = item.position
        word = item.word
        if (wordEnd > position) {
          index.shift()
        } else {
          break
        }
      }
    }
    return {
      hits,
      start,
      end,
      count: count.size
    }
  }

  // Highlight title and content
  highlightKeyword (val, slice) {
    let result = ''
    let index = slice.start
    for (const { position, length } of slice.hits) {
      result += val.substring(index, position)
      index = position + length
      result += `<mark class="search-keyword">${val.substr(position, length)}</mark>`
    }
    result += val.substring(index, slice.end)
    return result
  }

  getResultItems (keywords) {
    const resultItems = []
    // Entries carry lower-cased copies, so only the keywords need folding here.
    const words = keywords.map(word => word.toLowerCase())
    this.datas.forEach(({ title, content, url, titleLc, contentLc }) => {
      // The number of different keywords included in the article.
      const [indexOfTitle, keysOfTitle] = this.getIndexByWord(words, titleLc, true)
      const [indexOfContent, keysOfContent] = this.getIndexByWord(words, contentLc, true)
      const includedCount = new Set([...keysOfTitle, ...keysOfContent]).size

      // Show search results
      const hitCount = indexOfTitle.length + indexOfContent.length
      if (hitCount === 0) return

      const titleHtml = indexOfTitle.length ? this.highlightKeyword(title, this.mergeIntoSlice(0, title.length, indexOfTitle)) : title

      let slicesOfContent = []
      while (indexOfContent.length !== 0) {
        const item = indexOfContent[0]
        const { position } = item
        // Cut out 120 characters. The maxlength of .search-input is 80.
        const start = Math.max(0, position - 20)
        const end = Math.min(content.length, position + 100)
        slicesOfContent.push(this.mergeIntoSlice(start, end, indexOfContent))
      }

      // Sort slices in content by included keywords' count and hits' count
      slicesOfContent.sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count
        } else if (left.hits.length !== right.hits.length) {
          return right.hits.length - left.hits.length
        }
        return left.start - right.start
      })

      // Select top N slices in content
      const upperBound = parseInt(this.top_n_per_article, 10)
      if (upperBound >= 0) {
        slicesOfContent = slicesOfContent.slice(0, upperBound)
      }

      url = new URL(url, location.origin)
      url.searchParams.append('highlight', keywords.join(' '))
      const href = url.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

      let resultItem = `<div class="local-search-hit-item"><a href="${href}"><span class="search-result-title">${titleHtml}</span>`

      slicesOfContent.forEach(slice => {
        resultItem += `<p class="search-result">${this.highlightKeyword(content, slice)}...</p>`
      })

      resultItem += '</a></div>'
      resultItems.push({
        item: resultItem,
        id: resultItems.length,
        hitCount,
        includedCount
      })
    })
    return resultItems
  }

  fetchData () {
    if (this.isfetched) return Promise.resolve(true)
    if (this.request) return this.request
    this.state = 'loading'
    window.dispatchEvent(new Event('search:loading'))
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
    this.request = fetch(this.path, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Search index unavailable')
        return response.text()
      })
      .then(res => {
        let entries
        if (this.path.endsWith('json')) entries = JSON.parse(res)
        else {
          const xml = new DOMParser().parseFromString(res, 'text/xml')
          if (xml.querySelector('parsererror')) throw new Error('Invalid search index')
          entries = [...xml.querySelectorAll('entry')].map(element => ({
            title: element.querySelector('title')?.textContent,
            content: element.querySelector('content')?.textContent,
            url: element.querySelector('url')?.textContent
          }))
        }
        if (!Array.isArray(entries)) throw new Error('Invalid search index')
        this.datas = entries.filter(data => data && data.title && data.url).map(data => {
          const url = new URL(data.url, location.origin)
          if (!/^https?:$/.test(url.protocol)) return null
          const title = escape(String(data.title).trim())
          const content = escape(String(data.content || '').trim().replace(/<[^>]+>/g, ''))
          return {
            title,
            content,
            url: url.href,
            titleLc: title.toLowerCase(),
            contentLc: content.toLowerCase()
          }
        }).filter(Boolean)
        this.isfetched = true
        this.state = 'loaded'
        window.dispatchEvent(new Event('search:loaded'))
        return true
      })
      .catch(() => {
        this.state = 'error'
        this.isfetched = false
        window.dispatchEvent(new Event('search:error'))
        return false
      })
      .finally(() => {
        clearTimeout(timeout)
        this.request = null
      })
    return this.request
  }

  // Highlight by wrapping node in mark elements with the given class name
  highlightText (node, slice, className) {
    const val = node.nodeValue
    let index = slice.start
    const children = []
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position))
      index = position + length
      const mark = document.createElement('mark')
      mark.className = className
      mark.appendChild(document.createTextNode(val.substr(position, length)))
      children.push(text, mark)
    }
    node.nodeValue = val.substring(index, slice.end)
    children.forEach(element => {
      node.parentNode.insertBefore(element, node)
    })
  }

  // Highlight the search words provided in the url in the text
  highlightSearchWords (body) {
    const params = new URL(location.href).searchParams.get('highlight')
    const keywords = params ? params.split(' ') : []
    if (!keywords.length || !body) return
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    const allNodes = []
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea, .mermaid')) allNodes.push(walk.currentNode)
    }
    allNodes.forEach(node => {
      const [indexOfNode] = this.getIndexByWord(keywords, node.nodeValue)
      if (!indexOfNode.length) return
      const slice = this.mergeIntoSlice(0, node.nodeValue.length, indexOfNode)
      this.highlightText(node, slice, 'search-keyword')
    })
  }
}

;(() => {
// Search
  const { path, top_n_per_article, unescape, languages } = GLOBAL_CONFIG.localSearch
  const localSearch = new LocalSearch({
    path,
    top_n_per_article,
    unescape
  })

  const input = document.querySelector('#local-search-input input')
  const statsItem = document.getElementById('local-search-stats-wrap')

  const inputEventFunction = () => {
    if (!localSearch.isfetched) return
    const searchText = input.value.trim().toLowerCase()
    const keywords = searchText.split(/[-\s]+/)
    const container = document.getElementById('local-search-results')
    let resultItems = []
    if (searchText.length > 0) {
    // Perform local searching
      resultItems = localSearch.getResultItems(keywords)
    }
    if (keywords.length === 1 && keywords[0] === '') {
      container.classList.add('no-result')
      container.textContent = ''
      statsItem.textContent = ''
    } else if (resultItems.length === 0) {
      container.textContent = ''
      container.classList.remove('no-result')
      statsItem.textContent = languages.hits_empty.replace('${query}', searchText)
    } else {
      resultItems.sort((left, right) => {
        if (left.includedCount !== right.includedCount) {
          return right.includedCount - left.includedCount
        } else if (left.hitCount !== right.hitCount) {
          return right.hitCount - left.hitCount
        }
        return right.id - left.id
      })

      const stats = languages.hits_stats.replace(/\$\{hits}/, resultItems.length)

      container.classList.remove('no-result')
      container.innerHTML = `<div class="search-result-list">${resultItems.map(result => result.item).join('')}</div>`
      statsItem.innerHTML = `<hr><div class="search-result-stats">${stats}</div>`
    }
  }

  const $searchMask = document.getElementById('search-mask')
  const $searchDialog = document.querySelector('#local-search .search-dialog')
  const $loadDataItem = document.getElementById('loading-database')
  const $error = document.getElementById('search-error')
  let previousFocus
  let previousOverflow = ''

  const onDialogKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearch()
    } else if (event.key === 'Tab') {
      const controls = [...$searchDialog.querySelectorAll('button, input, a[href]')].filter(el => el.getClientRects().length && !el.disabled)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const openSearch = () => {
    if ($searchDialog.classList.contains('is-open')) return
    if (window.ToyboxSettings) window.ToyboxSettings.closePanel()
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    $searchMask.style.display = 'block'
    $searchDialog.classList.add('is-open')
    $searchDialog.setAttribute('aria-hidden', 'false')
    document.addEventListener('keydown', onDialogKeydown)
    input.focus()
    localSearch.fetchData()
  }

  const closeSearch = () => {
    if (!$searchDialog.classList.contains('is-open')) return
    document.body.style.overflow = previousOverflow
    $searchDialog.classList.remove('is-open')
    $searchDialog.setAttribute('aria-hidden', 'true')
    $searchMask.style.display = 'none'
    document.removeEventListener('keydown', onDialogKeydown)
    if (previousFocus && previousFocus.isConnected) previousFocus.focus()
  }

  // Results are rebuilt from the whole index, so wait for a short typing pause.
  let inputTimer = 0
  input.addEventListener('input', () => {
    clearTimeout(inputTimer)
    inputTimer = setTimeout(inputEventFunction, 120)
  })
  document.querySelector('#local-search .search-close-button').addEventListener('click', closeSearch)
  document.getElementById('search-retry').addEventListener('click', () => localSearch.fetchData())
  $searchMask.addEventListener('click', closeSearch)
  window.addEventListener('search:loading', () => {
    $loadDataItem.hidden = false
    $error.hidden = true
    $searchDialog.setAttribute('aria-busy', 'true')
  })
  window.addEventListener('search:error', () => {
    $loadDataItem.hidden = true
    $error.hidden = false
    $searchDialog.setAttribute('aria-busy', 'false')
  })
  window.addEventListener('search:loaded', () => {
    $loadDataItem.hidden = true
    $error.hidden = true
    $searchDialog.setAttribute('aria-busy', 'false')
    inputEventFunction()
  })
  // Warm the index once the page has finished loading and the main thread is idle;
  // opening the dialog still fetches it on demand.
  const preloadIndex = () => {
    if (navigator.connection && navigator.connection.saveData) return
    if (window.requestIdleCallback) window.requestIdleCallback(() => localSearch.fetchData(), { timeout: 5000 })
    else setTimeout(() => localSearch.fetchData(), 1500)
  }

  const trigger = document.querySelector('#search-button > .search')
  if (trigger) trigger.addEventListener('click', openSearch)
  if (GLOBAL_CONFIG.localSearch.preload) {
    if (document.readyState === 'complete') preloadIndex()
    else window.addEventListener('load', preloadIndex, { once: true })
  }
  localSearch.highlightSearchWords(document.getElementById('article-container'))
})()
