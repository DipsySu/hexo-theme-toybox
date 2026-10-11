;(function () {
  'use strict'

  // Progressive enhancement for collection views. Every link and count is
  // already rendered on the server; this only filters, sorts, and jumps.
  function bindText (el, key, params) {
    if (window.ToyboxSettings) window.ToyboxSettings.bind(el, key, params)
  }

  function setupTagIndex (root) {
    var input = root.querySelector('#toybox-tag-filter')
    var sort = root.querySelector('#toybox-tag-sort')
    var clear = root.querySelector('.toybox-filter-clear')
    var reset = root.querySelector('.toybox-filter-reset')
    var grid = root.querySelector('#toybox-tag-grid')
    var status = root.querySelector('#toybox-tag-status')
    var empty = root.querySelector('.toybox-filter-empty')
    if (!input || !sort || !grid || root.dataset.toyboxReady) return
    root.dataset.toyboxReady = 'true'

    var items = Array.prototype.slice.call(grid.children)
    var collator = null

    function nameOf (item) {
      return (item.querySelector('.toybox-tag-name') || item).textContent.trim()
    }

    function updateCollator () {
      try {
        collator = new Intl.Collator(document.documentElement.lang || undefined, { numeric: true, sensitivity: 'base' })
      } catch (error) {
        collator = null
      }
    }

    function compareNames (a, b) {
      var first = nameOf(a)
      var second = nameOf(b)
      return collator ? collator.compare(first, second) : first < second ? -1 : first > second ? 1 : 0
    }

    // Count order is the server order, so restoring it needs no re-sorting.
    function order () {
      var sorted = sort.value === 'name' ? items.slice().sort(compareNames) : items
      sorted.forEach(function (item) { grid.appendChild(item) })
    }

    function filter (announce) {
      var query = input.value.trim().toLocaleLowerCase()
      var shown = 0
      items.forEach(function (item) {
        var match = !query || nameOf(item).toLocaleLowerCase().indexOf(query) !== -1
        item.hidden = !match
        if (match) shown++
      })
      clear.hidden = !input.value
      grid.hidden = shown === 0
      if (empty) empty.hidden = shown !== 0
      if (query) bindText(status, 'collection.tagResults', { shown: shown, total: items.length })
      else if (announce) bindText(status, 'collection.tagAll', { total: items.length })
    }

    function resetFilter () {
      input.value = ''
      filter(true)
      input.focus()
    }

    input.addEventListener('input', function () { filter(true) })
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !input.value) return
      event.preventDefault()
      event.stopPropagation()
      resetFilter()
    })
    clear.addEventListener('click', resetFilter)
    if (reset) reset.addEventListener('click', resetFilter)
    sort.addEventListener('change', function () {
      order()
      filter(true)
    })
    document.addEventListener('toybox:locale-change', function () {
      updateCollator()
      if (sort.value === 'name') order()
    })

    // Browsers may restore the previous filter and sort on history navigation.
    updateCollator()
    order()
    filter(false)
    input.disabled = false
    sort.disabled = false
    clear.disabled = false
  }

  // Pointer selection navigates at once; keyboard arrow steps wait for Enter
  // so stepping through options never triggers a page load per keystroke.
  function setupDestination (select) {
    if (select.dataset.toyboxReady) return
    select.dataset.toyboxReady = 'true'
    var initial = select.value

    function go () {
      if (select.value && select.value !== initial) window.location.assign(select.value)
    }

    select.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 10, PageUp: -10 }[event.key]
      if (step || event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        var last = select.options.length - 1
        select.selectedIndex = event.key === 'Home' ? 0 : event.key === 'End' ? last : Math.max(0, Math.min(last, select.selectedIndex + step))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        go()
      } else if (event.key === 'Escape') {
        select.value = initial
      }
    })
    select.addEventListener('change', go)
    select.addEventListener('blur', function () {
      if (select.value !== initial) select.value = initial
    })
    window.addEventListener('pageshow', function () { select.value = initial })
    select.disabled = false
    var rail = select.closest('.toybox-collection-rail')
    if (rail) rail.classList.add('is-enhanced')
  }

  function initialize () {
    document.querySelectorAll('[data-toybox-tag-index]').forEach(setupTagIndex)
    document.querySelectorAll('select[data-toybox-destination]').forEach(setupDestination)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true })
  else initialize()
})()
